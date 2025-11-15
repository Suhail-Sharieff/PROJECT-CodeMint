// src/components/Navbar.jsx - UPDATED FOR HERO SECTION NAVIGATION

import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Function to handle navigation to sections
  const handleSectionNavigation = (sectionId) => {
    // If we're not on the home page, navigate there first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait a moment for navigation to complete then scroll to section
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // If we're already on home page, just scroll to section
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Close mobile menu if open
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 shadow-lg backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <RouterLink to="/" className="flex items-center space-x-2 flex-shrink-0 group">
            <div className="flex items-center justify-center w-13 h-13  rounded-full shadow-md group-hover:shadow-lg transition-all duration-300">
              <img 
                src="/logo.png" 
                alt="Crystl Logo" 
                className="w-13 h-13 object-contain"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-white font-bold text-lg">C</div>
            </div>
            <h1 className="text-2xl font-bold text-[#0B95D6] group-hover:text-[#0A7BB8] transition-colors duration-300">Crystl</h1>
          </RouterLink>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => handleSectionNavigation('hero')}
              className="text-gray-700 hover:text-[#0B95D6] px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 ml-2"
            >
              Home
            </button>
            <button
              onClick={() => handleSectionNavigation('features')}
              className="text-gray-700 hover:text-[#0B95D6] px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 ml-2"
            >
              Features
            </button>
            <button
              onClick={() => handleSectionNavigation('contact')}
              className="text-gray-700 hover:text-[#0B95D6] px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 ml-2"
            >
              Contact
            </button>
          </div>

          {/* Action Buttons */}
<div className="hidden md:flex items-center space-x-3">
  {user ? (
    <>
      {/* Welcome Card */}
      <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-400/20">
        <p className="text-md text-black">
          Welcome, <span className="font-semibold">{user.name}</span>
        </p>
      </div>
    
      <button 
        onClick={handleLogout} 
        className="text-gray-600 hover:text-[#0B95D6] px-4 py-2 text-sm font-medium transition-colors duration-300 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <RouterLink 
        to="/login" 
        className="text-gray-600 hover:text-[#0B95D6] px-4 py-2 text-sm font-medium transition-colors duration-300 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50"
      >
        Log In
      </RouterLink>
      <RouterLink 
        to="/register" 
        className="bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300"
      >
        Sign Up
      </RouterLink>
    </>
  )}
</div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-[#0B95D6] focus:outline-none focus:text-[#0B95D6] p-2 rounded-lg hover:bg-blue-50"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white rounded-lg shadow-lg mt-2 py-3 border border-gray-100">
            <div className="flex flex-col space-y-2 px-4">
              <button
                onClick={() => handleSectionNavigation('hero')}
                className="text-gray-700 hover:text-[#0B95D6] px-4 py-3 text-base font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 text-left"
              >
                Home
              </button>
              <button
                onClick={() => handleSectionNavigation('features')}
                className="text-gray-700 hover:text-[#0B95D6] px-4 py-3 text-base font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 text-left"
              >
                Features
              </button>
              <button
                onClick={() => handleSectionNavigation('contact')}
                className="text-gray-700 hover:text-[#0B95D6] px-4 py-3 text-base font-medium transition-colors duration-300 rounded-lg hover:bg-blue-50 text-left"
              >
                Contact
              </button>
              
              <div className="border-t border-gray-200 my-2"></div>
              
              {user ? (
                <>
                  <RouterLink 
                    to="/dashboard" 
                    className="bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] text-white px-4 py-3 rounded-lg text-base font-medium text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard ({user.name})
                  </RouterLink>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }} 
                    className="text-gray-700 hover:text-[#0B95D6] px-4 py-3 text-base font-medium transition-colors duration-300 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <RouterLink 
                    to="/login" 
                    className="text-gray-700 hover:text-[#0B95D6] px-4 py-3 text-base font-medium transition-colors duration-300 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50 text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log In
                  </RouterLink>
                  <RouterLink 
                    to="/register" 
                    className="bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] text-white px-4 py-3 rounded-lg text-base font-medium text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </RouterLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;