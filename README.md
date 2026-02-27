# 💸 Expense Tracker

A full-stack **Expense Tracker** web application built with **FastAPI** on the backend and **React + Tailwind CSS** on the frontend. Users can sign up, log in, manage transactions, upload expense data, and view spending analytics on an interactive dashboard.

---

## ✨ Features

- 🔐 **User Authentication** — Secure Sign up and Log in
- 💳 **Transactions** — Add, view, and manage income/expense transactions
- 📤 **Upload** — Import expense data via file upload (CSV)
- 📊 **Analytics** — Visual breakdown of spending patterns
- 🏠 **Dashboard** — Overview of financial summary at a glance
- 🎨 **Responsive UI** — Built with Tailwind CSS for a clean, modern look

---

## 📁 Project Structure

```
EXPENSE-TRACKER/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── db.py             # Database connection setup
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── auth.py       # Auth routes (register, login)
│   │   │   ├── transactions.py # Transaction CRUD routes
│   │   │   ├── upload.py     # File upload routes
│   │   │   └── base.py       # Base/health check route
│   │   └── services/         # Business logic layer
│   ├── expense_tracker.db    # SQLite database
│   ├── requirements.txt      # Python dependencies
│   ├── import_check.py       # Dependency verification script
│   └── .env                  # Environment variables
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.js      # Main dashboard overview
    │   │   ├── Transactions.js   # Transactions list & management
    │   │   ├── Analytics.js      # Charts & spending analytics
    │   │   ├── Upload.js         # File upload page
    │   │   ├── Login.js          # Login page
    │   │   └── Signup.js         # Signup page
    │   ├── components/           # Reusable UI components
    │   ├── context/              # React context (global state/auth)
    │   ├── services/             # API call functions (Axios)
    │   ├── App.js                # App entry point & routing
    │   └── index.js              # React DOM render
    ├── tailwind.config.js        # Tailwind CSS configuration
    └── package.json              # Node dependencies
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI |
| Database | SQLite (via SQLAlchemy) |
| Auth | JWT Tokens |
| Frontend | React |
| Styling | Tailwind CSS |
| API Calls | Axios |
| Data Validation | Pydantic |

---

## ⚙️ Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+ and npm

---

### 🔧 Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv

   # On Windows
   .venv\Scripts\activate

   # On Mac/Linux
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your environment variables in `.env`:
   ```env
   SECRET_KEY=your_secret_key
   DATABASE_URL=sqlite:///./expense_tracker.db
   ```

5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The backend will run at `http://localhost:8000`.  
   Interactive API docs available at `http://localhost:8000/docs`.

---

### 🎨 Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will run at `http://localhost:3000`.

---

