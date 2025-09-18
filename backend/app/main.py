from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os

# Import route modules
from app.routes import base, upload

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title=os.getenv("APP_NAME", "Expense Tracker API"),
    description="AI-powered personal expense tracker with OCR capabilities",
    version=os.getenv("APP_VERSION", "1.0.0"),
    debug=os.getenv("DEBUG", "False").lower() == "true"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route modules
app.include_router(base.router)
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
