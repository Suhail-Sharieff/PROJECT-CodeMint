// src/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

// --- Component and Page Imports ---
import Layout from './components/Layout';
import Navbar from './components/Navbar'; // <--- ADDED THIS IMPORT
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CodeEditor from './pages/CodeEditor'; // Ensure this path matches where you saved CodeEditor
import TempEditor from './pages/TempEditor';
import HostView from './pages/HostView';
import JoinView from './pages/JoineeView';
import SoloEditor from './components/SoloEditor';
import HostTestView from './pages/HostTestView';
import JoineeTestView from './pages/JoineeTestView';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public/Marketing Pages (Wrapped in standard Layout with Footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" replace /> : <RegisterPage />} 
          />
        </Route>

       <Route path="/editor" element={<SoloEditor/>} />
       <Route path="/hostView/:session_id" element={<HostView />} />
       <Route path="/joinView/:session_id" element={<JoinView />} />
       <Route path="/hostTestView/:test_id" element={<HostTestView />} />
          <Route path="/joineeTestView/:test_id" element={<JoineeTestView />} />
          
        
      </Routes>
    </Router>
  );
}

export default App;