"""
AquaHarvest ML Service
FastAPI service for machine learning operations including:
- Roof detection from satellite imagery
- Rainfall prediction
- Feasibility scoring
- Cost-benefit analysis
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from datetime import datetime, date
import logging
import os
from contextlib import asynccontextmanager

# Import custom modules
from models.roof_detection import RoofDetectionModel
from models.rainfall_prediction import RainfallPredictionModel
from models.feasibility_scoring import FeasibilityScoreModel
from services.satellite_service import SatelliteImageService
from services.database_service import DatabaseService
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

# Pydantic models for API requests/responses
class LocationInput(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class AssessmentInput(BaseModel):
    location: LocationInput
    roof_area: Optional[float] = None  # Will be detected if not provided
    household_size: int = 4
    roof_type: str = "concrete"  # concrete, tile, metal, etc.

class RoofDetectionResponse(BaseModel):
    roof_area: float
    roof_type: str
    confidence_score: float
    processing_time_ms: int
    satellite_image_url: str

class FeasibilityResponse(BaseModel):
    feasibility_score: float
    water_potential_annual: float
    recommended_structures: List[Dict[str, Any]]
    cost_estimate: float
    payback_period_months: int
    environmental_impact: Dict[str, float]

class RainfallPredictionResponse(BaseModel):
    predicted_annual_rainfall: float
    monthly_breakdown: List[float]
    confidence_score: float
    data_source: str

# Global model instances
roof_model = None
rainfall_model = None
feasibility_model = None
satellite_service = None
db_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ML models and services on startup"""
    global roof_model, rainfall_model, feasibility_model, satellite_service, db_service
    
    logger.info("Initializing ML Service...")
    
    # Initialize models
    roof_model = RoofDetectionModel()
    rainfall_model = RainfallPredictionModel()
    feasibility_model = FeasibilityScoreModel()
    
    # Initialize services
    satellite_service = SatelliteImageService()
    db_service = DatabaseService()
    
    # Load pre-trained models
    await roof_model.load_model()
    await rainfall_model.load_model()
    await feasibility_model.load_model()
    
    logger.info("ML Service initialized successfully")
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down ML Service...")

# Create FastAPI app
app = FastAPI(
    title="AquaHarvest ML Service",
    description="AI/ML microservice for rainwater harvesting assessment",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AquaHarvest ML Service",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": {
            "roof_detection": roof_model.is_loaded if roof_model else False,
            "rainfall_prediction": rainfall_model.is_loaded if rainfall_model else False,
            "feasibility_scoring": feasibility_model.is_loaded if feasibility_model else False
        }
    }

@app.post("/detect-roof", response_model=RoofDetectionResponse)
async def detect_roof(location: LocationInput):
    """
    Detect roof area and type from satellite imagery using computer vision
    """
    try:
        start_time = datetime.utcnow()
        
        # Get satellite image for location
        satellite_image = await satellite_service.get_satellite_image(
            latitude=location.latitude,
            longitude=location.longitude
        )
        
        if not satellite_image:
            raise HTTPException(status_code=404, detail="Could not retrieve satellite imagery for location")
        
        # Detect roof using ML model
        result = await roof_model.detect_roof(satellite_image)
        
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return RoofDetectionResponse(
            roof_area=result["roof_area"],
            roof_type=result["roof_type"],
            confidence_score=result["confidence"],
            processing_time_ms=processing_time,
            satellite_image_url=satellite_image["url"]
        )
        
    except Exception as e:
        logger.error(f"Roof detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Roof detection failed: {str(e)}")

@app.post("/predict-rainfall", response_model=RainfallPredictionResponse)
async def predict_rainfall(location: LocationInput):
    """
    Predict annual and monthly rainfall for a location using historical data and ML models
    """
    try:
        # Get historical rainfall data
        historical_data = await db_service.get_rainfall_data(
            latitude=location.latitude,
            longitude=location.longitude,
            radius_km=25  # 25km radius
        )
        
        # Predict rainfall using Prophet model
        prediction = await rainfall_model.predict_rainfall(
            historical_data=historical_data,
            location=location
        )
        
        return RainfallPredictionResponse(
            predicted_annual_rainfall=prediction["annual_rainfall"],
            monthly_breakdown=prediction["monthly_rainfall"],
            confidence_score=prediction["confidence"],
            data_source=prediction["data_source"]
        )
        
    except Exception as e:
        logger.error(f"Rainfall prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Rainfall prediction failed: {str(e)}")

@app.post("/calculate-feasibility", response_model=FeasibilityResponse)
async def calculate_feasibility(assessment: AssessmentInput):
    """
    Calculate comprehensive feasibility score and recommendations
    """
    try:
        # Get or detect roof area
        roof_area = assessment.roof_area
        if not roof_area:
            roof_detection = await detect_roof(assessment.location)
            roof_area = roof_detection.roof_area
        
        # Get rainfall prediction
        rainfall_pred = await predict_rainfall(assessment.location)
        
        # Get groundwater and soil data
        groundwater_data = await db_service.get_groundwater_data(
            latitude=assessment.location.latitude,
            longitude=assessment.location.longitude
        )
        
        # Calculate feasibility using ML model
        feasibility_result = await feasibility_model.calculate_feasibility(
            roof_area=roof_area,
            annual_rainfall=rainfall_pred.predicted_annual_rainfall,
            household_size=assessment.household_size,
            roof_type=assessment.roof_type,
            groundwater_data=groundwater_data
        )
        
        return FeasibilityResponse(**feasibility_result)
        
    except Exception as e:
        logger.error(f"Feasibility calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Feasibility calculation failed: {str(e)}")

@app.post("/full-assessment", response_model=Dict[str, Any])
async def full_assessment(assessment: AssessmentInput):
    """
    Complete rainwater harvesting assessment combining all ML models
    """
    try:
        logger.info(f"Starting full assessment for location: {assessment.location.latitude}, {assessment.location.longitude}")
        
        # Run all assessments in parallel for better performance
        roof_task = detect_roof(assessment.location) if not assessment.roof_area else None
        rainfall_task = predict_rainfall(assessment.location)
        
        # Get results
        if roof_task:
            roof_result = await roof_task
            assessment.roof_area = roof_result.roof_area
        
        rainfall_result = await rainfall_task
        feasibility_result = await calculate_feasibility(assessment)
        
        # Combine all results
        complete_assessment = {
            "assessment_id": f"aqh_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "location": assessment.location.dict(),
            "roof_detection": roof_result.dict() if roof_task else {"roof_area": assessment.roof_area, "detected": False},
            "rainfall_prediction": rainfall_result.dict(),
            "feasibility_analysis": feasibility_result.dict(),
            "timestamp": datetime.utcnow().isoformat(),
            "processing_summary": {
                "total_processing_time_ms": (roof_result.processing_time_ms if roof_task else 0) + 500,  # Approximate
                "models_used": ["roof_detection", "rainfall_prediction", "feasibility_scoring"],
                "data_sources": ["satellite_imagery", "IMD", "CGWB"]
            }
        }
        
        # Store assessment in database
        await db_service.store_assessment(complete_assessment)
        
        logger.info(f"Completed full assessment: {complete_assessment['assessment_id']}")
        return complete_assessment
        
    except Exception as e:
        logger.error(f"Full assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Full assessment failed: {str(e)}")

@app.post("/update-models")
async def update_models(background_tasks: BackgroundTasks):
    """
    Trigger model retraining with latest data
    """
    try:
        background_tasks.add_task(retrain_models)
        return {
            "message": "Model retraining initiated",
            "status": "in_progress",
            "estimated_time_minutes": 30
        }
    except Exception as e:
        logger.error(f"Model update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate model update")

async def retrain_models():
    """Background task to retrain ML models"""
    try:
        logger.info("Starting model retraining...")
        
        # Retrain each model with latest data
        await roof_model.retrain()
        await rainfall_model.retrain()
        await feasibility_model.retrain()
        
        logger.info("Model retraining completed successfully")
    except Exception as e:
        logger.error(f"Model retraining failed: {str(e)}")

@app.get("/models/status")
async def get_models_status():
    """Get status and performance metrics of all ML models"""
    try:
        return {
            "roof_detection": await roof_model.get_status(),
            "rainfall_prediction": await rainfall_model.get_status(),
            "feasibility_scoring": await feasibility_model.get_status(),
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Model status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get model status")

if __name__ == "__main__":
    import uvicorn
    
    # Run the development server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )