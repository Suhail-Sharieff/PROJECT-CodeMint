// src/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Added Outlet
import { useAuth } from './context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

// --- Component and Page Imports ---
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SoloEditor from './components/SoloEditor';
import HostView from './pages/HostView';
import JoinView from './pages/JoineeView';
import HostTestView from './pages/HostTestView';
import JoineeTestView from './pages/JoineeTestView';
import MyTests from './pages/MyTests';
import TestDetailsPage from './pages/TestDetails';
import { useSocket } from './context/SocketContext';
import HostBattleView from './pages/HostBattleView';
import JoineeBattleView from './pages/JoineeBattleView';

// 1. Create the ProtectedRoute Component
// This checks if a user exists. If not, it kicks them to '/login'.
const ProtectedRoute = () => {
  const { user } = useAuth();
  const {socket}=useSocket()
  // If not logged in, redirect to login page
  if (!user || !socket) {
    return <Navigate to="/login" replace />;
  }

  // If logged in, render the child routes (The Outlet)
  return <Outlet />;
};

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
        {/* --- Public Routes --- */}
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

        {/* --- Protected Routes --- */}
        {/* Any route inside this wrapper is SECURE. You must be logged in to see them. */}
        <Route element={<ProtectedRoute />}>
           <Route path="/editor" element={<SoloEditor/>} />
           <Route path="/hostView/:session_id" element={<HostView />} />
           <Route path="/joinView/:session_id" element={<JoinView />} />
           <Route path="/hostTestView/:test_id" element={<HostTestView />} />
           <Route path="/joineeTestView/:test_id" element={<JoineeTestView />} />
           <Route path="/myTests" element={<MyTests />} />
           <Route path="/test-details/:test_id" element={<TestDetailsPage />} />
           <Route path="/hostBattleView/:session_id" element={<HostBattleView />} />
           <Route path="/joineeBattleView/:session_id" element={<JoineeBattleView />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;