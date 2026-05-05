import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Code, Globe, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const response = await axios.post(`${baseUrl}/auth/login`, {
        email,
        password
      }, {
        headers: {
          'X-API-KEY': 'samindex_secret_key_2026'
        }
      });

      if (response.data.status === 'success') {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-[#020202] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-dark border border-white/5 rounded-[2.5rem] p-10 premium-shadow">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3 tracking-tight">Welcome Back</h2>
            <p className="text-white/40 text-sm">Sign in to continue your code intelligence journey</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-blue transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" size="sm" className="text-[10px] font-bold text-accent-blue hover:underline">Forgot password?</Link>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-blue transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-tighter flex items-center justify-center gap-2 mt-4 hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </motion.button>
          </form>

          <div className="relative my-10 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative px-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] bg-[#0d0d0d]">Or continue with</span>
          </div>

          <div className="flex justify-center">
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 border border-white/5 rounded-2xl text-sm font-bold bg-white/5 transition-all"
            >
              <Globe size={18} className="text-blue-400" />
              Continue with Google
            </motion.button>
          </div>

          <p className="text-center mt-10 text-xs text-white/30">
            Don't have an account? <Link to="/register" className="text-accent-blue font-bold hover:underline">Create one for free</Link>
          </p>

          <div className="mt-8 pt-8 border-t border-white/5">
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const guestUser = {
                  name: 'Anonymous Guest',
                  email: 'guest@samindex.ai',
                  avatar: 'https://ui-avatars.com/api/?name=Guest&background=333&color=fff',
                  isGuest: true
                };
                localStorage.setItem('user', JSON.stringify(guestUser));
                localStorage.setItem('token', 'guest-mode-active');
                navigate('/');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-all group"
            >
              <User size={14} className="group-hover:text-accent-blue transition-colors" />
              Continue as Guest
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
