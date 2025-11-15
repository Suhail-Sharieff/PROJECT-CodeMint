import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#0D1117]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_15px_rgba(52,211,153,0.4)] group-hover:shadow-[0_0_25px_rgba(52,211,153,0.6)] transition-all duration-300">
            <span className="text-[#0D1117] font-bold font-mono text-lg">{`{}`}</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">CodeMint</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/features" className="text-sm font-medium text-gray-400 hover:text-emerald-400 transition-colors">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-400 hover:text-emerald-400 transition-colors">Pricing</Link>
          <Link to="/docs" className="text-sm font-medium text-gray-400 hover:text-emerald-400 transition-colors">Docs</Link>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
               <span className="hidden sm:block text-sm text-gray-400">Hi, <span className="text-emerald-400">{user.name}</span></span>
               <button 
                 onClick={handleLogout}
                 className="text-sm text-gray-400 hover:text-white transition-colors"
               >
                 Sign out
               </button>
               <Link 
                 to="/editor" // Or dashboard
                 className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-all border border-gray-700"
               >
                 Go to Editor
               </Link>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0D1117] text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;