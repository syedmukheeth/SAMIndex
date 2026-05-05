import React from 'react';
import { Menu, Search, LayoutGrid, Cpu, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [location]);

  const handleNavClick = (targetId, path) => {
    if (location.pathname !== path) {
      navigate(path);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 md:px-12 py-4 glass-dark backdrop-blur-2xl border-b border-white/5"
      >
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-black border border-white/10 overflow-hidden shadow-2xl group-hover:border-accent-blue/50 transition-all duration-300"
            >
              <img src="/logo.png" alt="SAMIndex Logo" className="w-full h-full object-cover" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter font-heading">
                <span className="text-white">SAM</span><span className="text-accent-blue">Index</span>
              </span>
              <span className="text-[10px] font-bold text-accent-blue/80 tracking-[0.2em] uppercase -mt-1">Code Intelligence</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
            <NavLink 
              icon={<Search size={14} />} 
              label="Search" 
              active={location.pathname === '/'} 
              onClick={() => handleNavClick('search-input', '/')}
            />
            <NavLink 
              icon={<Cpu size={14} />} 
              label="Index" 
              active={location.pathname === '/index'} 
              onClick={() => handleNavClick('index-input', '/')}
            />
            <NavLink 
              icon={<LayoutGrid size={14} />} 
              label="Explore" 
              active={searchParams.get('history') === 'true'} 
              onClick={() => handleNavClick('search-input', '/?history=true')}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4 bg-white/5 pl-4 pr-1.5 py-1.5 rounded-full border border-white/10 group">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-white group-hover:text-accent-blue transition-colors leading-none mb-1">{user.name}</span>
                  {user.isGuest && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-accent-blue/60 bg-accent-blue/10 px-1.5 py-0.5 rounded-full">Guest Mode</span>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-full overflow-hidden border border-white/20 relative group"
                >
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <X size={12} className="text-white" />
                  </div>
                </motion.button>
              </div>
            ) : (
              <>
                <motion.button 
                  whileHover={{ scale: 1.05, color: '#fff' }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-4 py-2"
                  onClick={handleLogin}
                >
                  Log in
                </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(255,255,255,0.3)' }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black text-xs font-black py-2.5 px-6 rounded-full hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:shadow-none uppercase tracking-tight"
                onClick={handleRegister}
              >
                Get Started
              </motion.button>
              </>
            )}
          </div>
          
          <button 
            className="lg:hidden p-2 text-white/70"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-[73px] left-0 right-0 z-[999] bg-black/95 backdrop-blur-3xl border-b border-white/10 overflow-hidden lg:hidden"
          >
            <div className="p-6 flex flex-col gap-4">
              <MobileNavLink label="Search" icon={<Search size={20} />} onClick={() => handleNavClick('search-input', '/')} />
              <MobileNavLink label="Index" icon={<Cpu size={20} />} onClick={() => handleNavClick('index-input', '/')} />
              <MobileNavLink label="Explore" icon={<LayoutGrid size={20} />} onClick={() => handleNavClick('search-input', '/?history=true')} />
              <div className="h-px bg-white/10 my-2" />
              {user ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 py-2">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-12 h-12 rounded-2xl border border-white/10" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
                    />
                    <div className="flex flex-col">
                      <span className="text-lg font-bold">{user.name}</span>
                      <span className="text-xs text-white/40">{user.email}</span>
                    </div>
                  </div>
                  <MobileNavLink label="Log out" onClick={handleLogout} />
                </div>
              ) : (
                <>
                  <MobileNavLink label="Log in" onClick={handleLogin} />
                  <button 
                    className="bg-white text-black font-bold py-4 rounded-2xl w-full text-center"
                    onClick={handleRegister}
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const NavLink = ({ icon, label, active = false, onClick }) => (
  <motion.div 
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
      active ? 'bg-white/10 text-white shadow-inner' : 'text-white/50 hover:text-white/80'
    }`}
  >
    {icon}
    {label}
  </motion.div>
);

const MobileNavLink = ({ label, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-4 text-xl font-bold text-white/70 hover:text-white py-2 w-full text-left"
  >
    {icon}
    {label}
  </button>
);

export default Navbar;
