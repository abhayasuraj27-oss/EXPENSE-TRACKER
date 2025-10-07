import os
from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker, declarative_base

# Prefer SQLite locally unless DATABASE_URL is provided
DEFAULT_SQLITE_URL = "sqlite:///./expense_tracker.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    # Needed for SQLite when used with FastAPI in threaded servers
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def ensure_sqlite_schema():
	"""Quick migration for SQLite to add missing columns when upgrading schema."""
	if not DATABASE_URL.startswith("sqlite"):
		return

	inspector = inspect(engine)
	with engine.begin() as conn:
		# Ensure users table exists
		if "users" not in inspector.get_table_names():
			conn.execute(text(
				"""
				CREATE TABLE IF NOT EXISTS users (
					id INTEGER PRIMARY KEY,
					email VARCHAR(255) NOT NULL UNIQUE,
					password_hash VARCHAR(255) NOT NULL,
					created_at DATETIME NOT NULL
				)
				"""
			))
		# Ensure user_id exists on transactions
		cols = [c['name'] for c in inspector.get_columns('transactions')]
		if 'user_id' not in cols:
			conn.execute(text("ALTER TABLE transactions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1"))


# Run lightweight schema ensure on import
ensure_sqlite_schema()
