import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [mobile, setMobile] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('user'); // 'user' or 'partner'
  const navigate = useNavigate();
  const { loginUser, signupUser, loginPartner } = useAuth();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'user') {
        if (isSignUp) {
          const data = await signupUser(mobile, password);
          alert('Signup Successful!');
          navigate('/');
        } else {
          const data = await loginUser(mobile, password);
          navigate('/');
        }
      } else {
        // Partner Login
        const data = await loginPartner(partnerId, password);
        navigate('/driver');
      }
    } catch (error) {
      console.error("Auth Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-black mb-2 text-center">PanVel</h1>
        <p className="text-gray-500 text-center mb-8">Ride your way.</p>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'user' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                onClick={() => { setRole('user'); setIsSignUp(false); }}
            >
                User
            </button>
            <button 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'partner' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                onClick={() => { setRole('partner'); setIsSignUp(false); }}
            >
                Partner
            </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* USER: Mobile Field */}
          {role === 'user' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number</label>
              <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      +91
                  </span>
                  <input
                      type="tel"
                      className="flex-1 block w-full rounded-r-lg border-gray-300 shadow-sm focus:border-black focus:ring-black p-3 border"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      pattern="[0-9]{10}"
                      title="Please enter a valid 10-digit mobile number"
                  />
              </div>
            </div>
          )}

          {/* PARTNER: ID Field */}
          {role === 'partner' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Partner ID</label>
              <input
                  type="text"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black p-3 border"
                  placeholder="12-digit Partner ID"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  required
              />
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
            <input
              type="password"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black p-3 border"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center">
            {role === 'user' && (
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-gray-600 hover:text-black font-medium"
                >
                    {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                </button>
            )}
            {role === 'partner' && (
                <p className="text-xs text-gray-500 mt-2">Partners must contact Admin to get an ID.</p>
            )}
        </div>

        <div className="mt-4 text-center">
             <button onClick={() => navigate('/admin')} className="text-xs text-gray-400 hover:text-gray-600">
                Admin Panel
            </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
