from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.db import get_db, engine
from app.db import Base
from app.models import Transaction
from app.schemas import TransactionCreate, TransactionResponse, TransactionBatchCreate
import re
from typing import Dict, List

# Create tables on import
Base.metadata.create_all(bind=engine)

_CLEAN_RX = re.compile(r"[^a-z0-9\s]+")

def _normalize(s: str) -> str:
	s = s.lower()
	s = _CLEAN_RX.sub(" ", s)
	return " ".join(s.split())

# Add as many synonyms as you like; use simple words that often appear in receipts
_RULES: Dict[str, List[str]] = {
	"Food": [
		"pizza","burger","restaurant","nugget","milk","banana","chicken","date","spice",
		"bread","butter","egg","curd","paneer","cheese","yogurt","chapathi","dal"
	],
	"Groceries": [
		"costco","kroger","walmart","vegetable","oil","blueberry","peanut","flour","rice","lentil",
		"tindora","spinach","onion","tomato","banana","fruit","greens"
	],
	"Transport": ["uber","lyft","gas","fuel","ride","toll","parking"],
	"Household": ["detergent","tide","spray","nexxus","shampoo","cleaner","soap","paper","tissue"],
	"Health": ["protein","iq bar","ks protein","vitamin","supplement","whey","electrolyte"],
}

# Build flattened keyword list for fast matching
_FLAT: List[tuple[str, str]] = [(cat, _normalize(k)) for cat, kws in _RULES.items() for k in kws]

def suggest_category(description: str) -> str:
	desc = _normalize(description)
	if not desc:
		return "Uncategorized"

	# score each category by number of keyword hits (substring match)
	scores: Dict[str, int] = {}
	for cat, kw in _FLAT:
		if kw and kw in desc:
			scores[cat] = scores.get(cat, 0) + 1

	if not scores:
		return "Uncategorized"

	# pick the category with the highest score (ties broken by lexicographic order)
	best = max(scores.items(), key=lambda x: (x[1], x[0]))[0]
	return best

router = APIRouter()

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(txn: TransactionCreate, db: Session = Depends(get_db)):
	payload = txn.dict()
	if not payload.get("category"):
		payload["category"] = "Uncategorized"
	row = Transaction(**payload)
	db.add(row); db.commit(); db.refresh(row)
	return row

@router.post("/batch", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
def create_transactions(payload: TransactionBatchCreate, db: Session = Depends(get_db)):
	if not payload.items:
		raise HTTPException(status_code=400, detail="No items provided")

	rows = []
	for i in payload.items:
		data = i.dict()
		# accept category if provided; else use suggested_category if present; else compute
		if not data.get("category"):
			suggested = getattr(i, "suggested_category", None)
			if suggested:
				data["category"] = suggested
			else:
				from app.services.categorizer import suggest_category
				data["category"] = suggest_category(data["description"]) or "Uncategorized"

		row = Transaction(**data)
		db.add(row)
		rows.append(row)

	db.commit()
	for r in rows:
		db.refresh(r)
	return rows

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(skip: int = 0, limit: int = Query(100, le=500), db: Session = Depends(get_db)):
	return db.query(Transaction).order_by(desc(Transaction.date), desc(Transaction.id)).offset(skip).limit(limit).all()

@router.get("/analytics/weekly")
def get_weekly_analytics(weeks: int = Query(4, ge=1, le=52), db: Session = Depends(get_db)):
	"""Get weekly spending analytics for the last N weeks"""
	from sqlalchemy import func, extract
	from datetime import datetime, timedelta
	
	# Calculate start date for the requested number of weeks
	end_date = datetime.now().date()
	start_date = end_date - timedelta(weeks=weeks)
	
	# Query weekly spending
	weekly_data = db.query(
		extract('year', Transaction.date).label('year'),
		extract('week', Transaction.date).label('week'),
		func.sum(Transaction.amount).label('total_amount'),
		func.count(Transaction.id).label('transaction_count')
	).filter(
		Transaction.date >= start_date,
		Transaction.date <= end_date
	).group_by(
		extract('year', Transaction.date),
		extract('week', Transaction.date)
	).order_by(
		extract('year', Transaction.date),
		extract('week', Transaction.date)
	).all()
	
	# Format response
	result = []
	for row in weekly_data:
		result.append({
			"year": int(row.year),
			"week": int(row.week),
			"total_amount": float(row.total_amount),
			"transaction_count": int(row.transaction_count)
		})
	
	return {
		"period": f"last_{weeks}_weeks",
		"start_date": start_date.isoformat(),
		"end_date": end_date.isoformat(),
		"weekly_data": result
	}

@router.get("/analytics/monthly")
def get_monthly_analytics(months: int = Query(12, ge=1, le=24), db: Session = Depends(get_db)):
	"""Get monthly spending analytics for the last N months"""
	from sqlalchemy import func, extract
	from datetime import datetime, timedelta
	
	# Calculate start date for the requested number of months
	end_date = datetime.now().date()
	start_date = end_date - timedelta(days=months * 30)  # Approximate months
	
	# Query monthly spending
	monthly_data = db.query(
		extract('year', Transaction.date).label('year'),
		extract('month', Transaction.date).label('month'),
		func.sum(Transaction.amount).label('total_amount'),
		func.count(Transaction.id).label('transaction_count')
	).filter(
		Transaction.date >= start_date,
		Transaction.date <= end_date
	).group_by(
		extract('year', Transaction.date),
		extract('month', Transaction.date)
	).order_by(
		extract('year', Transaction.date),
		extract('month', Transaction.date)
	).all()
	
	# Format response
	result = []
	for row in monthly_data:
		result.append({
			"year": int(row.year),
			"month": int(row.month),
			"total_amount": float(row.total_amount),
			"transaction_count": int(row.transaction_count)
		})
	
	return {
		"period": f"last_{months}_months",
		"start_date": start_date.isoformat(),
		"end_date": end_date.isoformat(),
		"monthly_data": result
	}

@router.get("/analytics/categories")
def get_category_analytics(period_days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
	"""Get spending analytics by category for the last N days"""
	from sqlalchemy import func
	from datetime import datetime, timedelta
	
	# Calculate start date
	end_date = datetime.now().date()
	start_date = end_date - timedelta(days=period_days)
	
	# Query category spending
	category_data = db.query(
		Transaction.category,
		func.sum(Transaction.amount).label('total_amount'),
		func.count(Transaction.id).label('transaction_count'),
		func.avg(Transaction.amount).label('avg_amount')
	).filter(
		Transaction.date >= start_date,
		Transaction.date <= end_date
	).group_by(
		Transaction.category
	).order_by(
		func.sum(Transaction.amount).desc()
	).all()
	
	# Calculate total spending for percentage calculation
	total_spending = sum(float(row.total_amount) for row in category_data)
	
	# Format response
	result = []
	for row in category_data:
		percentage = (float(row.total_amount) / total_spending * 100) if total_spending > 0 else 0
		result.append({
			"category": row.category or "Uncategorized",
			"total_amount": float(row.total_amount),
			"transaction_count": int(row.transaction_count),
			"avg_amount": float(row.avg_amount),
			"percentage": round(percentage, 2)
		})
	
	return {
		"period_days": period_days,
		"start_date": start_date.isoformat(),
		"end_date": end_date.isoformat(),
		"total_spending": total_spending,
		"category_data": result
	}

@router.get("/analytics/summary")
def get_spending_summary(period_days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
	"""Get overall spending summary for the last N days"""
	from sqlalchemy import func
	from datetime import datetime, timedelta
	
	# Calculate start date
	end_date = datetime.now().date()
	start_date = end_date - timedelta(days=period_days)
	
	# Query summary statistics
	summary = db.query(
		func.sum(Transaction.amount).label('total_spent'),
		func.count(Transaction.id).label('total_transactions'),
		func.avg(Transaction.amount).label('avg_transaction'),
		func.min(Transaction.amount).label('min_transaction'),
		func.max(Transaction.amount).label('max_transaction')
	).filter(
		Transaction.date >= start_date,
		Transaction.date <= end_date
	).first()
	
	# Get daily average
	daily_avg = float(summary.total_spent) / period_days if summary.total_spent else 0
	
	return {
		"period_days": period_days,
		"start_date": start_date.isoformat(),
		"end_date": end_date.isoformat(),
		"total_spent": float(summary.total_spent or 0),
		"total_transactions": int(summary.total_transactions or 0),
		"avg_transaction": float(summary.avg_transaction or 0),
		"min_transaction": float(summary.min_transaction or 0),
		"max_transaction": float(summary.max_transaction or 0),
		"daily_average": round(daily_avg, 2)
	}

@router.get("/analytics/calendar")
def get_calendar_data(year: int = Query(None), month: int = Query(None), db: Session = Depends(get_db)):
	"""Get calendar data for a specific month with daily spending"""
	from sqlalchemy import func, extract
	from datetime import datetime, date
	
	# Use current year/month if not provided
	if not year:
		year = datetime.now().year
	if not month:
		month = datetime.now().month
	
	# Calculate start and end dates for the month
	start_date = date(year, month, 1)
	if month == 12:
		end_date = date(year + 1, 1, 1)
	else:
		end_date = date(year, month + 1, 1)
	
	# Query daily spending for the month
	daily_data = db.query(
		extract('day', Transaction.date).label('day'),
		func.sum(Transaction.amount).label('total_amount'),
		func.count(Transaction.id).label('transaction_count')
	).filter(
		Transaction.date >= start_date,
		Transaction.date < end_date
	).group_by(
		extract('day', Transaction.date)
	).order_by(
		extract('day', Transaction.date)
	).all()
	
	# Format response with all days of the month
	import calendar
	days_in_month = calendar.monthrange(year, month)[1]
	
	result = {}
	for day in range(1, days_in_month + 1):
		result[day] = {
			"total_amount": 0.0,
			"transaction_count": 0
		}
	
	# Fill in actual data
	for row in daily_data:
		day = int(row.day)
		result[day] = {
			"total_amount": float(row.total_amount),
			"transaction_count": int(row.transaction_count)
		}
	
	return {
		"year": year,
		"month": month,
		"start_date": start_date.isoformat(),
		"end_date": end_date.isoformat(),
		"daily_data": result
	}

@router.get("/filter")
def filter_transactions(
	start_date: str = Query(None),
	end_date: str = Query(None),
	category: str = Query(None),
	min_amount: float = Query(None),
	max_amount: float = Query(None),
	skip: int = Query(0, ge=0),
	limit: int = Query(100, le=500),
	db: Session = Depends(get_db)
):
	"""Filter transactions with various criteria"""
	from datetime import datetime
	
	query = db.query(Transaction)
	
	# Apply filters
	if start_date:
		query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d").date())
	if end_date:
		query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").date())
	if category:
		query = query.filter(Transaction.category == category)
	if min_amount is not None:
		query = query.filter(Transaction.amount >= min_amount)
	if max_amount is not None:
		query = query.filter(Transaction.amount <= max_amount)
	
	# Apply pagination and ordering
	transactions = query.order_by(desc(Transaction.date), desc(Transaction.id)).offset(skip).limit(limit).all()
	
	return {
		"transactions": transactions,
		"total_count": query.count(),
		"filters": {
			"start_date": start_date,
			"end_date": end_date,
			"category": category,
			"min_amount": min_amount,
			"max_amount": max_amount
		},
		"pagination": {
			"skip": skip,
			"limit": limit
		}
	}
