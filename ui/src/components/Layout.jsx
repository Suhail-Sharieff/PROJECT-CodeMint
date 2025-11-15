import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {/* Minimal Footer */}
      <footer className="border-t border-gray-800 bg-[#161B22] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-[#0D1117] font-bold font-mono text-xs">{`{}`}</span>
            </div>
            <span className="text-gray-400 font-semibold">CodeMint</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Github</a>
          </div>
          <div className="text-xs text-gray-600 mt-4 md:mt-0">
            © 2024 CodeMint Inc.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;