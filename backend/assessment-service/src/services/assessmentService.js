/**
 * AquaHarvest Assessment Service - Core Business Logic
 * Handles all rainwater harvesting feasibility calculations and recommendations
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const _ = require('lodash');

const logger = require('../utils/logger');
const { getCache, setCache } = require('../cache/redis');
const {
  saveAssessment,
  getAssessmentById,
  updateAssessment,
  getAssessmentHistory
} = require('../database/assessmentRepository');

class AssessmentService {
  constructor() {
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.GIS_SERVICE_URL = process.env.GIS_SERVICE_URL || 'http://localhost:3002';
    
    // Regional water costs (INR per 1000L)
    this.waterCosts = {
      north: 25,
      south: 30,
      east: 20,
      west: 35,
      central: 28
    };

    // Building type coefficients
    this.buildingCoefficients = {
      residential: { users: 4, daily_usage: 150 }, // L per person per day
      commercial: { users: 25, daily_usage: 50 },
      industrial: { users: 100, daily_usage: 200 },
      institutional: { users: 50, daily_usage: 80 }
    };

    // Storage recommendations (percentage of annual potential)
    this.storageRecommendations = {
      residential: 0.15, // 15% of annual potential
      commercial: 0.12,  // 12% for commercial
      industrial: 0.10,  // 10% for industrial
      institutional: 0.18 // 18% for institutions
    };
  }

  /**
   * Perform comprehensive rainwater harvesting assessment
   * @param {Object} params Assessment parameters
   * @returns {Object} Complete assessment results
   */
  async performAssessment(params) {
    try {
      const assessmentId = uuidv4();
      logger.info(`Starting assessment ${assessmentId} for location: ${params.latitude}, ${params.longitude}`);

      // Check cache first
      const cacheKey = `assessment:${this._generateCacheKey(params)}`;
      const cachedResult = await getCache(cacheKey);
      if (cachedResult) {
        logger.info(`Returning cached assessment for ${assessmentId}`);
        return { ...cachedResult, id: assessmentId, cached: true };
      }

      // Initialize assessment result
      const assessment = {
        id: assessmentId,
        timestamp: new Date().toISOString(),
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
          address: params.address || null
        },
        building: {
          type: params.buildingType || 'residential',
          roof_area: params.roofArea || null,
          roof_type: params.roofType || 'concrete',
          floors: params.floors || 1
        },
        household: {
          size: params.householdSize || this.buildingCoefficients[params.buildingType || 'residential'].users,
          monthly_income: params.monthlyIncome || null
        },
        preferences: {
          budget_range: params.budgetRange || 'medium',
          timeline: params.timeline || '3-6 months'
        },
        status: 'processing',
        steps: {}
      };

      // Step 1: Get rainfall data
      assessment.steps.rainfall = await this._getRainfallData(params);
      
      // Step 2: Detect/estimate roof area if not provided
      if (!params.roofArea) {
        assessment.steps.roofDetection = await this._detectRoofArea(params);
        assessment.building.roof_area = assessment.steps.roofDetection.area_sqm;
      }

      // Step 3: Calculate water potential
      assessment.steps.waterPotential = this._calculateWaterPotential(
        assessment.building.roof_area,
        assessment.steps.rainfall.annual_prediction.total_rainfall,
        assessment.building.roof_type
      );

      // Step 4: Analyze water demand
      assessment.steps.waterDemand = this._calculateWaterDemand(
        assessment.building.type,
        assessment.household.size
      );

      // Step 5: Get feasibility analysis from ML service
      assessment.steps.feasibility = await this._getFeasibilityAnalysis({
        roof_area: assessment.building.roof_area,
        annual_rainfall: assessment.steps.rainfall.annual_prediction.total_rainfall,
        household_size: assessment.household.size,
        roof_type: assessment.building.roof_type,
        building_type: assessment.building.type
      });

      // Step 6: Generate structure recommendations
      assessment.steps.structures = this._generateStructureRecommendations(
        assessment.steps.waterPotential,
        assessment.steps.waterDemand,
        assessment.building.type,
        assessment.preferences.budget_range
      );

      // Step 7: Calculate economics and ROI
      assessment.steps.economics = this._calculateEconomics(
        assessment.steps.structures,
        assessment.steps.waterPotential,
        assessment.location,
        assessment.household.monthly_income
      );

      // Step 8: Environmental impact assessment
      assessment.steps.environmental = this._calculateEnvironmentalImpact(
        assessment.steps.waterPotential.annual_liters,
        assessment.building.type
      );

      // Step 9: Generate final recommendations
      assessment.recommendations = this._generateRecommendations(assessment);

      // Step 10: Calculate overall score
      assessment.overall_score = this._calculateOverallScore(assessment);

      // Update status
      assessment.status = 'completed';
      assessment.completed_at = new Date().toISOString();
      assessment.processing_time = moment().diff(moment(assessment.timestamp), 'seconds');

      // Save to database
      await saveAssessment(assessment);

      // Cache result (24 hours)
      await setCache(cacheKey, assessment, 86400);

      logger.info(`Assessment ${assessmentId} completed successfully in ${assessment.processing_time}s`);
      return assessment;

    } catch (error) {
      logger.error('Assessment failed:', error);
      throw new Error(`Assessment failed: ${error.message}`);
    }
  }

  /**
   * Get rainfall data from ML service
   */
  async _getRainfallData(params) {
    try {
      const response = await axios.post(`${this.ML_SERVICE_URL}/rainfall/predict`, {
        latitude: params.latitude,
        longitude: params.longitude,
        months_ahead: 12
      });
      
      return response.data;
    } catch (error) {
      logger.warn('ML service unavailable, using fallback rainfall data:', error.message);
      
      // Fallback rainfall calculation based on region
      const region = this._determineRegion(params.latitude, params.longitude);
      const regionalRainfall = {
        north: 650, south: 920, east: 1200, west: 550, central: 850
      };
      
      return {
        status: 'estimated',
        annual_prediction: {
          total_rainfall: regionalRainfall[region] || 850,
          deviation_percent: 0
        },
        monsoon_analysis: {
          intensity: 'Normal',
          peak_month: '2024-07'
        }
      };
    }
  }

  /**
   * Detect roof area from image or estimate
   */
  async _detectRoofArea(params) {
    try {
      if (params.imageUrl) {
        const response = await axios.post(`${this.ML_SERVICE_URL}/roof/detect`, {
          image_url: params.imageUrl,
          latitude: params.latitude,
          longitude: params.longitude,
          property_type: params.buildingType
        });
        
        return response.data;
      }
    } catch (error) {
      logger.warn('Roof detection failed, using estimation:', error.message);
    }

    // Fallback estimation based on building type
    const estimations = {
      residential: 100,
      commercial: 250,
      industrial: 500,
      institutional: 200
    };

    return {
      status: 'estimated',
      area_sqm: estimations[params.buildingType] || 100,
      confidence: 0.6
    };
  }

  /**
   * Calculate water collection potential
   */
  _calculateWaterPotential(roofArea, annualRainfall, roofType) {
    const runoffCoefficients = {
      concrete: 0.90,
      tile: 0.85,
      metal: 0.95,
      asbestos: 0.82,
      green: 0.60
    };

    const coefficient = runoffCoefficients[roofType] || 0.85;
    const annualLiters = roofArea * annualRainfall * coefficient;
    const dailyAverage = annualLiters / 365;
    const monthlyAverage = annualLiters / 12;

    return {
      annual_liters: Math.round(annualLiters),
      daily_average: Math.round(dailyAverage),
      monthly_average: Math.round(monthlyAverage),
      runoff_coefficient: coefficient,
      collection_efficiency: 0.95 // Assuming 95% collection efficiency
    };
  }

  /**
   * Calculate water demand based on building type and occupancy
   */
  _calculateWaterDemand(buildingType, occupancy) {
    const coeffs = this.buildingCoefficients[buildingType] || this.buildingCoefficients.residential;
    
    const dailyDemand = occupancy * coeffs.daily_usage;
    const monthlyDemand = dailyDemand * 30;
    const annualDemand = dailyDemand * 365;

    return {
      daily_liters: dailyDemand,
      monthly_liters: monthlyDemand,
      annual_liters: annualDemand,
      per_capita_daily: coeffs.daily_usage,
      occupancy: occupancy
    };
  }

  /**
   * Get feasibility analysis from ML service
   */
  async _getFeasibilityAnalysis(params) {
    try {
      const response = await axios.post(`${this.ML_SERVICE_URL}/feasibility/calculate`, params);
      return response.data;
    } catch (error) {
      logger.warn('ML feasibility analysis unavailable, using basic calculation:', error.message);
      
      // Basic feasibility calculation
      const waterSaving = params.roof_area * params.annual_rainfall * 0.85;
      const basicCost = params.roof_area * 200; // ₹200 per sqm estimate
      
      return {
        status: 'estimated',
        feasibility_score: 75,
        water_potential_annual: waterSaving,
        cost_estimate: basicCost,
        payback_period_months: 24,
        technical_analysis: {
          technical_score: 80,
          runoff_coefficient: 0.85
        }
      };
    }
  }

  /**
   * Generate structure recommendations
   */
  _generateStructureRecommendations(waterPotential, waterDemand, buildingType, budgetRange) {
    const structures = [];
    const storageRatio = this.storageRecommendations[buildingType] || 0.15;
    const recommendedStorage = waterPotential.annual_liters * storageRatio;

    // Primary storage tank
    if (recommendedStorage > 500) {
      const tankCapacity = Math.min(5000, recommendedStorage);
      structures.push({
        id: 'primary_storage',
        name: 'Primary Storage Tank',
        type: 'storage',
        capacity: `${Math.round(tankCapacity)}L`,
        estimated_cost: Math.round(tankCapacity * 15 + 5000), // ₹15/L + base cost
        priority: 1,
        description: 'Main water storage tank for collected rainwater',
        specifications: {
          material: 'RCC/Plastic',
          maintenance: 'Quarterly cleaning required'
        }
      });
    }

    // First flush diverter
    structures.push({
      id: 'first_flush',
      name: 'First Flush Diverter',
      type: 'filter',
      capacity: '50L',
      estimated_cost: 2500,
      priority: 2,
      description: 'Diverts initial rainfall to remove roof contaminants',
      specifications: {
        type: 'Manual/Automatic',
        maintenance: 'Monthly inspection'
      }
    });

    // Filtration system
    structures.push({
      id: 'filtration',
      name: 'Multi-stage Filtration',
      type: 'treatment',
      capacity: `${Math.round(waterDemand.daily_liters)}L/day`,
      estimated_cost: budgetRange === 'high' ? 8000 : 4000,
      priority: 3,
      description: 'Sand, gravel, and carbon filtration system',
      specifications: {
        stages: budgetRange === 'high' ? 4 : 2,
        maintenance: 'Filter replacement every 6 months'
      }
    });

    // Recharge structure (if excess water)
    if (waterPotential.annual_liters > waterDemand.annual_liters * 1.5) {
      structures.push({
        id: 'recharge_pit',
        name: 'Groundwater Recharge Pit',
        type: 'recharge',
        capacity: '2m³',
        estimated_cost: 5000,
        priority: 4,
        description: 'Channels excess water to groundwater',
        specifications: {
          depth: '3m',
          maintenance: 'Annual cleaning'
        }
      });
    }

    return structures;
  }

  /**
   * Calculate economics and ROI
   */
  _calculateEconomics(structures, waterPotential, location, monthlyIncome) {
    const region = this._determineRegion(location.latitude, location.longitude);
    const waterCostPerL = (this.waterCosts[region] || 28) / 1000;
    
    const totalInstallationCost = structures.reduce((sum, struct) => sum + struct.estimated_cost, 0);
    const annualWaterSavings = waterPotential.annual_liters * waterCostPerL;
    const annualMaintenanceCost = totalInstallationCost * 0.05; // 5% maintenance
    const netAnnualSavings = annualWaterSavings - annualMaintenanceCost;
    
    const paybackPeriod = totalInstallationCost / netAnnualSavings;
    const roi = (netAnnualSavings / totalInstallationCost) * 100;

    // Affordability assessment
    const affordabilityScore = monthlyIncome ? 
      Math.min(100, (monthlyIncome * 12 / totalInstallationCost) * 50) : 70;

    return {
      total_installation_cost: Math.round(totalInstallationCost),
      annual_water_savings: Math.round(annualWaterSavings),
      annual_maintenance_cost: Math.round(annualMaintenanceCost),
      net_annual_savings: Math.round(netAnnualSavings),
      payback_period_years: Math.round(paybackPeriod * 10) / 10,
      roi_percentage: Math.round(roi * 10) / 10,
      water_cost_per_liter: waterCostPerL,
      affordability_score: Math.round(affordabilityScore),
      financing_options: this._getFinancingOptions(totalInstallationCost, monthlyIncome)
    };
  }

  /**
   * Calculate environmental impact
   */
  _calculateEnvironmentalImpact(annualWaterSaved, buildingType) {
    // CO2 reduction from reduced water treatment and pumping
    const co2Reduction = (annualWaterSaved / 1000) * 0.5; // 0.5 kg CO2 per m³
    
    // Energy savings
    const energySaved = (annualWaterSaved / 1000) * 2; // 2 kWh per m³
    
    // Groundwater conservation
    const groundwaterSaved = annualWaterSaved;

    return {
      annual_water_saved: Math.round(annualWaterSaved),
      co2_reduction_kg: Math.round(co2Reduction * 10) / 10,
      energy_saved_kwh: Math.round(energySaved),
      groundwater_conservation: Math.round(groundwaterSaved),
      environmental_score: Math.min(100, (annualWaterSaved / 10000) * 100) // Scale to 100
    };
  }

  /**
   * Generate final recommendations
   */
  _generateRecommendations(assessment) {
    const recommendations = {
      implementation_phases: [],
      priority_actions: [],
      optimization_tips: [],
      maintenance_schedule: []
    };

    // Phase-wise implementation
    if (assessment.steps.structures.length > 0) {
      recommendations.implementation_phases = [
        {
          phase: 1,
          title: 'Basic Collection System',
          duration: '2-4 weeks',
          structures: assessment.steps.structures.filter(s => s.priority <= 2),
          cost: assessment.steps.structures
            .filter(s => s.priority <= 2)
            .reduce((sum, s) => sum + s.estimated_cost, 0)
        },
        {
          phase: 2,
          title: 'Advanced Treatment & Storage',
          duration: '2-3 weeks',
          structures: assessment.steps.structures.filter(s => s.priority > 2),
          cost: assessment.steps.structures
            .filter(s => s.priority > 2)
            .reduce((sum, s) => sum + s.estimated_cost, 0)
        }
      ];
    }

    // Priority actions based on assessment results
    if (assessment.steps.economics.payback_period_years < 3) {
      recommendations.priority_actions.push({
        action: 'Immediate Implementation',
        reason: 'Excellent ROI with payback period under 3 years',
        urgency: 'high'
      });
    }

    if (assessment.steps.waterPotential.annual_liters > assessment.steps.waterDemand.annual_liters) {
      recommendations.priority_actions.push({
        action: 'Add Groundwater Recharge',
        reason: 'Excess water potential can benefit groundwater',
        urgency: 'medium'
      });
    }

    // Optimization tips
    recommendations.optimization_tips = [
      'Install gutters with proper slope for maximum collection efficiency',
      'Use smooth roof surfaces to increase runoff coefficient',
      'Regular cleaning of roof and gutters before monsoon season',
      'Consider rainwater quality testing for potable use',
      'Install overflow management system for heavy rainfall events'
    ];

    // Maintenance schedule
    recommendations.maintenance_schedule = [
      { frequency: 'Weekly', task: 'Visual inspection of gutters and downpipes' },
      { frequency: 'Monthly', task: 'Clean first flush diverter and check filters' },
      { frequency: 'Quarterly', task: 'Deep clean storage tank and inspect structure' },
      { frequency: 'Annually', task: 'Complete system audit and component replacement' }
    ];

    return recommendations;
  }

  /**
   * Calculate overall assessment score
   */
  _calculateOverallScore(assessment) {
    const weights = {
      feasibility: 0.3,
      economics: 0.25,
      environmental: 0.2,
      technical: 0.15,
      social: 0.1
    };

    const feasibilityScore = assessment.steps.feasibility.feasibility_score || 75;
    const economicsScore = Math.min(100, assessment.steps.economics.roi_percentage * 5);
    const environmentalScore = assessment.steps.environmental.environmental_score;
    const technicalScore = assessment.steps.feasibility.technical_analysis?.technical_score || 75;
    const socialScore = assessment.steps.waterPotential.annual_liters > 10000 ? 85 : 65;

    const overallScore = (
      feasibilityScore * weights.feasibility +
      economicsScore * weights.economics +
      environmentalScore * weights.environmental +
      technicalScore * weights.technical +
      socialScore * weights.social
    );

    return {
      overall: Math.round(overallScore),
      breakdown: {
        feasibility: Math.round(feasibilityScore),
        economics: Math.round(economicsScore),
        environmental: Math.round(environmentalScore),
        technical: Math.round(technicalScore),
        social: Math.round(socialScore)
      },
      grade: this._getGrade(overallScore),
      recommendation: this._getRecommendationLevel(overallScore)
    };
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(id) {
    try {
      const assessment = await getAssessmentById(id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      return assessment;
    } catch (error) {
      logger.error(`Error retrieving assessment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user's assessment history
   */
  async getUserAssessments(userId, limit = 10, offset = 0) {
    try {
      return await getAssessmentHistory(userId, limit, offset);
    } catch (error) {
      logger.error(`Error retrieving assessments for user ${userId}:`, error);
      throw error;
    }
  }

  // Helper methods
  _determineRegion(lat, lng) {
    if (lat > 28) return 'north';
    if (lat < 15) return 'south';
    if (lng < 77) return 'west';
    if (lng > 85) return 'east';
    return 'central';
  }

  _getFinancingOptions(totalCost, monthlyIncome) {
    const options = [];
    
    if (totalCost < 20000) {
      options.push({ type: 'self_funded', feasible: true });
    }
    
    if (monthlyIncome && monthlyIncome > totalCost / 24) {
      options.push({ type: 'monthly_installments', feasible: true, duration: '24 months' });
    }
    
    options.push({ type: 'government_subsidy', feasible: true, coverage: '30-50%' });
    options.push({ type: 'bank_loan', feasible: totalCost > 50000, interest_rate: '8-12%' });

    return options;
  }

  _getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    return 'C';
  }

  _getRecommendationLevel(score) {
    if (score >= 80) return 'Highly Recommended';
    if (score >= 60) return 'Recommended';
    if (score >= 40) return 'Consider with Modifications';
    return 'Not Recommended';
  }

  _generateCacheKey(params) {
    return `${params.latitude}_${params.longitude}_${params.buildingType}_${params.roofArea || 'auto'}`;
  }
}

module.exports = new AssessmentService();