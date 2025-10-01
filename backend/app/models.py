from sqlalchemy import Column, Integer, String, Date, Numeric, Text
from app.db import Base

class Transaction(Base):
	__tablename__ = "transactions"
	id = Column(Integer, primary_key=True, index=True)
	date = Column(Date, nullable=False, index=True)
	description = Column(Text, nullable=False)
	category = Column(String(100), nullable=True, index=True)
	amount = Column(Numeric(12, 2), nullable=False)
	source = Column(String(50), nullable=False, default="receipt_upload")
