import React from 'react';
import { GitBranch, Terminal, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-4 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] sticky top-0 z-[100] text-[#c9d1d9]">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group transition-all">
          <div className="p-1.5 rounded-lg bg-blue-600 group-hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <GitBranch size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white hidden sm:block">SamIndex</h1>
        </Link>
        <div className="h-6 w-[1px] bg-[#30363d] mx-2 hidden md:block"></div>
        <div className="hidden md:flex gap-6">
          <Link to="/" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <Terminal size={14} />
            Code Search
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-6">
          <button className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Sign in</button>
          <button className="bg-white text-black text-[10px] font-black py-2 px-5 rounded-full hover:bg-gray-200 transition-all shadow-lg active:scale-95 uppercase tracking-tighter">Sign up</button>
        </div>
        <Menu className="md:hidden text-gray-400" size={24} />
      </div>
    </nav>
  );
};

export default Navbar;
