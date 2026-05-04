import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import CodeSearchPage from './pages/CodeSearchPage';

function App() {
  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<CodeSearchPage />} />
          <Route path="/code" element={<CodeSearchPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
