# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**AquaHarvest** is an AI-powered rainwater harvesting assistant designed for Smart India Hackathon (SIH). The application provides on-spot assessment of rooftop rainwater harvesting (RTRWH) and artificial recharge potential using cutting-edge AI/ML technologies, GIS integration, and innovative features like AR visualization.

## Architecture & Technology Stack

### Frontend Technologies
- **Mobile App**: Flutter (cross-platform iOS/Android) with offline-first SQLite architecture
- **Web Application**: Next.js 15 with App Router, Tailwind CSS + Shadcn UI, PWA capabilities
- **AR Module**: AR.js for augmented reality visualization of RTRWH structures

### Backend Infrastructure (Microservices)
- **API Gateway**: Apollo Server (GraphQL) with Node.js Express/Fastify
- **Assessment Service**: Core feasibility analysis engine
- **ML Service**: Python FastAPI for machine learning operations
- **GIS Service**: Spatial analysis and mapping services
- **Caching**: Redis for performance optimization
- **Database**: PostgreSQL with PostGIS extension for geospatial data

### AI/ML Pipeline
- **Computer Vision**: TensorFlow/PyTorch for roof detection from satellite imagery
- **Predictive Analytics**: XGBoost for cost-benefit analysis, Prophet for rainfall prediction
- **Feasibility Scoring**: Scikit-learn for multi-criteria decision analysis
- **Image Processing**: CNN models for roof boundary detection and area calculation

### GIS & Mapping Stack
- **Earth Engine**: Google Earth Engine API for satellite data
- **Mapping**: OpenStreetMap integration with Mapbox visualization
- **Spatial Analysis**: QGIS Server for advanced geospatial operations
- **Satellite Data**: Sentinel-2 imagery processing pipeline

## Repository Structure

```
AquaHarvest/
├── frontend/
│   ├── web/                 # Next.js web application
│   ├── mobile/             # Flutter mobile app
│   └── ar-module/          # AR.js visualization components
├── backend/
│   ├── api-gateway/        # GraphQL gateway server
│   ├── assessment-service/ # Core assessment logic
│   ├── ml-service/         # Machine learning APIs
│   └── gis-service/        # GIS and mapping services
├── ml-models/
│   ├── roof-detection/     # Computer vision models
│   ├── rainfall-prediction/# Weather forecasting models
│   └── feasibility-scoring/# MCDA algorithms
├── infrastructure/
│   ├── docker/            # Container configurations
│   ├── kubernetes/        # K8s deployment files
│   └── terraform/         # Infrastructure as Code
├── docs/
│   ├── API.md            # API documentation
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── USER_GUIDE.md     # User documentation
└── README.md
```

## Development Commands

### Initial Setup
```bash
# Clone and setup the project
git clone <repository-url>
cd AquaHarvest

# Install dependencies for all services
npm run install:all
# or individually:
cd frontend/web && npm install
cd backend/api-gateway && npm install
cd ml-service && pip install -r requirements.txt
```

### Development Servers
```bash
# Start all services in development mode
npm run dev:all

# Start individual services:
npm run dev:web          # Next.js web app on port 3000
npm run dev:mobile       # Flutter web on port 3001
npm run dev:gateway      # GraphQL gateway on port 4000
npm run dev:ml           # Python ML service on port 5000
npm run dev:gis          # GIS service on port 6000
```

### Database Operations
```bash
# Setup PostgreSQL with PostGIS
npm run db:setup

# Run migrations
npm run db:migrate

# Seed initial data (rainfall data, structure types)
npm run db:seed

# Reset database (development only)
npm run db:reset
```

### Machine Learning Pipeline
```bash
# Train roof detection model
python ml-models/roof-detection/train.py

# Process satellite imagery batch
python scripts/process-satellite-data.py

# Update rainfall prediction models
npm run ml:update-rainfall

# Test ML service endpoints
npm run test:ml
```

### Testing
```bash
# Run all tests
npm run test

# Frontend tests
npm run test:frontend

# Backend API tests
npm run test:backend

# ML model validation
npm run test:ml

# End-to-end tests
npm run test:e2e

# Load testing for scalability demo
npm run test:load
```

### Build & Deployment
```bash
# Build all services for production
npm run build

# Build Docker images
npm run docker:build

# Deploy to development environment
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Production deployment (requires approval)
npm run deploy:prod
```

### Data Management
```bash
# Import IMD weather data
npm run data:import-weather

# Update CGWB groundwater database
npm run data:update-groundwater

# Process new satellite imagery
npm run data:process-imagery

# Generate assessment reports
npm run reports:generate
```

## Key Features Implementation

### AI-Powered Roof Detection
- Upload address → Satellite image fetching via Google Earth Engine
- CNN model processes image for roof boundary detection
- Automatic area calculation and slope identification
- Roof material type classification for runoff coefficient calculation

### Smart Recommendation Engine
- Multi-criteria decision analysis (MCDA) for structure selection
- Budget-optimized solutions with ROI calculator
- Personalized recommendations based on location and household size
- Maintenance schedule generation with automated alerts

### Real-time Data Integration
- IMD weather API for live rainfall monitoring
- CGWB database integration for groundwater information
- Soil permeability data from geological surveys
- Local water table depth analysis

### Augmented Reality Visualization
- AR.js implementation for 3D structure visualization
- Real-time cost updates based on interactive placement
- Mobile camera integration for on-site assessment
- Interactive sizing and positioning of RTRWH components

## Development Workflow

### Phase 1: Core MVP (Week 1-2)
Focus on basic assessment calculator with location-based data integration.

### Phase 2: Advanced Features (Week 3-4)
Implement AI roof detection, AR visualization, and community features.

### Phase 3: Scale & Polish (Week 5-6)
Government dashboard, analytics portal, and production optimization.

## API Endpoints

### REST APIs
- `POST /api/v1/assessment` - Create new assessment
- `GET /api/v1/assessment/:id` - Retrieve assessment results
- `GET /api/v1/rainfall/:location` - Historical rainfall data
- `GET /api/v1/structures` - Available RTRWH structures
- `POST /api/v1/calculate` - Calculate harvesting potential

### GraphQL Schema
Primary types: Assessment, Structure, User, RainfallData, CostAnalysis

## Database Schema

Key tables: `users`, `assessments`, `rainfall_data`, `structures`, `impact_metrics`

All geospatial data uses PostgreSQL PostGIS extension with GEOGRAPHY(POINT, 4326) for location coordinates.

## Performance Considerations

- Redis caching for frequently accessed data (rainfall patterns, structure types)
- CDN integration for satellite imagery and static assets
- Service worker implementation for offline capabilities
- Database sharding by geographic regions for scalability
- Lazy loading for mobile app performance

## Security Implementation

- OAuth 2.0 authentication with JWT tokens
- AES-256 encryption for sensitive data at rest
- Input validation and sanitization for all user inputs
- Rate limiting on API endpoints
- HTTPS enforcement across all services

## Monitoring & Analytics

- Prometheus + Grafana for system metrics
- ELK stack for comprehensive logging
- Sentry for error tracking and performance monitoring
- Custom impact metrics tracking (water saved, CO2 reduction, adoption rates)

## Hackathon Demo Flow

1. **Problem Visualization** - Water crisis statistics dashboard
2. **User Journey** - 3-step assessment process demonstration  
3. **AI Magic** - Live roof detection from satellite imagery
4. **AR Wow Factor** - 3D structure visualization on mobile device
5. **Impact Dashboard** - National scale potential calculations
6. **Scalability Proof** - Load testing demonstration with real metrics

## Government Integration

- District-wise adoption metrics dashboard
- Jal Jeevan Mission alignment and reporting
- Subsidy distribution tracking system
- Policy impact assessment tools
- CGWB database integration for official groundwater data

## Unique Value Propositions

- **First-of-its-kind** AI-powered roof detection from satellite imagery
- **AR visualization** for interactive structure placement
- **Blockchain-ready** impact tracking with verified water savings
- **IoT integration** capabilities for smart monitoring systems
- **Multi-language support** for nationwide accessibility
- **Government dashboard** for policy makers and administrators

This solution addresses the complete ecosystem of rainwater harvesting assessment, from individual household evaluation to national-scale impact analysis, making it a comprehensive platform for water conservation initiatives.