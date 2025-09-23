"""
ML Service for AquaHarvest
Main entry point for ML microservice that handles all model coordination
"""

import asyncio
import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import numpy as np
import json

# Import ML models
from models.rainfall_prediction import RainfallPredictionModel
from models.roof_detection import RoofDetectionModel
from models.feasibility_scoring import FeasibilityScoreModel

# Import database service
from database.db_service import DatabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ml_service")

# Create FastAPI app
app = FastAPI(
    title="AquaHarvest ML Service",
    description="Machine learning backend for rainwater harvesting assessment and optimization",
    version="1.0.0"
)

# Initialize service state
models = {
    'rainfall': None,
    'roof_detection': None, 
    'feasibility': None
}

db_service = None

# Pydantic models for API requests/responses
class RainfallRequest(BaseModel):
    latitude: float = Field(..., description="Latitude of the location")
    longitude: float = Field(..., description="Longitude of the location")
    months_ahead: int = Field(12, description="Number of months to predict ahead")

class RoofRequest(BaseModel):
    image_url: str = Field(..., description="URL of satellite/aerial image of the roof")
    latitude: float = Field(..., description="Latitude of the property")
    longitude: float = Field(..., description="Longitude of the property")
    property_type: Optional[str] = Field(None, description="Type of property (residential, commercial, etc.)")

class FeasibilityRequest(BaseModel):
    roof_area: float = Field(..., description="Roof area in square meters")
    annual_rainfall: float = Field(..., description="Annual rainfall in mm")
    household_size: int = Field(..., description="Number of people in the household")
    roof_type: str = Field(..., description="Type of roof material")
    groundwater_data: Optional[Dict[str, Any]] = Field(None, description="Optional groundwater information")

class IntegratedAssessmentRequest(BaseModel):
    latitude: float = Field(..., description="Latitude of the location")
    longitude: float = Field(..., description="Longitude of the location") 
    image_url: Optional[str] = Field(None, description="URL of roof image (optional)")
    property_type: Optional[str] = Field("residential", description="Type of property")
    roof_area: Optional[float] = Field(None, description="Manual roof area override (sq meters)")
    roof_type: Optional[str] = Field("concrete", description="Roof material type")
    household_size: int = Field(4, description="Number of people in household/building")

class ServiceStatusResponse(BaseModel):
    service_status: str
    uptime: str
    models_loaded: Dict[str, bool]
    database_connected: bool
    model_details: Dict[str, Any]
    last_assessment_count: int

@app.on_event("startup")
async def startup_event():
    """Initialize models and database on startup"""
    logger.info("Starting ML Service")
    
    # Initialize models
    models['rainfall'] = RainfallPredictionModel()
    models['roof_detection'] = RoofDetectionModel()
    models['feasibility'] = FeasibilityScoreModel()
    
    # Initialize database connection
    global db_service
    db_service = DatabaseService()
    
    # Load models in background tasks
    asyncio.create_task(load_models())
    
    logger.info("ML Service initialized")

async def load_models():
    """Load all ML models asynchronously"""
    try:
        await asyncio.gather(
            models['rainfall'].load_model(),
            models['roof_detection'].load_model(),
            models['feasibility'].load_model()
        )
        
        logger.info("All models loaded successfully")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")

async def get_db():
    """Database dependency injection"""
    if db_service is None:
        raise HTTPException(status_code=503, detail="Database service not initialized")
    
    try:
        await db_service.connect()
        yield db_service
    finally:
        pass  # Connection pooling, so no need to close each time

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "AquaHarvest ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/status",
            "/rainfall/predict",
            "/roof/detect",
            "/feasibility/calculate",
            "/assessment/integrated"
        ]
    }

@app.get("/status", response_model=ServiceStatusResponse)
async def get_status(db: DatabaseService = Depends(get_db)):
    """Get detailed service status and model information"""
    
    # Get model statuses
    model_statuses = {
        name: model.is_loaded if model is not None else False
        for name, model in models.items()
    }
    
    # Get detailed model information
    model_details = {}
    for name, model in models.items():
        if model is not None and model.is_loaded:
            try:
                model_details[name] = await model.get_status()
            except Exception as e:
                logger.error(f"Error getting status for model {name}: {e}")
                model_details[name] = {"error": str(e)}
    
    # Get assessment count
    assessment_count = 0
    try:
        if db_service.is_connected:
            assessment_count = await db.get_assessment_count()
    except Exception as e:
        logger.error(f"Error getting assessment count: {e}")
    
    # Calculate uptime
    start_time = getattr(app.state, "start_time", datetime.now())
    if not hasattr(app.state, "start_time"):
        app.state.start_time = start_time
        
    uptime = datetime.now() - start_time
    uptime_str = f"{uptime.days}d {uptime.seconds//3600}h {(uptime.seconds//60)%60}m"
    
    return {
        "service_status": "operational",
        "uptime": uptime_str,
        "models_loaded": model_statuses,
        "database_connected": db_service.is_connected if db_service else False,
        "model_details": model_details,
        "last_assessment_count": assessment_count
    }

@app.post("/rainfall/predict")
async def predict_rainfall(request: RainfallRequest):
    """Predict rainfall for a location"""
    if models['rainfall'] is None or not models['rainfall'].is_loaded:
        raise HTTPException(status_code=503, detail="Rainfall model not available")
    
    try:
        prediction = await models['rainfall'].predict_rainfall(
            latitude=request.latitude,
            longitude=request.longitude,
            months_ahead=request.months_ahead
        )
        return prediction
    except Exception as e:
        logger.error(f"Rainfall prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/roof/detect")
async def detect_roof(request: RoofRequest):
    """Detect roof from image"""
    if models['roof_detection'] is None or not models['roof_detection'].is_loaded:
        raise HTTPException(status_code=503, detail="Roof detection model not available")
    
    try:
        result = await models['roof_detection'].detect_roof(
            image_url=request.image_url,
            latitude=request.latitude,
            longitude=request.longitude,
            property_type=request.property_type
        )
        return result
    except Exception as e:
        logger.error(f"Roof detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")

@app.post("/feasibility/calculate")
async def calculate_feasibility(request: FeasibilityRequest):
    """Calculate feasibility score"""
    if models['feasibility'] is None or not models['feasibility'].is_loaded:
        raise HTTPException(status_code=503, detail="Feasibility model not available")
    
    try:
        result = await models['feasibility'].calculate_feasibility(
            roof_area=request.roof_area,
            annual_rainfall=request.annual_rainfall,
            household_size=request.household_size,
            roof_type=request.roof_type,
            groundwater_data=request.groundwater_data
        )
        return result
    except Exception as e:
        logger.error(f"Feasibility calculation error: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@app.post("/assessment/integrated")
async def integrated_assessment(
    request: IntegratedAssessmentRequest, 
    db: DatabaseService = Depends(get_db)
):
    """Perform integrated assessment using all models"""
    try:
        assessment_id = f"assess_{int(datetime.now().timestamp())}"
        assessment_result = {
            "id": assessment_id,
            "timestamp": datetime.now().isoformat(),
            "location": {
                "latitude": request.latitude,
                "longitude": request.longitude
            },
            "request_params": request.dict(),
            "status": "processing"
        }
        
        # Step 1: Get rainfall prediction
        if models['rainfall'] and models['rainfall'].is_loaded:
            rainfall_data = await models['rainfall'].predict_rainfall(
                latitude=request.latitude,
                longitude=request.longitude
            )
            assessment_result["rainfall_prediction"] = rainfall_data
            
            # Extract annual rainfall for feasibility calculation
            annual_rainfall = rainfall_data["annual_prediction"]["total_rainfall"]
        else:
            # Fallback rainfall estimation
            region = models['rainfall']._get_region_from_coordinates(
                request.latitude, request.longitude) if models['rainfall'] else "central"
            regional_patterns = models['rainfall'].regional_patterns if models['rainfall'] else {
                "central": {"annual_avg": 850}
            }
            annual_rainfall = regional_patterns.get(region, {"annual_avg": 850})["annual_avg"]
            
            assessment_result["rainfall_prediction"] = {
                "status": "estimated",
                "annual_prediction": {
                    "total_rainfall": annual_rainfall
                }
            }
        
        # Step 2: Get roof information
        roof_area = request.roof_area  # Use provided roof area if available
        
        if roof_area is None and request.image_url and models['roof_detection'] and models['roof_detection'].is_loaded:
            # Detect roof from image
            roof_data = await models['roof_detection'].detect_roof(
                image_url=request.image_url,
                latitude=request.latitude,
                longitude=request.longitude,
                property_type=request.property_type
            )
            assessment_result["roof_detection"] = roof_data
            
            # Use detected roof area
            roof_area = roof_data["area_sqm"]
        
        if roof_area is None:
            # Estimate based on property type
            if request.property_type == "commercial":
                roof_area = 250.0
            elif request.property_type == "apartment":
                roof_area = 150.0
            else:  # residential
                roof_area = 100.0
                
            assessment_result["roof_detection"] = {
                "status": "estimated",
                "area_sqm": roof_area,
                "roof_type": request.roof_type,
                "confidence": 0.5
            }
        
        # Step 3: Calculate feasibility
        if models['feasibility'] and models['feasibility'].is_loaded:
            # Get groundwater data from database
            groundwater_data = await db.get_groundwater_data(
                request.latitude, request.longitude
            ) if db.is_connected else None
            
            feasibility_data = await models['feasibility'].calculate_feasibility(
                roof_area=roof_area,
                annual_rainfall=annual_rainfall,
                household_size=request.household_size,
                roof_type=request.roof_type,
                groundwater_data=groundwater_data
            )
            assessment_result["feasibility"] = feasibility_data
        else:
            assessment_result["feasibility"] = {
                "status": "unavailable",
                "message": "Feasibility calculation not available"
            }
        
        # Step 4: Save assessment to database
        if db.is_connected:
            saved_id = await db.save_assessment(assessment_result)
            assessment_result["saved_id"] = saved_id
        
        # Update final status
        assessment_result["status"] = "completed"
        
        return assessment_result
        
    except Exception as e:
        logger.error(f"Integrated assessment error: {e}")
        raise HTTPException(status_code=500, detail=f"Assessment error: {str(e)}")

@app.post("/models/retrain/{model_name}")
async def retrain_model(model_name: str):
    """Trigger model retraining"""
    if model_name not in models or models[model_name] is None:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    
    try:
        # Start retraining in background task
        asyncio.create_task(models[model_name].retrain())
        
        return {
            "status": "retraining_started",
            "model": model_name,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Retraining error for {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Retraining error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)