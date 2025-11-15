// src/pages/RegisterPage.jsx (Enhanced with Tailwind CSS)

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const user = await register(role, { name, email, password });

      switch (user.role) {
        case 'Institution':
          navigate('/dashboard/institution');
          break;
        case 'Department':
          navigate('/dashboard/department');
          break;
        case 'User':
          navigate('/dashboard/user');
          break;
        default:
          navigate('/');
          break;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleButtonStyle = (buttonRole) => {
    return role === buttonRole
      ? 'bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] text-white shadow-lg'
      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#0B95D6]/10 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute top-40 -left-20 w-72 h-72 bg-[#F4B400]/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Create an Account
        </h1>
        <p className="text-center text-gray-600 mb-8">Join Crystl and start tracking funds today</p>

        {/* Role Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-8 gap-2">
          {['user', 'department', 'institution'].map((roleOption) => (
            <button 
              key={roleOption}
              onClick={() => setRole(roleOption)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 capitalize ${getRoleButtonStyle(roleOption)}`}
            >
              {roleOption}
            </button>
          ))}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 ml-1">Name / Organization Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B95D6] focus:border-transparent transition-all duration-300"
              placeholder="Enter your name or organization name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 ml-1">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B95D6] focus:border-transparent transition-all duration-300"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 ml-1">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B95D6] focus:border-transparent transition-all duration-300 pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 mr-1.5 flex items-center justify-center w-8 h-8 my-auto rounded-full hover:bg-gray-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5 text-gray-500 relative left-1.5" />
                ) : (
                  <FaEye className="h-5 w-5 text-gray-500 relative left-1.5" />
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center animate-shake">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] hover:from-[#0A7BB8] hover:to-[#0B95D6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B95D6] disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <RouterLink 
              to="/login" 
              className="font-medium text-[#0B95D6] hover:text-[#0A7BB8] transition-colors duration-300"
            >
              Sign In
            </RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;