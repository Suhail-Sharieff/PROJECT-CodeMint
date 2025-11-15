import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  const handleExploreInstitutions = () => {
    navigate('/institutions');
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Improved Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        ></div>
        {/* Enhanced Gradient Overlay - preserves top brightness, fades to white at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/95"></div>
        {/* Additional subtle gradient for visual interest */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-amber-400/10"></div>
      </div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center z-10 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight">
            See where public funds go with{' '}
            <span className="text-[#0B95D6] bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] bg-clip-text text-transparent">
              complete transparency
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white mb-5 max-w-3xl mx-auto leading-relaxed font-medium">
            Track, analyze, and understand how public institutions manage their finances. 
            Get real-time insights into budget allocations and spending patterns.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <button 
              onClick={handleExploreInstitutions}
              className="relative bg-gradient-to-r from-[#0B95D6] to-[#0A7BB8] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all duration-300 shadow-lg group overflow-hidden"
            >
              <span className="relative z-10">Explore Institutions</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A7BB8] to-[#0B95D6] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <RouterLink 
              to="/login" 
              className="relative bg-white text-[#0B95D6] px-8 py-4 rounded-xl text-lg font-semibold border-2 border-[#0B95D6] hover:bg-[#0B95D6] hover:text-white transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group overflow-hidden"
            >
              <span className="relative z-10">Sign in</span>
              <div className="absolute inset-0 bg-[#0B95D6] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </RouterLink>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl font-bold text-[#0B95D6] mb-2">500+</div>
              <div className="text-gray-700 font-medium">Public Institutions</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl font-bold text-[#0B95D6] mb-2">$10B+</div>
              <div className="text-gray-700 font-medium">Funds Tracked</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl font-bold text-[#0B95D6] mb-2">24/7</div>
              <div className="text-gray-700 font-medium">Real-time Updates</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator - positioned to avoid overlap */}
      <div className="absolute bottom-6 left-1/2 mt-3 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <svg className="w-8 h-8 text-[#0B95D6] rounded-full p-0.5 " fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;