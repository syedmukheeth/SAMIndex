import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import CodeSearchPage from './pages/CodeSearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<CodeSearchPage />} />
          <Route path="/code" element={<CodeSearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
