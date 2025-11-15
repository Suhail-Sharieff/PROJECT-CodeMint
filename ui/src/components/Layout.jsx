// src/components/Layout.jsx - UPDATED with Footer

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer'; // <-- 1. Import the Footer

const Layout = () => {
  return (
    // 2. This flexbox structure is key to a sticky footer
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* 3. The `flex-grow` class makes this main section expand to fill available space */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <Footer /> {/* 4. Add the Footer at the end */}
    </div>
  );
};

export default Layout;