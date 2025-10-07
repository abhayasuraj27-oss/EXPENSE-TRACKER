import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { expenseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ExpenseContext = createContext();

const initialState = {
  transactions: [],
  uploads: [], // [{ name, status, error? }]
  deletedTransactions: [], // session-only cache of deleted DB items
  analytics: {
    weekly: null,
    monthly: null,
    categories: null,
    calendar: null,
    summary: null
  },
  loading: false,
  error: null,
  selectedTransactions: [],
  committedTransactions: [],
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear()
};

function expenseReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, loading: false };
    case 'ADD_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.payload] };
    case 'SET_ANALYTICS':
      return { ...state, analytics: { ...state.analytics, ...action.payload } };
    case 'ADD_UPLOAD_ITEMS':
      return { ...state, uploads: [...state.uploads, ...action.payload] };
    case 'UPDATE_UPLOAD_ITEM': {
      const { index, updates } = action.payload;
      return {
        ...state,
        uploads: state.uploads.map((u, i) => (i === index ? { ...u, ...updates } : u))
      };
    }
    case 'CLEAR_UPLOADS':
      return { ...state, uploads: [] };
    case 'ADD_DELETED_TRANSACTIONS':
      return { ...state, deletedTransactions: [...(state.deletedTransactions || []), ...action.payload] };
    case 'REMOVE_DELETED_TRANSACTION': {
      const { index } = action.payload;
      const list = state.deletedTransactions || [];
      return { ...state, deletedTransactions: list.filter((_, i) => i !== index) };
    }
    case 'CLEAR_DELETED_TRANSACTIONS':
      return { ...state, deletedTransactions: [] };
    case 'SET_SELECTED_TRANSACTIONS':
      return { ...state, selectedTransactions: action.payload };
    case 'TOGGLE_SELECTED_TRANSACTION': {
      const getKey = (x) => (x && (x.id ?? `${x.date}|${x.description}|${x.amount}`));
      const targetKey = getKey(action.payload);
      const exists = state.selectedTransactions.find((t) => getKey(t) === targetKey);
      const next = exists
        ? state.selectedTransactions.filter((t) => getKey(t) !== targetKey)
        : [...state.selectedTransactions, action.payload];
      return { ...state, selectedTransactions: next };
    }
    case 'CLEAR_SELECTED_TRANSACTIONS':
      return { ...state, selectedTransactions: [] };
    case 'COMMIT_SELECTED_TRANSACTIONS':
      return { ...state, committedTransactions: action.payload, selectedTransactions: [] };
    case 'SET_CALENDAR_MONTH':
      return { ...state, currentMonth: action.payload.month, currentYear: action.payload.year };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function ExpenseProvider({ children }) {
  const [state, dispatch] = useReducer(expenseReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Do not auto-load from DB on login; session starts empty until user uploads
  const AUTO_LOAD_ON_LOGIN = false;

  const loadTransactions = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await expenseAPI.getTransactions();
      dispatch({ type: 'SET_TRANSACTIONS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const loadAnalytics = async () => {
    try {
      const [weekly, monthly, categories, summary] = await Promise.all([
        expenseAPI.getWeeklyAnalytics(),
        expenseAPI.getMonthlyAnalytics(),
        expenseAPI.getCategoryAnalytics(),
        expenseAPI.getSpendingSummary()
      ]);
      
      dispatch({
        type: 'SET_ANALYTICS',
        payload: {
          weekly: weekly.data,
          monthly: monthly.data,
          categories: categories.data,
          summary: summary.data
        }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const loadCalendarData = async (year, month) => {
    try {
      const response = await expenseAPI.getCalendarData(year, month);
      dispatch({
        type: 'SET_ANALYTICS',
        payload: { calendar: response.data }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const saveTransactions = async (transactions) => {
    try {
      const response = await expenseAPI.saveTransactions(transactions);
      dispatch({ type: 'ADD_TRANSACTIONS', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const clearAllTransactions = async () => {
    try {
      await expenseAPI.deleteAllTransactions();
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
      dispatch({ type: 'COMMIT_SELECTED_TRANSACTIONS', payload: [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const uploadFile = async (file) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await expenseAPI.uploadFile(file);
      dispatch({ type: 'SET_LOADING', payload: false });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const toggleMyItem = useCallback((transaction) => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stored = localStorage.getItem('myItemsPeriod');
    if (stored !== period) {
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
      localStorage.setItem('myItemsPeriod', period);
    }
    dispatch({ type: 'TOGGLE_SELECTED_TRANSACTION', payload: transaction });
  }, []);

  const clearMyItems = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
  }, []);

  const commitMyItems = useCallback(async () => {
    // Persist ALL selected items, then refresh from DB
    const itemsToSave = state.selectedTransactions;

    if (itemsToSave.length === 0) {
      dispatch({ type: 'COMMIT_SELECTED_TRANSACTIONS', payload: [] });
      return;
    }

    try {
      await expenseAPI.saveTransactions(itemsToSave);
      // Mark committed in local state for display
      dispatch({ type: 'COMMIT_SELECTED_TRANSACTIONS', payload: itemsToSave });
      // Optionally refresh analytics only; do not repopulate transactions list
      await loadAnalytics();
      // Remove committed items from the session transactions list
      const keyOf = (t) => `${t.date}|${t.description}|${t.amount}`;
      const committedKeys = new Set(itemsToSave.map(keyOf));
      const remaining = state.transactions.filter((t) => !committedKeys.has(keyOf(t)));
      dispatch({ type: 'SET_TRANSACTIONS', payload: remaining });
      // Clear selections after successful save
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e?.message || 'Failed to save selected items' });
      throw e;
    }
  }, [state.selectedTransactions]);

  const myItemsThisMonthTotal = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return state.committedTransactions
      .filter((t) => {
        if (!t.date) return false;
        // Expecting YYYY-MM-DD
        const [y, m] = String(t.date).split('-').map((v) => parseInt(v, 10));
        return y === year && m === month;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [state.committedTransactions]);

  useEffect(() => {
    if (isAuthenticated && AUTO_LOAD_ON_LOGIN) {
      loadTransactions();
      loadAnalytics();
    }
  }, [isAuthenticated]);

  // Always clear in-memory session data on logout
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
      dispatch({ type: 'COMMIT_SELECTED_TRANSACTIONS', payload: [] });
      dispatch({ type: 'CLEAR_UPLOADS' });
      dispatch({ type: 'CLEAR_DELETED_TRANSACTIONS' });
      dispatch({ type: 'SET_ANALYTICS', payload: { weekly: null, monthly: null, categories: null, calendar: null, summary: null } });
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [isAuthenticated]);

  // Clear selections when the month changes and set current period marker
  useEffect(() => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stored = localStorage.getItem('myItemsPeriod');
    if (stored !== period) {
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
      localStorage.setItem('myItemsPeriod', period);
    }
  }, []);

  const value = {
    ...state,
    loadTransactions,
    loadAnalytics,
    loadCalendarData,
    saveTransactions,
    uploadFile,
    dispatch,
    // upload status helpers
    addUploadItems: (items) => dispatch({ type: 'ADD_UPLOAD_ITEMS', payload: items }),
    updateUploadItem: (index, updates) => dispatch({ type: 'UPDATE_UPLOAD_ITEM', payload: { index, updates } }),
    setTransactions: (list) => dispatch({ type: 'SET_TRANSACTIONS', payload: list }),
    addDeletedTransactions: (items) => dispatch({ type: 'ADD_DELETED_TRANSACTIONS', payload: items }),
    removeDeletedTransaction: (index) => dispatch({ type: 'REMOVE_DELETED_TRANSACTION', payload: { index } }),
    toggleMyItem,
    clearMyItems,
    commitMyItems,
    myItemsThisMonthTotal,
    clearAllTransactions
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
}
