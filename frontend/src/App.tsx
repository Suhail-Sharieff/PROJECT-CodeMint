import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import TeacherDashboard from './components/TeacherDashboard';
import JoinSession from './components/JoinSession';
import StudentView from './components/StudentView';
import { E } from './components/Test/_05_useCallback';
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<E/>} />
          
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/teacher/:sessionId" element={<TeacherDashboard />} />
          <Route path="/student/:sessionId" element={<StudentView />} />
          <Route path="/join/:sessionId" element={<JoinSession />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;