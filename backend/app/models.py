from sqlalchemy import Column, Integer, String, Date, Numeric, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class User(Base):
	__tablename__ = "users"
	id = Column(Integer, primary_key=True, index=True)
	email = Column(String(255), unique=True, nullable=False, index=True)
	password_hash = Column(String(255), nullable=False)
	created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

	# Relationships
	transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

class Transaction(Base):
	__tablename__ = "transactions"
	id = Column(Integer, primary_key=True, index=True)
	date = Column(Date, nullable=False, index=True)
	description = Column(Text, nullable=False)
	category = Column(String(100), nullable=True, index=True)
	amount = Column(Numeric(12, 2), nullable=False)
	source = Column(String(50), nullable=False, default="receipt_upload")
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

	# Relationships
	user = relationship("User", back_populates="transactions")
