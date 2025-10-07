from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional, List

class TransactionBase(BaseModel):
	date: date
	description: str
	amount: float
	category: Optional[str] = None
	source: str = "receipt_upload"

class TransactionCreate(TransactionBase):
	pass

class TransactionResponse(TransactionBase):
	id: int
	user_id: int
	class Config:
		from_attributes = True

class TransactionBatchCreate(BaseModel):
	items: List[TransactionCreate]


# Auth related schemas
class UserSignup(BaseModel):
	email: EmailStr
	password: str

class UserLogin(BaseModel):
	email: EmailStr
	password: str

class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
