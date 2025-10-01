from fastapi import APIRouter, File, UploadFile, HTTPException, status
import os
from app.services.ocr_service import ocr_service
from app.services.categorizer import suggest_category

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
        
        # Extract text based on file type
        if file_extension == '.pdf':
            text = ocr_service.extract_text_from_pdf(file_content)
        else:
            text = ocr_service.extract_text_from_image(file_content)
        
        # Parse transactions from extracted text
        transactions = ocr_service.parse_transactions(text)
        for t in transactions:
	        t["suggested_category"] = suggest_category(t["description"])
        
        return {
            "success": True,
            "filename": file.filename,
            "file_type": file_extension,
            "file_size": len(file_content),
            "transactions": transactions,
            "transaction_count": len(transactions),
            "raw_text": text[:200] + "..." if len(text) > 200 else text
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
