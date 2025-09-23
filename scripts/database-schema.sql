-- AquaHarvest Database Schema
-- PostgreSQL with PostGIS extension for geospatial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    household_size INTEGER DEFAULT 1,
    roof_area DECIMAL(10, 2),
    property_type VARCHAR(50) DEFAULT 'residential', -- residential, commercial, industrial
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on location for spatial queries
CREATE INDEX idx_users_location ON users USING GIST(location);

-- Structure types table (RTRWH structures)
CREATE TABLE structure_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- storage_tank, filter_tank, recharge_pit, etc.
    description TEXT,
    min_roof_area DECIMAL(10, 2) DEFAULT 0,
    max_roof_area DECIMAL(10, 2),
    cost_per_sqft DECIMAL(10, 2) NOT NULL,
    efficiency_rating DECIMAL(3, 2) DEFAULT 0.85, -- 0.0 to 1.0
    maintenance_cost_annual DECIMAL(10, 2) DEFAULT 0,
    lifespan_years INTEGER DEFAULT 20,
    specifications JSONB, -- detailed specs, dimensions, materials
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default structure types
INSERT INTO structure_types (name, type, description, cost_per_sqft, efficiency_rating, specifications) VALUES
('Basic Storage Tank', 'storage_tank', 'Overhead concrete tank for rainwater storage', 150.00, 0.90, '{"capacity_range": "1000-5000L", "material": "concrete"}'),
('First Flush Filter', 'filter_tank', 'Filter system to remove initial roof runoff', 75.00, 0.95, '{"filter_type": "mechanical", "maintenance": "monthly"}'),
('Recharge Pit', 'recharge_pit', 'Underground pit for artificial groundwater recharge', 100.00, 0.80, '{"depth_range": "3-6m", "diameter": "1-2m"}'),
('Recharge Well', 'recharge_well', 'Borewell for direct groundwater recharge', 200.00, 0.85, '{"depth_range": "20-50m", "diameter": "150-300mm"}');

-- Assessments table
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    roof_area DECIMAL(10, 2) NOT NULL,
    roof_type VARCHAR(50) DEFAULT 'concrete', -- concrete, tile, metal, etc.
    annual_rainfall DECIMAL(10, 2), -- mm per year
    runoff_coefficient DECIMAL(3, 2) DEFAULT 0.85,
    feasibility_score DECIMAL(5, 2) NOT NULL, -- 0-100 score
    water_potential_annual DECIMAL(12, 2), -- liters per year
    recommended_structures JSONB NOT NULL, -- array of structure recommendations
    cost_estimate DECIMAL(12, 2) NOT NULL,
    payback_period_months INTEGER,
    environmental_impact JSONB, -- CO2 reduction, water saved, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_location ON assessments USING GIST(location);
CREATE INDEX idx_assessments_score ON assessments(feasibility_score);

-- Rainfall data table
CREATE TABLE rainfall_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    date DATE NOT NULL,
    precipitation DECIMAL(8, 2) NOT NULL, -- mm
    temperature_avg DECIMAL(5, 2),
    humidity_avg DECIMAL(5, 2),
    data_source VARCHAR(100) DEFAULT 'IMD', -- IMD, satellite, weather_station
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (location, date)
);

CREATE INDEX idx_rainfall_location ON rainfall_data USING GIST(location);
CREATE INDEX idx_rainfall_date ON rainfall_data(date);
CREATE INDEX idx_rainfall_district ON rainfall_data(district);

-- Groundwater data table
CREATE TABLE groundwater_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    water_table_depth DECIMAL(8, 2), -- meters below ground
    aquifer_type VARCHAR(100), -- confined, unconfined, semi-confined
    soil_permeability DECIMAL(10, 6), -- m/s
    groundwater_quality VARCHAR(50) DEFAULT 'good', -- good, moderate, poor
    last_measured DATE,
    data_source VARCHAR(100) DEFAULT 'CGWB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_groundwater_location ON groundwater_data USING GIST(location);
CREATE INDEX idx_groundwater_district ON groundwater_data(district);

-- Government impact tracking
CREATE TABLE impact_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    month DATE NOT NULL,
    total_assessments INTEGER DEFAULT 0,
    total_implementations INTEGER DEFAULT 0,
    water_harvested_liters BIGINT DEFAULT 0,
    co2_reduction_kg DECIMAL(12, 2) DEFAULT 0,
    money_saved_inr DECIMAL(15, 2) DEFAULT 0,
    jobs_created INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (district, state, month)
);

CREATE INDEX idx_impact_state ON impact_metrics(state);
CREATE INDEX idx_impact_month ON impact_metrics(month);

-- AI model predictions table
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    model_type VARCHAR(100) NOT NULL, -- roof_detection, rainfall_prediction, feasibility_scoring
    model_version VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    prediction_result JSONB NOT NULL,
    confidence_score DECIMAL(3, 2), -- 0.0 to 1.0
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_predictions_assessment ON ai_predictions(assessment_id);
CREATE INDEX idx_ai_predictions_model ON ai_predictions(model_type, model_version);

-- Contractor marketplace
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    service_radius_km INTEGER DEFAULT 50,
    specializations TEXT[], -- array of specializations
    rating DECIMAL(3, 2) DEFAULT 0, -- 0.0 to 5.0
    total_projects INTEGER DEFAULT 0,
    license_number VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contractors_location ON contractors USING GIST(location);
CREATE INDEX idx_contractors_rating ON contractors(rating);

-- Project implementations
CREATE TABLE implementations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    start_date DATE,
    completion_date DATE,
    actual_cost DECIMAL(12, 2),
    structures_installed JSONB, -- actual structures installed
    performance_data JSONB, -- water collected, efficiency metrics
    user_rating DECIMAL(3, 2), -- 1.0 to 5.0
    user_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_implementations_assessment ON implementations(assessment_id);
CREATE INDEX idx_implementations_contractor ON implementations(contractor_id);
CREATE INDEX idx_implementations_status ON implementations(status);

-- Functions for calculations

-- Calculate distance between two points in meters
CREATE OR REPLACE FUNCTION calculate_distance(
    point1 GEOGRAPHY,
    point2 GEOGRAPHY
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(point1, point2);
END;
$$ LANGUAGE plpgsql;

-- Get annual rainfall for a location (average from historical data)
CREATE OR REPLACE FUNCTION get_annual_rainfall(
    user_location GEOGRAPHY,
    radius_km INTEGER DEFAULT 10
) RETURNS DECIMAL AS $$
DECLARE
    avg_rainfall DECIMAL;
BEGIN
    SELECT AVG(precipitation * 365.25 / COUNT(*)) INTO avg_rainfall
    FROM rainfall_data
    WHERE ST_DWithin(location, user_location, radius_km * 1000)
    AND date >= CURRENT_DATE - INTERVAL '3 years';
    
    RETURN COALESCE(avg_rainfall, 800); -- Default 800mm if no data
END;
$$ LANGUAGE plpgsql;

-- Calculate rainwater harvesting potential
CREATE OR REPLACE FUNCTION calculate_water_potential(
    roof_area_sqm DECIMAL,
    annual_rainfall_mm DECIMAL,
    runoff_coefficient DECIMAL DEFAULT 0.85
) RETURNS DECIMAL AS $$
BEGIN
    -- Formula: Potential (liters) = Roof Area (m²) × Annual Rainfall (mm) × Runoff Coefficient
    -- Converting mm to liters: 1mm rain on 1m² = 1 liter
    RETURN roof_area_sqm * annual_rainfall_mm * runoff_coefficient;
END;
$$ LANGUAGE plpgsql;

-- Calculate feasibility score based on multiple factors
CREATE OR REPLACE FUNCTION calculate_feasibility_score(
    roof_area DECIMAL,
    annual_rainfall DECIMAL,
    water_table_depth DECIMAL DEFAULT NULL,
    soil_permeability DECIMAL DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
BEGIN
    -- Base score from roof area (0-30 points)
    score := score + LEAST(30, roof_area / 10); -- 1 point per 10 sqm, max 30
    
    -- Rainfall score (0-40 points)
    score := score + LEAST(40, annual_rainfall / 25); -- 1 point per 25mm, max 40
    
    -- Water table depth score (0-15 points)
    IF water_table_depth IS NOT NULL THEN
        score := score + GREATEST(0, 15 - water_table_depth / 2); -- Better score for deeper water table
    ELSE
        score := score + 10; -- Default moderate score
    END IF;
    
    -- Soil permeability score (0-15 points)
    IF soil_permeability IS NOT NULL THEN
        score := score + LEAST(15, soil_permeability * 1000000); -- Convert m/s to micro m/s
    ELSE
        score := score + 10; -- Default moderate score
    END IF;
    
    RETURN LEAST(100, score); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_implementations_updated_at BEFORE UPDATE ON implementations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (Indian cities)
INSERT INTO rainfall_data (location, district, state, date, precipitation) VALUES
(ST_Point(77.2090, 28.6139, 4326)::geography, 'New Delhi', 'Delhi', '2023-01-01', 0.0),
(ST_Point(77.2090, 28.6139, 4326)::geography, 'New Delhi', 'Delhi', '2023-07-15', 45.2),
(ST_Point(72.8777, 19.0760, 4326)::geography, 'Mumbai', 'Maharashtra', '2023-07-20', 89.5),
(ST_Point(80.2707, 13.0827, 4326)::geography, 'Chennai', 'Tamil Nadu', '2023-11-10', 67.8),
(ST_Point(77.5946, 12.9716, 4326)::geography, 'Bengaluru', 'Karnataka', '2023-09-05', 34.2);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aquaharvest_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aquaharvest_user;