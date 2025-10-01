import pdfplumber
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import pdf2image
import io
import re
from datetime import datetime
from typing import List, Dict
import os
import platform
import shutil

class OCRService:
    def __init__(self):
        # Configure Tesseract for better receipt reading
        self.tesseract_config = '--psm 6'
        
        # Define word categories for smart amount selection
        self.NEG_WORDS = {"refund","credit","reversal","cashback","returned","reimbursed"}
        self.TOTAL_WORDS = {"grand total","amount due","balance due","total"}
        self.AVOID_WORDS = {"subtotal","tax","tip","fee","surcharge"}
        
        # More precise amount regex with named groups
        self.AMOUNT_TOKEN = re.compile(r"""
            (?P<open>\()?                 # (
            (?P<sign>-)?                  # -
            \s*
            (?P<curr>[$€₹])?              # optional currency
            \s*
            (?P<num>\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})  # require decimals
            \s*
            (?(open)\))                   # )
        """, re.VERBOSE)
        
        # Set up Tesseract and Poppler paths for cross-platform support
        self._setup_ocr_paths()
    
    def _setup_ocr_paths(self):
        """Set up Tesseract and Poppler paths for different operating systems"""
        system = platform.system()
        
        if system == "Windows":
            self._setup_windows_paths()
        elif system == "Darwin":  # macOS
            self._setup_macos_paths()
        elif system == "Linux":
            self._setup_linux_paths()
        else:
            print(f"Warning: Unsupported operating system: {system}")
    
    def _setup_windows_paths(self):
        """Set up paths for Windows"""
        # Tesseract paths
        tesseract_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.getenv('USERNAME', '')),
            r"C:\tesseract\tesseract.exe",
        ]
        
        tesseract_found = False
        for path in tesseract_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                tesseract_found = True
                print(f"Tesseract found at: {path}")
                break
        
        if not tesseract_found:
            print("Warning: Tesseract not found. Please install Tesseract OCR.")
        
        # Poppler paths (for pdf2image)
        poppler_paths = [
            r"C:\poppler\bin",
            r"C:\Program Files\poppler\bin",
            r"C:\Program Files (x86)\poppler\bin",
            r"C:\poppler-0.68.0\bin",
        ]
        
        poppler_found = False
        for path in poppler_paths:
            if os.path.exists(path):
                os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
                poppler_found = True
                print(f"Poppler found at: {path}")
                break
        
        if not poppler_found:
            print("Warning: Poppler not found. PDF processing may not work.")
    
    def _setup_macos_paths(self):
        """Set up paths for macOS"""
        # Check if Tesseract is installed via Homebrew
        tesseract_paths = [
            "/usr/local/bin/tesseract",
            "/opt/homebrew/bin/tesseract",
            "/usr/bin/tesseract",
        ]
        
        tesseract_found = False
        for path in tesseract_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                tesseract_found = True
                print(f"Tesseract found at: {path}")
                break
        
        if not tesseract_found:
            # Try to find tesseract in PATH
            tesseract_cmd = shutil.which("tesseract")
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
                tesseract_found = True
                print(f"Tesseract found in PATH: {tesseract_cmd}")
        
        if not tesseract_found:
            print("Warning: Tesseract not found. Please install with: brew install tesseract")
        
        # Check if Poppler is installed via Homebrew
        poppler_paths = [
            "/usr/local/bin",
            "/opt/homebrew/bin",
        ]
        
        poppler_found = False
        for path in poppler_paths:
            if os.path.exists(os.path.join(path, "pdfinfo")):
                os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
                poppler_found = True
                print(f"Poppler found at: {path}")
                break
        
        if not poppler_found:
            print("Warning: Poppler not found. Please install with: brew install poppler")
    
    def _setup_linux_paths(self):
        """Set up paths for Linux"""
        # Check if Tesseract is installed
        tesseract_paths = [
            "/usr/bin/tesseract",
            "/usr/local/bin/tesseract",
            "/opt/tesseract/bin/tesseract",
        ]
        
        tesseract_found = False
        for path in tesseract_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                tesseract_found = True
                print(f"Tesseract found at: {path}")
                break
        
        if not tesseract_found:
            # Try to find tesseract in PATH
            tesseract_cmd = shutil.which("tesseract")
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
                tesseract_found = True
                print(f"Tesseract found in PATH: {tesseract_cmd}")
        
        if not tesseract_found:
            print("Warning: Tesseract not found. Please install with: sudo apt-get install tesseract-ocr")
        
        # Check if Poppler is installed
        poppler_paths = [
            "/usr/bin",
            "/usr/local/bin",
        ]
        
        poppler_found = False
        for path in poppler_paths:
            if os.path.exists(os.path.join(path, "pdfinfo")):
                os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
                poppler_found = True
                print(f"Poppler found at: {path}")
                break
        
        if not poppler_found:
            print("Warning: Poppler not found. Please install with: sudo apt-get install poppler-utils")
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF using pdfplumber, with OCR fallback for scanned PDFs"""
        try:
            # First try: Extract text directly from PDF
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                
                # If we got meaningful text, return it
                if text.strip() and len(text.strip()) > 50:
                    return text.strip()
            
            # Fallback: Convert PDF to images and OCR
            print("PDF has no extractable text, using OCR fallback...")
            return self._extract_text_from_pdf_images(file_content)
            
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    def _extract_text_from_pdf_images(self, file_content: bytes) -> str:
        """Convert PDF pages to images and OCR them"""
        try:
            # Convert PDF to images
            images = pdf2image.convert_from_bytes(file_content, dpi=300)
            
            text = ""
            for image in images:
                # Preprocess image for better OCR
                processed_image = self._preprocess_image(image)
                
                # Extract text with optimized config
                page_text = pytesseract.image_to_string(
                    processed_image, 
                    config=self.tesseract_config
                )
                if page_text:
                    text += page_text + "\n"
            
            return text.strip()
        except Exception as e:
            raise Exception(f"Error in PDF OCR fallback: {str(e)}")
    
    def extract_text_from_image(self, file_content: bytes) -> str:
        """Extract text from image using pytesseract with preprocessing"""
        try:
            image = Image.open(io.BytesIO(file_content))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(image)
            
            text = pytesseract.image_to_string(
                processed_image, 
                config=self.tesseract_config
            )
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting text from image: {str(e)}")
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        
        # Apply slight blur to reduce noise
        image = image.filter(ImageFilter.MedianFilter(size=3))
        
        return image
    
    def parse_transactions(self, text: str) -> List[Dict]:
        """Parse extracted text to find transactions with improved parsing"""
        transactions = []
        
        if not text or not text.strip():
            return transactions
        
        # Extract global date from the entire text first
        global_date = self._extract_global_date(text)
        
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            # Extract all amounts from the line
            amounts = self._extract_amounts(line)
            
            if amounts:
                # Choose the best amount for this line
                chosen_amount = self._choose_amount_for_line(line, amounts)
                
                if chosen_amount is not None:
                    # Use global date if available, otherwise current date
                    date = global_date or datetime.now().strftime("%Y-%m-%d")
                    
                    # Extract description (remove amounts and dates)
                    description = self._clean_description(line, chosen_amount)
                    
                    if description and len(description.strip()) > 2:
                        transactions.append({
                            "date": date,
                            "description": description.strip(),
                            "amount": chosen_amount
                        })
        
        # Remove duplicates but keep original order (don't sort by amount)
        unique_transactions = self._remove_duplicates(transactions)
        return unique_transactions
    
    def _extract_global_date(self, text: str) -> str:
        """Extract date from the entire text (usually at bottom)"""
        # Look for date patterns in the entire text
        date_patterns = [
            (re.compile(r"\b\d{4}-\d{2}-\d{2}\b"), ["%Y-%m-%d"]),
            (re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"), ["%m/%d/%Y","%m/%d/%y","%d/%m/%Y","%d/%m/%y"]),
            (re.compile(r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b"), ["%d %b %Y","%d %B %Y"]),
            (re.compile(r"\b[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}\b"), ["%b %d, %Y","%B %d, %Y"])
        ]
        
        for pattern, formats in date_patterns:
            matches = pattern.findall(text)
            for match in matches:
                for fmt in formats:
                    try:
                        date_obj = datetime.strptime(match, fmt)
                        return date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
        
        return None
    
    def _extract_amounts(self, line: str) -> List[float]:
        """Extract all amounts from a line with proper sign handling per token"""
        amounts = []
        lower = line.lower()
        
        for m in self.AMOUNT_TOKEN.finditer(line):
            num = float(m.group("num").replace(",", ""))
            neg = (m.group("sign") == "-") or (m.group("open") is not None) or any(w in lower for w in self.NEG_WORDS)
            amounts.append(-num if neg else num)
        
        return amounts
    
    def _choose_amount_for_line(self, line: str, amounts: List[float]) -> float | None:
        """Choose the best amount from a line based on context"""
        if not amounts:
            return None
        
        l = line.lower()
        
        # Skip lines with avoid words (subtotals, taxes, etc.)
        if any(w in l for w in self.AVOID_WORDS):
            return None
        
        # For total lines, prefer the largest amount (usually the grand total)
        if any(w in l for w in self.TOTAL_WORDS):
            return max(amounts, key=lambda x: abs(x))
        
        # For regular lines, prefer the rightmost amount (usually the item total)
        return amounts[-1]
    
    def _clean_description(self, line: str, amount: float) -> str:
        """Clean description by removing amounts and common receipt words"""
        cleaned = line
        val = f"{abs(amount):.2f}".replace(".", r"\.")
        amt_rx = re.compile(
            rf"\(?-?\s*[$€₹]?\s*\d{{1,3}}(?:,\d{{3}})*{val[len(val)-3:]}|\(?-?\s*[$€₹]?\s*{val}\)?"
        )
        cleaned = amt_rx.sub("", cleaned)

        stop = {
            "total","subtotal","tax","tip","amount","price","cost","receipt","invoice","bill",
            "payment","charge","debit","credit","refund","return","discount","sale","off",
            "usd$","usd","lb","kg","oz","g","each","per","@","x","times","grand","balance","due"
        }
        words = [w for w in cleaned.split() if w.lower() not in stop]
        return " ".join(words).strip()
    
    def _remove_duplicates(self, transactions: List[Dict]) -> List[Dict]:
        """Remove duplicate transactions based on description and amount"""
        seen = set()
        unique_transactions = []
        
        for transaction in transactions:
            # Create a key based on description and amount
            key = (transaction['description'].lower().strip(), transaction['amount'])
            if key not in seen:
                seen.add(key)
                unique_transactions.append(transaction)
        
        return unique_transactions

# Create a singleton instance
ocr_service = OCRService()
