"""
Database service for AquaHarvest ML Service
Handles PostgreSQL connections and CRUD operations with PostGIS support
"""

import asyncio
import logging
from datetime import datetime, date
from typing import List, Dict, Optional, Any, Tuple
import asyncpg
import json
from geopy.distance import geodesic
import os
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.pool = None
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://aquaharvest_user:aquaharvest_password@localhost:5432/aquaharvest')
        
    async def initialize(self):
        """Initialize database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("Database connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise

    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            await self.initialize()
        
        async with self.pool.acquire() as connection:
            yield connection

    async def get_rainfall_data(self, latitude: float, longitude: float, radius_km: int = 25) -> List[Dict]:
        """
        Get rainfall data for a location within specified radius
        """
        try:
            async with self.get_connection() as conn:
                query = """
                    SELECT 
                        id,
                        ST_X(location::geometry) as longitude,
                        ST_Y(location::geometry) as latitude,
                        district,
                        state,
                        date,
                        precipitation,
                        temperature_avg,
                        humidity_avg,
                        data_source,
                        created_at
                    FROM rainfall_data 
                    WHERE ST_DWithin(
                        location, 
                        ST_Point($1, $2)::geography, 
                        $3 * 1000
                    )
                    ORDER BY date DESC
                    LIMIT 1000;
                """
                
                rows = await conn.fetch(query, longitude, latitude, radius_km)
                
                return [
                    {
                        'id': str(row['id']),
                        'latitude': row['latitude'],
                        'longitude': row['longitude'],
                        'district': row['district'],
                        'state': row['state'],
                        'date': row['date'].isoformat() if row['date'] else None,
                        'precipitation': float(row['precipitation']) if row['precipitation'] else 0,
                        'temperature_avg': float(row['temperature_avg']) if row['temperature_avg'] else None,
                        'humidity_avg': float(row['humidity_avg']) if row['humidity_avg'] else None,
                        'data_source': row['data_source'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"Error fetching rainfall data: {e}")
            return []

    async def get_groundwater_data(self, latitude: float, longitude: float, radius_km: int = 50) -> Optional[Dict]:
        """
        Get groundwater data for a location within specified radius
        """
        try:
            async with self.get_connection() as conn:
                query = """
                    SELECT 
                        id,
                        ST_X(location::geometry) as longitude,
                        ST_Y(location::geometry) as latitude,
                        district,
                        state,
                        water_table_depth,
                        aquifer_type,
                        soil_permeability,
                        groundwater_quality,
                        last_measured,
                        data_source,
                        created_at
                    FROM groundwater_data 
                    WHERE ST_DWithin(
                        location, 
                        ST_Point($1, $2)::geography, 
                        $3 * 1000
                    )
                    ORDER BY ST_Distance(location, ST_Point($1, $2)::geography)
                    LIMIT 1;
                """
                
                row = await conn.fetchrow(query, longitude, latitude, radius_km)
                
                if row:
                    return {
                        'id': str(row['id']),
                        'latitude': row['latitude'],
                        'longitude': row['longitude'],
                        'district': row['district'],
                        'state': row['state'],
                        'water_table_depth': float(row['water_table_depth']) if row['water_table_depth'] else None,
                        'aquifer_type': row['aquifer_type'],
                        'soil_permeability': float(row['soil_permeability']) if row['soil_permeability'] else None,
                        'groundwater_quality': row['groundwater_quality'],
                        'last_measured': row['last_measured'].isoformat() if row['last_measured'] else None,
                        'data_source': row['data_source'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error fetching groundwater data: {e}")
            return None

    async def get_structure_types(self, filters: Dict = None) -> List[Dict]:
        """
        Get available RTRWH structure types with optional filtering
        """
        try:
            async with self.get_connection() as conn:
                base_query = """
                    SELECT 
                        id,
                        name,
                        type,
                        description,
                        min_roof_area,
                        max_roof_area,
                        cost_per_sqft,
                        efficiency_rating,
                        maintenance_cost_annual,
                        lifespan_years,
                        specifications,
                        created_at
                    FROM structure_types
                """
                
                conditions = []
                params = []
                param_count = 0
                
                if filters:
                    if filters.get('type'):
                        param_count += 1
                        conditions.append(f"type = ${param_count}")
                        params.append(filters['type'])
                    
                    if filters.get('min_cost'):
                        param_count += 1
                        conditions.append(f"cost_per_sqft >= ${param_count}")
                        params.append(filters['min_cost'])
                    
                    if filters.get('max_cost'):
                        param_count += 1
                        conditions.append(f"cost_per_sqft <= ${param_count}")
                        params.append(filters['max_cost'])
                    
                    if filters.get('roof_area_range'):
                        roof_area = filters['roof_area_range'][0] if filters['roof_area_range'] else 100
                        param_count += 1
                        conditions.append(f"(min_roof_area IS NULL OR min_roof_area <= ${param_count})")
                        params.append(roof_area)
                        param_count += 1
                        conditions.append(f"(max_roof_area IS NULL OR max_roof_area >= ${param_count})")
                        params.append(roof_area)
                
                if conditions:
                    base_query += " WHERE " + " AND ".join(conditions)
                
                base_query += " ORDER BY type, cost_per_sqft"
                
                rows = await conn.fetch(base_query, *params)
                
                return [
                    {
                        'id': str(row['id']),
                        'name': row['name'],
                        'type': row['type'],
                        'description': row['description'],
                        'min_roof_area': float(row['min_roof_area']) if row['min_roof_area'] else None,
                        'max_roof_area': float(row['max_roof_area']) if row['max_roof_area'] else None,
                        'cost_per_sqft': float(row['cost_per_sqft']),
                        'efficiency_rating': float(row['efficiency_rating']),
                        'maintenance_cost_annual': float(row['maintenance_cost_annual']) if row['maintenance_cost_annual'] else 0,
                        'lifespan_years': row['lifespan_years'],
                        'specifications': row['specifications'] if row['specifications'] else {},
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"Error fetching structure types: {e}")
            return []

    async def store_assessment(self, assessment_data: Dict) -> Dict:
        """
        Store assessment result in database
        """
        try:
            async with self.get_connection() as conn:
                # First, create or get user if provided
                user_id = None
                if assessment_data.get('user_data'):
                    user_id = await self._create_or_update_user(conn, assessment_data['user_data'])
                
                # Insert assessment
                query = """
                    INSERT INTO assessments (
                        user_id,
                        location,
                        roof_area,
                        roof_type,
                        annual_rainfall,
                        runoff_coefficient,
                        feasibility_score,
                        water_potential_annual,
                        recommended_structures,
                        cost_estimate,
                        payback_period_months,
                        environmental_impact,
                        created_at
                    ) VALUES (
                        $1,
                        ST_Point($2, $3)::geography,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        NOW()
                    ) RETURNING id, created_at;
                """
                
                location = assessment_data['location']
                feasibility = assessment_data.get('feasibility_analysis', {})
                
                row = await conn.fetchrow(
                    query,
                    user_id,
                    location['longitude'],
                    location['latitude'],
                    assessment_data.get('roof_area', 100),
                    assessment_data.get('roof_type', 'concrete'),
                    assessment_data.get('annual_rainfall'),
                    assessment_data.get('runoff_coefficient', 0.85),
                    feasibility.get('feasibility_score', 0),
                    feasibility.get('water_potential_annual', 0),
                    json.dumps(feasibility.get('recommended_structures', [])),
                    feasibility.get('cost_estimate', 0),
                    feasibility.get('payback_period_months'),
                    json.dumps(feasibility.get('environmental_impact', {}))
                )
                
                return {
                    'id': str(row['id']),
                    'created_at': row['created_at'].isoformat(),
                    **assessment_data
                }
                
        except Exception as e:
            logger.error(f"Error storing assessment: {e}")
            raise

    async def _create_or_update_user(self, conn, user_data: Dict) -> str:
        """
        Create or update user and return user ID
        """
        try:
            # Check if user exists by email or phone
            existing_user = None
            if user_data.get('email'):
                existing_user = await conn.fetchrow(
                    "SELECT id FROM users WHERE email = $1",
                    user_data['email']
                )
            
            if not existing_user and user_data.get('phone'):
                existing_user = await conn.fetchrow(
                    "SELECT id FROM users WHERE phone = $1",
                    user_data['phone']
                )
            
            location = user_data['location']
            
            if existing_user:
                # Update existing user
                await conn.execute("""
                    UPDATE users SET 
                        name = $1,
                        location = ST_Point($2, $3)::geography,
                        address = $4,
                        household_size = $5,
                        roof_area = $6,
                        property_type = $7,
                        updated_at = NOW()
                    WHERE id = $8
                """,
                    user_data.get('name', ''),
                    location['longitude'],
                    location['latitude'],
                    location.get('address', ''),
                    user_data.get('household_size', 1),
                    user_data.get('roof_area'),
                    user_data.get('property_type', 'residential'),
                    existing_user['id']
                )
                return str(existing_user['id'])
            else:
                # Create new user
                row = await conn.fetchrow("""
                    INSERT INTO users (
                        name, email, phone, location, address, 
                        household_size, roof_area, property_type, 
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, ST_Point($4, $5)::geography, $6,
                        $7, $8, $9, NOW(), NOW()
                    ) RETURNING id
                """,
                    user_data.get('name', ''),
                    user_data.get('email'),
                    user_data.get('phone'),
                    location['longitude'],
                    location['latitude'],
                    location.get('address', ''),
                    user_data.get('household_size', 1),
                    user_data.get('roof_area'),
                    user_data.get('property_type', 'residential')
                )
                return str(row['id'])
                
        except Exception as e:
            logger.error(f"Error creating/updating user: {e}")
            raise

    async def get_annual_rainfall_avg(self, latitude: float, longitude: float, radius_km: int = 10) -> float:
        """
        Calculate average annual rainfall for a location using database function
        """
        try:
            async with self.get_connection() as conn:
                row = await conn.fetchrow(
                    "SELECT get_annual_rainfall(ST_Point($1, $2)::geography, $3) as avg_rainfall",
                    longitude, latitude, radius_km
                )
                return float(row['avg_rainfall']) if row and row['avg_rainfall'] else 800.0
        except Exception as e:
            logger.error(f"Error calculating annual rainfall: {e}")
            return 800.0  # Default fallback

    async def calculate_feasibility_score(self, roof_area: float, annual_rainfall: float, 
                                        water_table_depth: float = None, 
                                        soil_permeability: float = None) -> float:
        """
        Calculate feasibility score using database function
        """
        try:
            async with self.get_connection() as conn:
                row = await conn.fetchrow(
                    "SELECT calculate_feasibility_score($1, $2, $3, $4) as score",
                    roof_area, annual_rainfall, water_table_depth, soil_permeability
                )
                return float(row['score']) if row and row['score'] else 0.0
        except Exception as e:
            logger.error(f"Error calculating feasibility score: {e}")
            return 0.0

    async def calculate_water_potential(self, roof_area: float, annual_rainfall: float, 
                                     runoff_coefficient: float = 0.85) -> float:
        """
        Calculate water harvesting potential using database function
        """
        try:
            async with self.get_connection() as conn:
                row = await conn.fetchrow(
                    "SELECT calculate_water_potential($1, $2, $3) as potential",
                    roof_area, annual_rainfall, runoff_coefficient
                )
                return float(row['potential']) if row and row['potential'] else 0.0
        except Exception as e:
            logger.error(f"Error calculating water potential: {e}")
            return 0.0

    async def get_impact_metrics(self, district: str = None, state: str = None, 
                               time_range: str = '1year') -> Dict:
        """
        Get impact metrics for government dashboard
        """
        try:
            async with self.get_connection() as conn:
                conditions = []
                params = []
                param_count = 0
                
                if district:
                    param_count += 1
                    conditions.append(f"district = ${param_count}")
                    params.append(district)
                
                if state:
                    param_count += 1
                    conditions.append(f"state = ${param_count}")
                    params.append(state)
                
                # Time range filter
                if time_range == '1month':
                    param_count += 1
                    conditions.append(f"month >= NOW() - INTERVAL '1 month'")
                elif time_range == '6months':
                    param_count += 1
                    conditions.append(f"month >= NOW() - INTERVAL '6 months'")
                elif time_range == '1year':
                    param_count += 1
                    conditions.append(f"month >= NOW() - INTERVAL '1 year'")
                
                where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
                
                query = f"""
                    SELECT 
                        SUM(total_assessments) as total_assessments,
                        SUM(total_implementations) as total_implementations,
                        SUM(water_harvested_liters) as water_harvested,
                        SUM(co2_reduction_kg) as co2_reduction,
                        SUM(money_saved_inr) as money_saved,
                        SUM(jobs_created) as jobs_created
                    FROM impact_metrics
                    {where_clause}
                """
                
                row = await conn.fetchrow(query, *params)
                
                if row:
                    return {
                        'total_assessments': int(row['total_assessments']) if row['total_assessments'] else 0,
                        'total_implementations': int(row['total_implementations']) if row['total_implementations'] else 0,
                        'water_harvested': float(row['water_harvested']) if row['water_harvested'] else 0,
                        'co2_reduction': float(row['co2_reduction']) if row['co2_reduction'] else 0,
                        'money_saved': float(row['money_saved']) if row['money_saved'] else 0,
                        'jobs_created': int(row['jobs_created']) if row['jobs_created'] else 0
                    }
                
                return {
                    'total_assessments': 0,
                    'total_implementations': 0,
                    'water_harvested': 0,
                    'co2_reduction': 0,
                    'money_saved': 0,
                    'jobs_created': 0
                }
                
        except Exception as e:
            logger.error(f"Error fetching impact metrics: {e}")
            return {}

    async def health_check(self) -> bool:
        """
        Check database connectivity
        """
        try:
            async with self.get_connection() as conn:
                await conn.fetchval("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False