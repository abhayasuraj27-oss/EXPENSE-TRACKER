import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { expenseAPI } from '../services/api';

const ExpenseContext = createContext();

const initialState = {
  transactions: [],
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
    case 'SET_SELECTED_TRANSACTIONS':
      return { ...state, selectedTransactions: action.payload };
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

  useEffect(() => {
    loadTransactions();
    loadAnalytics();
  }, []);

  const value = {
    ...state,
    loadTransactions,
    loadAnalytics,
    loadCalendarData,
    saveTransactions,
    uploadFile,
    dispatch
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
