/**
 * Assessment Repository
 * Database operations for assessments
 */

const { query, transaction } = require('./connection');
const logger = require('../utils/logger');

/**
 * Save assessment to database
 * @param {Object} assessment - Assessment data
 * @returns {string} Assessment ID
 */
const saveAssessment = async (assessment) => {
  try {
    const insertQuery = `
      INSERT INTO assessments (
        id, user_id, location_lat, location_lng, 
        building_type, roof_area, roof_type, household_size,
        assessment_data, overall_score, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at
    `;

    const values = [
      assessment.id,
      assessment.userId || null,
      assessment.location.latitude,
      assessment.location.longitude,
      assessment.building.type,
      assessment.building.roof_area,
      assessment.building.roof_type,
      assessment.household.size,
      JSON.stringify(assessment),
      assessment.overall_score?.overall || null,
      assessment.status
    ];

    const result = await query(insertQuery, values);
    
    logger.logAssessment('saved', {
      assessmentId: result.rows[0].id,
      location: `${assessment.location.latitude}, ${assessment.location.longitude}`,
      buildingType: assessment.building.type,
      score: assessment.overall_score?.overall
    });

    return result.rows[0].id;

  } catch (error) {
    logger.error('Error saving assessment:', error);
    throw error;
  }
};

/**
 * Get assessment by ID
 * @param {string} id - Assessment ID
 * @returns {Object|null} Assessment data
 */
const getAssessmentById = async (id) => {
  try {
    const selectQuery = `
      SELECT 
        id, user_id, location_lat, location_lng,
        building_type, roof_area, roof_type, household_size,
        assessment_data, overall_score, status,
        created_at, updated_at
      FROM assessments 
      WHERE id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const assessmentData = typeof row.assessment_data === 'string' 
      ? JSON.parse(row.assessment_data) 
      : row.assessment_data;

    return {
      ...assessmentData,
      database_metadata: {
        saved_at: row.created_at,
        updated_at: row.updated_at,
        database_id: row.id
      }
    };

  } catch (error) {
    logger.error('Error retrieving assessment:', error);
    throw error;
  }
};

/**
 * Update assessment
 * @param {string} id - Assessment ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success status
 */
const updateAssessment = async (id, updates) => {
  try {
    const updateQuery = `
      UPDATE assessments 
      SET 
        assessment_data = $1,
        overall_score = $2,
        status = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING id
    `;

    const values = [
      JSON.stringify(updates.assessment_data || {}),
      updates.overall_score || null,
      updates.status || 'completed',
      id
    ];

    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return false;
    }

    logger.logAssessment('updated', { assessmentId: id });
    return true;

  } catch (error) {
    logger.error('Error updating assessment:', error);
    throw error;
  }
};

/**
 * Get assessment history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of results to return
 * @param {number} offset - Offset for pagination
 * @returns {Array} Assessment history
 */
const getAssessmentHistory = async (userId, limit = 10, offset = 0) => {
  try {
    const selectQuery = `
      SELECT 
        id, location_lat, location_lng, building_type,
        roof_area, roof_type, overall_score, status,
        created_at, updated_at,
        (assessment_data->>'steps'->>'waterPotential'->>'annual_liters')::INTEGER as water_potential,
        (assessment_data->>'steps'->>'economics'->>'total_installation_cost')::INTEGER as estimated_cost
      FROM assessments 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM assessments 
      WHERE user_id = $1
    `;

    const [dataResult, countResult] = await Promise.all([
      query(selectQuery, [userId, limit, offset]),
      query(countQuery, [userId])
    ]);

    const assessments = dataResult.rows.map(row => ({
      id: row.id,
      location: {
        latitude: parseFloat(row.location_lat),
        longitude: parseFloat(row.location_lng)
      },
      building_type: row.building_type,
      roof_area: parseFloat(row.roof_area) || null,
      roof_type: row.roof_type,
      overall_score: row.overall_score,
      water_potential: row.water_potential,
      estimated_cost: row.estimated_cost,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return {
      assessments,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      has_more: offset + limit < parseInt(countResult.rows[0].total)
    };

  } catch (error) {
    logger.error('Error retrieving assessment history:', error);
    throw error;
  }
};

/**
 * Get assessments near a location
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {number} limit - Number of results
 * @returns {Array} Nearby assessments
 */
const getAssessmentsNearLocation = async (latitude, longitude, radiusKm = 10, limit = 20) => {
  try {
    const selectQuery = `
      SELECT 
        id, location_lat, location_lng, building_type,
        overall_score, created_at,
        point(location_lng, location_lat) <-> point($2, $1) as distance
      FROM assessments 
      WHERE point(location_lng, location_lat) <-> point($2, $1) < $3
        AND overall_score IS NOT NULL
      ORDER BY distance
      LIMIT $4
    `;

    const result = await query(selectQuery, [latitude, longitude, radiusKm / 111.0, limit]);

    return result.rows.map(row => ({
      id: row.id,
      location: {
        latitude: parseFloat(row.location_lat),
        longitude: parseFloat(row.location_lng)
      },
      building_type: row.building_type,
      overall_score: row.overall_score,
      distance_km: parseFloat(row.distance) * 111.0, // Convert to km
      created_at: row.created_at
    }));

  } catch (error) {
    logger.error('Error finding nearby assessments:', error);
    throw error;
  }
};

/**
 * Get assessment statistics
 * @param {Object} filters - Optional filters
 * @returns {Object} Assessment statistics
 */
const getAssessmentStats = async (filters = {}) => {
  try {
    let whereClause = 'WHERE overall_score IS NOT NULL';
    let params = [];
    let paramCount = 0;

    // Add filters
    if (filters.building_type) {
      paramCount++;
      whereClause += ` AND building_type = $${paramCount}`;
      params.push(filters.building_type);
    }

    if (filters.date_from) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(filters.date_to);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(overall_score) as avg_score,
        MIN(overall_score) as min_score,
        MAX(overall_score) as max_score,
        COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as highly_feasible,
        COUNT(CASE WHEN overall_score >= 60 AND overall_score < 80 THEN 1 END) as moderately_feasible,
        COUNT(CASE WHEN overall_score < 60 THEN 1 END) as low_feasible,
        AVG(CASE WHEN building_type = 'residential' THEN overall_score END) as avg_residential_score,
        AVG(CASE WHEN building_type = 'commercial' THEN overall_score END) as avg_commercial_score,
        COUNT(CASE WHEN building_type = 'residential' THEN 1 END) as residential_count,
        COUNT(CASE WHEN building_type = 'commercial' THEN 1 END) as commercial_count,
        COUNT(CASE WHEN building_type = 'industrial' THEN 1 END) as industrial_count,
        COUNT(CASE WHEN building_type = 'institutional' THEN 1 END) as institutional_count
      FROM assessments 
      ${whereClause}
    `;

    const result = await query(statsQuery, params);
    const stats = result.rows[0];

    return {
      total_assessments: parseInt(stats.total_assessments),
      average_score: parseFloat(stats.avg_score) || 0,
      min_score: parseInt(stats.min_score) || 0,
      max_score: parseInt(stats.max_score) || 0,
      feasibility_distribution: {
        highly_feasible: parseInt(stats.highly_feasible),
        moderately_feasible: parseInt(stats.moderately_feasible),
        low_feasible: parseInt(stats.low_feasible)
      },
      building_type_stats: {
        residential: {
          count: parseInt(stats.residential_count),
          avg_score: parseFloat(stats.avg_residential_score) || 0
        },
        commercial: {
          count: parseInt(stats.commercial_count),
          avg_score: parseFloat(stats.avg_commercial_score) || 0
        },
        industrial: {
          count: parseInt(stats.industrial_count),
          avg_score: 0 // Add if needed
        },
        institutional: {
          count: parseInt(stats.institutional_count),
          avg_score: 0 // Add if needed
        }
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error retrieving assessment stats:', error);
    throw error;
  }
};

/**
 * Delete assessment
 * @param {string} id - Assessment ID
 * @returns {boolean} Success status
 */
const deleteAssessment = async (id) => {
  try {
    const deleteQuery = 'DELETE FROM assessments WHERE id = $1 RETURNING id';
    const result = await query(deleteQuery, [id]);
    
    const success = result.rows.length > 0;
    if (success) {
      logger.logAssessment('deleted', { assessmentId: id });
    }
    
    return success;

  } catch (error) {
    logger.error('Error deleting assessment:', error);
    throw error;
  }
};

/**
 * Get assessment count (for cache/stats)
 * @returns {number} Total assessment count
 */
const getAssessmentCount = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM assessments');
    return parseInt(result.rows[0].count);
  } catch (error) {
    logger.error('Error getting assessment count:', error);
    return 0;
  }
};

/**
 * Bulk insert assessments (for data migration/testing)
 * @param {Array} assessments - Array of assessments
 * @returns {Array} Inserted IDs
 */
const bulkInsertAssessments = async (assessments) => {
  try {
    return await transaction(async (client) => {
      const insertedIds = [];

      for (const assessment of assessments) {
        const insertQuery = `
          INSERT INTO assessments (
            user_id, location_lat, location_lng, 
            building_type, roof_area, roof_type, household_size,
            assessment_data, overall_score, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `;

        const values = [
          assessment.userId || null,
          assessment.location.latitude,
          assessment.location.longitude,
          assessment.building.type,
          assessment.building.roof_area,
          assessment.building.roof_type,
          assessment.household.size,
          JSON.stringify(assessment),
          assessment.overall_score?.overall || null,
          assessment.status
        ];

        const result = await client.query(insertQuery, values);
        insertedIds.push(result.rows[0].id);
      }

      logger.info(`Bulk inserted ${insertedIds.length} assessments`);
      return insertedIds;
    });

  } catch (error) {
    logger.error('Error bulk inserting assessments:', error);
    throw error;
  }
};

module.exports = {
  saveAssessment,
  getAssessmentById,
  updateAssessment,
  getAssessmentHistory,
  getAssessmentsNearLocation,
  getAssessmentStats,
  deleteAssessment,
  getAssessmentCount,
  bulkInsertAssessments
};