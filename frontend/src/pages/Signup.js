import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signup({ email, password });
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Sign Up</h2>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Retype Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" required />
        </div>
        <button disabled={loading} type="submit" className="btn-primary w-full">{loading ? 'Creating account...' : 'Sign Up'}</button>
      </form>
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
      </div>
    </div>
  );
};

export default Signup;


