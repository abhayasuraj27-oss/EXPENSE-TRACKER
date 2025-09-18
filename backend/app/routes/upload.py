from fastapi import APIRouter, File, UploadFile, HTTPException, status
import os

# Create router for upload endpoints
router = APIRouter()

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a file to extract transactions"""
    
    # Check if file was provided
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file type
    allowed_extensions = {'.pdf', '.png', '.jpg', '.jpeg'}
    file_extension = os.path.splitext(file.filename.lower())[1]
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, 
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Check file size (10MB limit)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large. Max 10MB")
        
        # For now, just return basic info (we'll add OCR later)
        return {
            "success": True,
            "filename": file.filename,
            "file_type": file_extension,
            "file_size": len(file_content),
            "message": "File uploaded successfully! OCR processing coming next..."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "supported_formats": [".pdf", ".png", ".jpg", ".jpeg"],
        "max_file_size": "10MB"
    }
