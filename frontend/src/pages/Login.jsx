import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isPartner, setIsPartner] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        // Simple login for now. In real app, separate Partner/User logic might be needed
        // or handled via metadata in the user profile.
      const { error } = await signIn({ email, password });
      if (error) throw error;
      // Simple redirect based on local state (In real app check profile)
      if (isPartner) {
        navigate('/driver');
      } else {
        navigate('/');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
            <button 
                onClick={() => setIsPartner(false)}
                className={`px-4 py-2 rounded-l-lg ${!isPartner ? 'bg-black text-white' : 'bg-gray-200'}`}
            >
                User
            </button>
            <button 
                onClick={() => setIsPartner(true)}
                className={`px-4 py-2 rounded-r-lg ${isPartner ? 'bg-black text-white' : 'bg-gray-200'}`}
            >
                Partner
            </button>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2">
            {isPartner ? 'Partner Login' : 'User Login'}
        </h2>
        <div className="text-center mb-6">
            <button onClick={() => navigate('/admin')} className="text-xs text-gray-400 hover:text-gray-600">
                Go to Admin Panel
            </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
