import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ExpenseProvider } from './context/ExpenseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : element;
};

function App() {
  return (
    <AuthProvider>
      <ExpenseProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<div className="pl-64 py-8"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><Login /></div></div>} />
            <Route path="/signup" element={<div className="pl-64 py-8"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><Signup /></div></div>} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/upload" element={<Layout><Upload /></Layout>} />
            <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
            <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
          </Routes>
        </Router>
      </ExpenseProvider>
    </AuthProvider>
  );
}

export default App;
