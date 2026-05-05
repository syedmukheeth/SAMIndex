import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const response = await axios.post(`${baseUrl}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      }, {
        headers: {
          'X-API-KEY': 'samindex_secret_key_2026'
        }
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-dark border border-white/5 rounded-[2.5rem] p-10 premium-shadow">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3 tracking-tight">Create Account</h2>
            <p className="text-white/40 text-sm">Join the next generation of code intelligence</p>
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

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400 text-sm"
            >
              <CheckCircle2 size={18} />
              Account created successfully! Redirecting...
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-blue transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-blue transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-blue transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-2 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Confirm</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.08] transition-all"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || success}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-tighter flex items-center justify-center gap-2 mt-6 hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Get Started'}
              {!loading && !success && <ArrowRight size={18} />}
            </motion.button>
          </form>

          <div className="relative my-10 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative px-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] bg-[#0d0d0d]">Or join with</span>
          </div>

          <motion.button 
            whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.08)' }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 border border-white/5 rounded-2xl text-sm font-bold bg-white/5 transition-all"
          >
            <Globe size={18} className="text-blue-400" />
            Continue with Google
          </motion.button>

          <p className="text-center mt-10 text-xs text-white/30">
            Already have an account? <Link to="/login" className="text-accent-blue font-bold hover:underline">Sign in instead</Link>
          </p>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <Link 
              to="/" 
              className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              Continue as Guest
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
