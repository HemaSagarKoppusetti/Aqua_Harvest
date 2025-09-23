import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import winston from 'winston';
import { typeDefs } from './types/schema';
import { resolvers } from './resolvers';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for caching
const redis = createClient({
  url: REDIS_URL
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.connect().catch(logger.error);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// GraphQL Gateway configuration for microservices
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'assessment-service', url: 'http://localhost:5001/graphql' },
      { name: 'gis-service', url: 'http://localhost:5002/graphql' },
      { name: 'ml-service', url: 'http://localhost:5000/graphql' },
    ],
  }),
});

async function startServer() {
  try {
    const app = express();
    
    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.mapbox.com", "https://earthengine.googleapis.com"],
        },
      },
    }));
    
    app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    }));
    
    app.use(limiter);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
          redis: redis.isReady ? 'connected' : 'disconnected',
          gateway: 'active'
        }
      });
    });
    
    // Create Apollo Server with GraphQL Gateway
    const server = new ApolloServer({
      gateway,
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(`GraphQL operation: ${requestContext.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL errors:', requestContext.errors);
              },
            };
          },
        },
      ],
    });
    
    await server.start();
    
    // Apply GraphQL middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req, res }) => ({
          req,
          res,
          redis,
          user: await authMiddleware(req),
          logger,
        }),
      })
    );
    
    // REST API endpoints for compatibility
    app.use('/api/v1', require('./routes/rest'));
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 API Gateway ready at http://localhost:${PORT}/graphql`);
      logger.info(`📊 Health check at http://localhost:${PORT}/health`);
      logger.info(`🔌 REST API at http://localhost:${PORT}/api/v1`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Graceful shutdown...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Graceful shutdown...');
  await redis.quit();
  process.exit(0);
});

startServer().catch((error) => {
  logger.error('Server startup error:', error);
  process.exit(1);
});