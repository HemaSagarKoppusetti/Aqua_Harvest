import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import axios from 'axios';

// Services
const ASSESSMENT_SERVICE_URL = process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:5001';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
const GIS_SERVICE_URL = process.env.GIS_SERVICE_URL || 'http://localhost:5002';

export const resolvers = {
  // Scalar resolvers
  Date: DateTimeResolver,
  JSON: JSONResolver,
  Upload: GraphQLScalarType,

  // Query resolvers
  Query: {
    // User queries
    user: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/users/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
    },

    users: async (_, { limit = 10, offset = 0 }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/users`, {
          params: { limit, offset }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
    },

    // Assessment queries
    assessment: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/assessments/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch assessment: ${error.message}`);
      }
    },

    assessments: async (_, { userId, limit = 10, offset = 0 }, { dataSources }) => {
      try {
        const params = { limit, offset };
        if (userId) params.userId = userId;
        
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/assessments`, { params });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch assessments: ${error.message}`);
      }
    },

    assessmentsByLocation: async (_, { location, radiusKm = 10 }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/assessments/by-location`, {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: radiusKm
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch assessments by location: ${error.message}`);
      }
    },

    // Structure queries
    structure: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/structures/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch structure: ${error.message}`);
      }
    },

    structures: async (_, { filters }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/structures`, {
          params: filters
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch structures: ${error.message}`);
      }
    },

    // Data queries
    rainfallData: async (_, { location, startDate, endDate }, { dataSources }) => {
      try {
        const response = await axios.get(`${GIS_SERVICE_URL}/rainfall-data`, {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            startDate,
            endDate
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch rainfall data: ${error.message}`);
      }
    },

    groundwaterData: async (_, { location, radiusKm = 25 }, { dataSources }) => {
      try {
        const response = await axios.get(`${GIS_SERVICE_URL}/groundwater-data`, {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: radiusKm
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch groundwater data: ${error.message}`);
      }
    },

    // Impact queries
    impactMetrics: async (_, { district, state, timeRange }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/impact-metrics`, {
          params: { district, state, timeRange }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch impact metrics: ${error.message}`);
      }
    },

    districtImpact: async (_, { district, timeRange }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/impact-metrics/district/${district}`, {
          params: { timeRange }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch district impact: ${error.message}`);
      }
    },

    stateImpact: async (_, { state, timeRange }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/impact-metrics/state/${state}`, {
          params: { timeRange }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch state impact: ${error.message}`);
      }
    },

    // Contractor queries
    contractor: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/contractors/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch contractor: ${error.message}`);
      }
    },

    contractors: async (_, { location, radiusKm = 50, specialization }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/contractors`, {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: radiusKm,
            specialization
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch contractors: ${error.message}`);
      }
    },

    // Implementation queries
    implementation: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/implementations/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch implementation: ${error.message}`);
      }
    },

    implementations: async (_, { userId, contractorId, status }, { dataSources }) => {
      try {
        const params = {};
        if (userId) params.userId = userId;
        if (contractorId) params.contractorId = contractorId;
        if (status) params.status = status;

        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/implementations`, { params });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch implementations: ${error.message}`);
      }
    },

    // AI/ML queries
    roofDetection: async (_, { location }, { dataSources }) => {
      try {
        const response = await axios.post(`${ML_SERVICE_URL}/detect-roof`, {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to perform roof detection: ${error.message}`);
      }
    },

    rainfallPrediction: async (_, { location }, { dataSources }) => {
      try {
        const response = await axios.post(`${ML_SERVICE_URL}/predict-rainfall`, {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to predict rainfall: ${error.message}`);
      }
    },

    feasibilityScore: async (_, { input }, { dataSources }) => {
      try {
        const response = await axios.post(`${ML_SERVICE_URL}/calculate-feasibility`, input);
        return response.data.feasibility_score;
      } catch (error) {
        throw new Error(`Failed to calculate feasibility score: ${error.message}`);
      }
    },
  },

  // Mutation resolvers
  Mutation: {
    // User mutations
    createUser: async (_, { input }, { dataSources }) => {
      try {
        const response = await axios.post(`${ASSESSMENT_SERVICE_URL}/users`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
    },

    updateUser: async (_, { id, input }, { dataSources }) => {
      try {
        const response = await axios.put(`${ASSESSMENT_SERVICE_URL}/users/${id}`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }
    },

    deleteUser: async (_, { id }, { dataSources }) => {
      try {
        await axios.delete(`${ASSESSMENT_SERVICE_URL}/users/${id}`);
        return true;
      } catch (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    },

    // Assessment mutations
    createAssessment: async (_, { input }, { dataSources, logger }) => {
      try {
        logger.info('Creating assessment with ML service integration');
        
        // First, call ML service for full assessment
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/full-assessment`, {
          location: input.location,
          roof_area: input.roofArea,
          household_size: input.householdSize,
          roof_type: input.roofType || 'concrete'
        });

        // Then store the assessment result
        const assessmentData = {
          ...input,
          ...mlResponse.data.feasibility_analysis,
          roofArea: mlResponse.data.roof_detection?.roof_area || input.roofArea,
          annualRainfall: mlResponse.data.rainfall_prediction?.predicted_annual_rainfall,
        };

        const response = await axios.post(`${ASSESSMENT_SERVICE_URL}/assessments`, assessmentData);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to create assessment: ${error.message}`);
      }
    },

    updateAssessment: async (_, { id, input }, { dataSources }) => {
      try {
        const response = await axios.put(`${ASSESSMENT_SERVICE_URL}/assessments/${id}`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to update assessment: ${error.message}`);
      }
    },

    deleteAssessment: async (_, { id }, { dataSources }) => {
      try {
        await axios.delete(`${ASSESSMENT_SERVICE_URL}/assessments/${id}`);
        return true;
      } catch (error) {
        throw new Error(`Failed to delete assessment: ${error.message}`);
      }
    },

    // Implementation mutations
    createImplementation: async (_, { input }, { dataSources }) => {
      try {
        const response = await axios.post(`${ASSESSMENT_SERVICE_URL}/implementations`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to create implementation: ${error.message}`);
      }
    },

    updateImplementation: async (_, { id, input }, { dataSources }) => {
      try {
        const response = await axios.put(`${ASSESSMENT_SERVICE_URL}/implementations/${id}`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to update implementation: ${error.message}`);
      }
    },

    updateImplementationStatus: async (_, { id, status }, { dataSources }) => {
      try {
        const response = await axios.patch(`${ASSESSMENT_SERVICE_URL}/implementations/${id}/status`, {
          status
        });
        return response.data;
      } catch (error) {
        throw new Error(`Failed to update implementation status: ${error.message}`);
      }
    },

    // Contractor mutations
    createContractor: async (_, { input }, { dataSources }) => {
      try {
        const response = await axios.post(`${ASSESSMENT_SERVICE_URL}/contractors`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to create contractor: ${error.message}`);
      }
    },

    updateContractor: async (_, { id, input }, { dataSources }) => {
      try {
        const response = await axios.put(`${ASSESSMENT_SERVICE_URL}/contractors/${id}`, input);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to update contractor: ${error.message}`);
      }
    },

    verifyContractor: async (_, { id }, { dataSources }) => {
      try {
        const response = await axios.patch(`${ASSESSMENT_SERVICE_URL}/contractors/${id}/verify`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to verify contractor: ${error.message}`);
      }
    },

    // AI/ML mutations
    trainModel: async (_, { modelType }, { dataSources }) => {
      try {
        await axios.post(`${ML_SERVICE_URL}/update-models`);
        return true;
      } catch (error) {
        throw new Error(`Failed to train model: ${error.message}`);
      }
    },

    updateModel: async (_, { modelType, version }, { dataSources }) => {
      try {
        await axios.post(`${ML_SERVICE_URL}/models/${modelType}/update`, { version });
        return true;
      } catch (error) {
        throw new Error(`Failed to update model: ${error.message}`);
      }
    },
  },

  // Type resolvers for nested objects
  Assessment: {
    user: async (parent) => {
      if (!parent.userId) return null;
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/users/${parent.userId}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch user for assessment:', error.message);
        return null;
      }
    },
    
    recommendedStructures: async (parent) => {
      // Transform the JSONB data to match GraphQL schema
      if (!parent.recommended_structures) return [];
      
      return parent.recommended_structures.map((structure, index) => ({
        id: `${parent.id}-structure-${index}`,
        structure: {
          id: structure.id || `structure-${index}`,
          name: structure.name,
          type: structure.type,
          description: structure.description || '',
          costPerSqft: structure.cost_per_sqft || 0,
          efficiencyRating: structure.efficiency_rating || 0.85,
          specifications: structure.specifications || {}
        },
        recommendedQuantity: structure.quantity || 1,
        estimatedCost: structure.cost || 0,
        priority: structure.priority || index + 1,
        suitabilityScore: structure.suitability_score || 0.8,
        specifications: structure.specifications || {}
      }));
    },

    environmentalImpact: async (parent) => {
      const impact = parent.environmental_impact || {};
      return {
        waterSaved: impact.water_saved || parent.water_potential_annual || 0,
        co2Reduction: impact.co2_reduction || 0,
        energySaved: impact.energy_saved || 0,
        treesEquivalent: impact.trees_equivalent || Math.floor((impact.co2_reduction || 0) / 22)
      };
    }
  },

  Implementation: {
    assessment: async (parent) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/assessments/${parent.assessmentId}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch assessment for implementation:', error.message);
        return null;
      }
    },

    contractor: async (parent) => {
      if (!parent.contractorId) return null;
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/contractors/${parent.contractorId}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch contractor for implementation:', error.message);
        return null;
      }
    },

    user: async (parent) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/users/${parent.userId}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch user for implementation:', error.message);
        return null;
      }
    }
  },

  User: {
    assessments: async (parent) => {
      try {
        const response = await axios.get(`${ASSESSMENT_SERVICE_URL}/assessments`, {
          params: { userId: parent.id }
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch assessments for user:', error.message);
        return [];
      }
    }
  }
};

export default resolvers;