from fastapi import APIRouter

# Create a base router for common endpoints
router = APIRouter()

@router.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Expense Tracker API is running!",
        "status": "healthy"
    }

@router.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",  # We'll implement this later
        "ocr": "ready"  # We'll implement this later
    }
