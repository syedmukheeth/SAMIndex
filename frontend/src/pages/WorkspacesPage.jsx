import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Cpu, Book, ArrowLeft, Search, Globe, 
  ExternalLink, Calendar, Hash, Zap, Command 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIndexedRepos } from '../services/api';
import Skeleton from '../components/ui/Skeleton';

const WorkspacesPage = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await getIndexedRepos(200);
        // Filter to only show indexed repos and sort by newest
        const indexedOnly = response.data.repositories
          .filter(r => r.isIndexed)
          .sort((a, b) => new Date(b.lastIndexedAt) - new Date(a.lastIndexedAt));
        setRepos(indexedOnly);
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent-blue/30 overflow-x-hidden pt-24 pb-20">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/40 hover:text-accent-blue transition-colors group text-xs font-black uppercase tracking-widest"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Back to Neural Search
            </motion.button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                  <Database size={24} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">MongoDB Brain</h1>
              </div>
              <p className="text-white/30 text-lg max-w-2xl font-medium">
                The neural core containing all indexed codebases. Currently managing <span className="text-accent-blue font-black">{repos.length} established links</span>.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-4">
            <div className="px-6 py-4 glass-dark rounded-3xl border border-white/5 min-w-[140px]">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Total Assets</span>
               <span className="text-2xl font-black text-accent-blue">{repos.length}</span>
            </div>
            <div className="px-6 py-4 glass-dark rounded-3xl border border-white/5 min-w-[140px]">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Neural Status</span>
               <span className="text-2xl font-black text-emerald-400">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center glass-dark rounded-3xl px-6 py-4 border border-white/5 mb-12 group focus-within:border-accent-blue/30 transition-all shadow-2xl">
          <Search size={20} className="text-white/20 group-focus-within:text-accent-blue transition-colors" />
          <input 
            type="text" 
            placeholder="Search within the neural brain..." 
            className="bg-transparent border-none outline-none flex-1 px-4 text-white font-medium placeholder-white/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
             <Command size={12} className="text-white/20" />
             <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">Filter Node</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 glass-dark rounded-[2.5rem] border border-white/5 p-8 animate-pulse">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-white/5 rounded" />
                        <div className="h-3 w-1/2 bg-white/5 rounded" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="h-2 w-full bg-white/5 rounded" />
                      <div className="h-2 w-2/3 bg-white/5 rounded" />
                   </div>
                </div>
              ))
            ) : filteredRepos.length > 0 ? (
              filteredRepos.map((repo, idx) => (
                <motion.div
                  layout
                  key={repo.githubId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                  <div 
                    onClick={() => navigate(`/?owner=${repo.owner}&repo=${repo.name}`)}
                    className="cursor-pointer glass-dark rounded-[2.5rem] border border-white/5 p-8 h-full relative z-10 hover:border-accent-blue/30 transition-all premium-shadow flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:bg-accent-blue group-hover:text-white transition-all duration-500">
                          <Globe size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold truncate group-hover:text-accent-blue transition-colors">
                            {repo.name}
                          </h3>
                          <p className="text-xs text-white/30 font-medium truncate flex items-center gap-1">
                            {repo.owner}
                            <ExternalLink size={10} />
                          </p>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                    </div>

                    <p className="text-sm text-white/40 line-clamp-2 mb-8 flex-1 italic">
                      {repo.description || "Deep neural scan complete. Contextual relationships established for this code repository."}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1">
                          <Zap size={10} className="text-accent-purple" />
                          Health
                        </span>
                        <p className="text-xs font-bold text-white/80">99.8% Sync</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1">
                          <Calendar size={10} className="text-accent-blue" />
                          Last Scan
                        </span>
                        <p className="text-xs font-bold text-white/80">
                          {new Date(repo.lastIndexedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-lg">
                             <Hash size={10} />
                             {repo.lang || 'Generic'}
                          </div>
                       </div>
                       <motion.div 
                        whileHover={{ x: 5 }}
                        className="text-accent-blue text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                       >
                         Enter Workspace
                         <ArrowLeft size={12} className="rotate-180" />
                       </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-40 text-center glass-dark rounded-[3rem] border border-white/5 border-dashed">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Database size={32} className="text-white/20" />
                </div>
                <h3 className="text-2xl font-black mb-3">Neural Brain Empty</h3>
                <p className="text-white/30 max-w-xs mx-auto text-sm leading-relaxed mb-8">
                  No repositories matching "{searchQuery}" have been neural-linked yet.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await import('../services/api').then(m => m.claimOrphans());
                      window.location.reload();
                    } catch (err) {
                      console.error('Migration failed:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-8 py-3 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-black uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                >
                  Restore My Workspaces
                </motion.button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WorkspacesPage;
