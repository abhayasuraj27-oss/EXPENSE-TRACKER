from pydantic import BaseModel
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
	class Config:
		from_attributes = True

class TransactionBatchCreate(BaseModel):
	items: List[TransactionCreate]
