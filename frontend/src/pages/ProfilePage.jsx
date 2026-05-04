import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import RepoCard from '../components/results/RepoCard';
import Skeleton from '../components/ui/Skeleton';
import { ChevronLeft, Users, Briefcase, MapPin, Globe, Star, ArrowRight, Sparkles } from 'lucide-react';
import { getUserDetails } from '../services/api';
import { motion } from 'framer-motion';

const ProfilePage = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getUserDetails(username);
        setData(result.data);
      } catch (err) {
        setError(err.response?.data?.message || "User not found.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 pt-24 px-6">
        <div className="max-w-6xl mx-auto py-8">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/4 space-y-6">
              <Skeleton className="w-full aspect-square rounded-3xl bg-white/5" />
              <Skeleton className="h-8 w-full bg-white/5" />
              <Skeleton className="h-4 w-2/3 bg-white/5" />
            </div>
            <div className="flex-1 space-y-6">
              <Skeleton className="h-12 w-1/4 bg-white/5" />
              <div className="grid grid-cols-1 gap-6">
                <Skeleton className="h-40 w-full rounded-3xl bg-white/5" />
                <Skeleton className="h-40 w-full rounded-3xl bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-obsidian-950 pt-24 px-6">
        <div className="max-w-6xl mx-auto py-20 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass p-12 rounded-[3rem] inline-block"
          >
            <h2 className="text-4xl font-black mb-6 text-gradient">{error}</h2>
            <Link to="/" className="text-accent-blue hover:text-white transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs">
              <ChevronLeft size={16} /> Back to Search
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const { user, repositories } = data;

  return (
    <div className="min-h-screen bg-obsidian-950 text-white selection:bg-accent-blue/30 pt-24 pb-20 px-6">
       {/* Mesh Background */}
       <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 mesh-bg animate-mesh"></div>
       </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link to="/" className="text-white/40 hover:text-white flex items-center gap-2 mb-12 text-xs font-black uppercase tracking-widest transition-all">
            <ChevronLeft size={14} /> Back to neural index
          </Link>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-16">
          {/* Sidebar: User Info */}
          <aside className="w-full md:w-1/4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-accent-blue/40 to-accent-purple/40 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="relative w-full aspect-square rounded-[2.5rem] border border-white/10 mb-8 shadow-2xl object-cover"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-black tracking-tighter mb-2 font-heading"
            >
              {user.username}
            </motion.h1>
            <p className="text-accent-blue font-mono text-sm mb-6">@{user.username.toLowerCase()}</p>
            
            <p className="text-white/60 mb-8 leading-relaxed font-medium">{user.bio || "Bio is encrypted."}</p>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-6 glass border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest mb-10 hover:bg-white/5 transition-all"
            >
              Follow Developer
            </motion.button>

            <div className="space-y-6 text-xs font-bold uppercase tracking-[0.15em] text-white/40">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <Users size={18} className="text-accent-blue" />
                <div className="flex flex-col">
                   <span className="text-white text-sm">{user.followers.toLocaleString()}</span>
                   <span className="text-[9px]">Followers</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5">
                <Briefcase size={18} className="text-accent-purple" />
                <div className="flex flex-col">
                   <span className="text-white text-sm">{user.publicRepos}</span>
                   <span className="text-[9px]">Repositories</span>
                </div>
              </div>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="accent-gradient p-5 rounded-2xl shadow-xl flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-white text-xl font-black font-heading">{user.score.toFixed(1)}</span>
                  <span className="text-[9px] text-white/80">SAMIndex Score</span>
                </div>
                <Sparkles className="text-white/50" />
              </motion.div>
            </div>
          </aside>

          {/* Main Content: Repositories */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-10 border-b border-white/5">
              <nav className="flex gap-12">
                <button className="pb-6 border-b-2 border-accent-blue text-white text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  Indexed Projects
                  <span className="px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-[10px]">{repositories.length}</span>
                </button>
                <button className="pb-6 text-white/30 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Analytics</button>
                <button className="pb-6 text-white/30 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Contributions</button>
              </nav>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {repositories.map((repo, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={repo.githubId}
                >
                  <RepoCard repo={repo} />
                </motion.div>
              ))}
              {repositories.length === 0 && (
                <div className="text-center py-32 glass border-dashed border-white/10 rounded-[3rem] text-white/20 font-black uppercase tracking-widest text-xs">
                  Zero repositories indexed for this profile.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
