import sys, subprocess

def check(cmd):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)
        print(f"$ {' '.join(cmd)}\n{out.splitlines()[0]}")
    except Exception as e:
        print(f"FAILED: {' '.join(cmd)} -> {e}")

print("Python:", sys.version)

# python packages
try:
    import fastapi, uvicorn, pdfplumber, PIL, pytesseract, pdf2image, sqlalchemy, pydantic
    print("Imports OK: fastapi, uvicorn, pdfplumber, Pillow, pytesseract, pdf2image, sqlalchemy, pydantic")
except Exception as e:
    print("Import failure:", e)

# system binaries
check(["tesseract", "--version"])
check(["pdfinfo", "-v"])
