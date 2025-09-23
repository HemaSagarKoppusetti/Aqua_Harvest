/**
 * Database Connection and Pool Management
 * PostgreSQL connection using pg library
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

/**
 * Database configuration
 */
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aquaharvest_db',
  
  // Pool configuration
  max: parseInt(process.env.DB_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

/**
 * Connect to PostgreSQL database
 */
const connectDatabase = async () => {
  try {
    if (pool) {
      logger.info('Database pool already exists');
      return pool;
    }

    pool = new Pool(dbConfig);

    // Test the connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connected successfully:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      pool_size: dbConfig.max,
      server_time: result.rows[0].now
    });

    // Handle pool events
    pool.on('connect', (client) => {
      logger.debug('New database client connected');
    });

    pool.on('acquire', (client) => {
      logger.debug('Database client acquired from pool');
    });

    pool.on('remove', (client) => {
      logger.debug('Database client removed from pool');
    });

    pool.on('error', (err, client) => {
      logger.error('Database pool error:', err);
    });

    return pool;

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
const disconnectDatabase = async () => {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    }
  }
};

/**
 * Get database pool instance
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with connection pooling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
const query = async (text, params = []) => {
  const startTime = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - startTime;
    
    logger.logDbOperation('query', 'executed', duration, {
      rowCount: result.rowCount,
      command: result.command
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logDbOperation('query', 'failed', duration, {
      error: error.message,
      query: text.substring(0, 100) + '...'
    });
    throw error;
  }
};

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback function
 * @returns {any} Transaction result
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    logger.debug('Transaction committed successfully');
    
    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error);
    throw error;

  } finally {
    client.release();
  }
};

/**
 * Health check for database connection
 */
const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as healthy');
    return {
      status: 'healthy',
      connected: true,
      timestamp: new Date().toISOString(),
      response_time: Date.now()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get database statistics
 */
const getDbStats = async () => {
  try {
    const poolStats = {
      total_connections: pool.totalCount,
      idle_connections: pool.idleCount,
      waiting_count: pool.waitingCount
    };

    // Get database size and connection info
    const dbInfo = await query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        count(*) as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    return {
      pool_stats: poolStats,
      database_size: dbInfo.rows[0]?.database_size,
      active_connections: dbInfo.rows[0]?.active_connections,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error getting database stats:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Initialize database tables (for development)
 */
const initializeTables = async () => {
  try {
    // Create assessments table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255),
        location_lat DECIMAL(10, 8) NOT NULL,
        location_lng DECIMAL(11, 8) NOT NULL,
        building_type VARCHAR(50) NOT NULL,
        roof_area DECIMAL(10, 2),
        roof_type VARCHAR(50),
        household_size INTEGER,
        assessment_data JSONB NOT NULL,
        overall_score INTEGER,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_assessments_location 
      ON assessments USING GIST (
        point(location_lng, location_lat)
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_assessments_user_id 
      ON assessments(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_assessments_created_at 
      ON assessments(created_at DESC)
    `);

    // Create trigger for updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'update_assessments_updated_at'
        ) THEN
          CREATE TRIGGER update_assessments_updated_at
            BEFORE UPDATE ON assessments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$;
    `);

    logger.info('Database tables initialized successfully');
    return true;

  } catch (error) {
    logger.error('Error initializing database tables:', error);
    throw error;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getPool,
  query,
  transaction,
  healthCheck,
  getDbStats,
  initializeTables
};