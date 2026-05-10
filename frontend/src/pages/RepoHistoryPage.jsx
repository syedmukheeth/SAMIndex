import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Cpu, Book, ArrowLeft, Search, Globe, 
  ExternalLink, Calendar, Hash, Zap, Command 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIndexedRepos } from '../services/api';
import Skeleton from '../components/ui/Skeleton';

const RepoHistoryPage = () => {
  const [repos, setRepos] = useState([]);
  const [directRepos, setDirectRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        // Fetch Permanent Repos
        const response = await getIndexedRepos(200);
        const indexedOnly = response.data.repositories
          .filter(r => r.isIndexed)
          .sort((a, b) => new Date(b.lastIndexedAt) - new Date(a.lastIndexedAt));
        setRepos(indexedOnly);

        // Fetch Direct Repos from LocalStorage
        const savedDirect = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
        setDirectRepos(savedDirect);
      } catch (err) {
        console.error('Failed to fetch repos:', err);
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

  const filteredDirect = directRepos.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRepoCard = (repo, isEphemeral = false) => (
    <motion.div
      layout
      key={isEphemeral ? `dir-${repo.owner}-${repo.name}` : repo.githubId}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${isEphemeral ? 'from-accent-cyan/10' : 'from-accent-blue/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]`} />
      <div 
        onClick={() => {
          if (isEphemeral) {
            navigate(`/?owner=${repo.owner}&repo=${repo.name}&mode=ephemeral&sid=${repo.owner.toLowerCase()}:${repo.name.toLowerCase()}`);
          } else {
            navigate(`/?owner=${repo.owner}&repo=${repo.name}`);
          }
        }}
        className={`cursor-pointer glass-dark rounded-[2.5rem] border border-white/5 p-8 h-full relative z-10 hover:border-${isEphemeral ? 'accent-cyan' : 'accent-blue'}/30 transition-all premium-shadow flex flex-col overflow-hidden`}
      >
        {isEphemeral && <div className="absolute top-0 right-0 w-24 h-24 bg-accent-cyan/5 blur-2xl rounded-full translate-x-12 -translate-y-12" />}
        
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isEphemeral ? 'bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan group-hover:text-black' : 'bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue group-hover:text-white'}`}>
              {isEphemeral ? <Zap size={24} /> : <Globe size={24} />}
            </div>
            <div className="min-w-0">
              <h3 className={`text-xl font-bold truncate transition-colors ${isEphemeral ? 'group-hover:text-accent-cyan' : 'group-hover:text-accent-blue'}`}>
                {repo.name}
              </h3>
              <p className="text-xs text-white/30 font-medium truncate flex items-center gap-1">
                {repo.owner}
                <ExternalLink size={10} />
              </p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${isEphemeral ? 'bg-accent-cyan animate-pulse shadow-[0_0_15px_rgba(0,242,255,0.5)]' : 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'}`} />
        </div>

        <p className={`text-sm ${repo.description ? 'text-white/60' : 'text-white/40'} line-clamp-2 mb-8 flex-1 italic leading-relaxed`}>
          {isEphemeral ? "Transient session active. Instant retrieval enabled for this workspace." : (repo.description ? `"${repo.description}"` : "Repository scan complete. Contextual relationships established for this codebase.")}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1">
              <Zap size={10} className={isEphemeral ? 'text-accent-cyan' : 'text-accent-purple'} />
              {isEphemeral ? 'Status' : 'Health'}
            </span>
            <p className={`text-xs font-bold ${isEphemeral ? 'text-accent-cyan' : 'text-white/80'}`}>{isEphemeral ? 'EPHEMERAL' : '99.8% Sync'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1">
              <Calendar size={10} className="text-accent-blue" />
              Accessed
            </span>
            <p className="text-xs font-bold text-white/80">
              {new Date(isEphemeral ? repo.lastAccessed : repo.lastIndexedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isEphemeral ? 'bg-accent-cyan/10 text-accent-cyan' : 'bg-white/5 text-white/30'}`}>
                 {isEphemeral ? <Zap size={10} /> : <Hash size={10} />}
                 {isEphemeral ? 'DIRECT' : (repo.lang || 'Generic')}
              </div>
           </div>
           <motion.div 
            whileHover={{ x: 5 }}
            className={`${isEphemeral ? 'text-accent-cyan' : 'text-accent-blue'} text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}
           >
             Enter Workspace
             <ArrowLeft size={12} className="rotate-180" />
           </motion.div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent-blue/30 overflow-x-hidden pt-24 pb-20">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/40 hover:text-accent-blue transition-colors group text-xs font-black uppercase tracking-widest"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Back to Search
            </motion.button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                  <Database size={24} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">Management</h1>
              </div>
              <p className="text-white/30 text-lg max-w-2xl font-medium">
                Unified repository control. Currently managing <span className="text-accent-blue font-black">{repos.length + directRepos.length} neural links</span>.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-6 py-4 glass-dark rounded-3xl border border-white/5 min-w-[140px]">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Permanent</span>
               <span className="text-2xl font-black text-accent-blue">{repos.length}</span>
            </div>
            <div className="px-6 py-4 glass-dark rounded-3xl border border-white/5 min-w-[140px]">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Direct</span>
               <span className="text-2xl font-black text-accent-cyan">{directRepos.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center glass-dark rounded-3xl px-6 py-4 border border-white/5 mb-12 group focus-within:border-accent-blue/30 transition-all shadow-2xl">
          <Search size={20} className="text-white/20 group-focus-within:text-accent-blue transition-colors" />
          <input 
            type="text" 
            placeholder="Search within your unified history..." 
            className="bg-transparent border-none outline-none flex-1 px-4 text-white font-medium placeholder-white/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-20">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
             </div>
          ) : (
            <>
              {/* Section 1: Neural Stream (Direct) */}
              {(filteredDirect.length > 0 || !searchQuery) && (
                <div className="space-y-8">
                   <div className="flex items-center gap-3 px-2">
                      <div className="p-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan">
                        <Zap size={14} className="animate-pulse" />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-cyan">Neural Stream</h4>
                   </div>
                   {filteredDirect.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDirect.map(repo => renderRepoCard(repo, true))}
                     </div>
                   ) : (
                     <div className="py-12 text-center glass-dark rounded-3xl border border-white/5 border-dashed">
                        <p className="text-[10px] text-white/20 uppercase font-black">No Active Direct Sessions</p>
                     </div>
                   )}
                </div>
              )}

              {/* Section 2: Knowledge Vault (Permanent) */}
              {(filteredRepos.length > 0 || !searchQuery) && (
                <div className="space-y-8">
                   <div className="flex items-center gap-3 px-2">
                      <div className="p-1.5 rounded-lg bg-accent-blue/10 text-accent-blue">
                        <Database size={14} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">Knowledge Vault</h4>
                   </div>
                   {filteredRepos.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRepos.map(repo => renderRepoCard(repo, false))}
                     </div>
                   ) : (
                     <div className="py-12 text-center glass-dark rounded-3xl border border-white/5 border-dashed">
                        <p className="text-[10px] text-white/20 uppercase font-black">No Permanent Indices Found</p>
                     </div>
                   )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepoHistoryPage;
