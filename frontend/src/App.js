import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import HomePage from './pages/HomePage';
import MentorDashboard from './pages/MentorDashboard';
import LearnerPage from './pages/LearnerPage';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mentor/:sessionId" element={<MentorDashboard />} />
            <Route path="/learner/:sessionId" element={<LearnerPage />} />
          </Routes>
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
