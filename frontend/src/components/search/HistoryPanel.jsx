import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Search, X, Clock, Code, Zap, Database, Globe } from 'lucide-react';
import { getHistory, clearHistory } from '../../services/api';

const HistoryPanel = ({ onSelectSearch, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getHistory();
      if (response.status === 'success') {
        const data = migrateHistory(response.data);
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load remote history:', err);
      // Fallback to local if API fails
      const saved = localStorage.getItem('search_history');
      if (saved) setHistory(migrateHistory(JSON.parse(saved)));
    } finally {
      setLoading(false);
    }
  };

  // Retroactively tag old history entries that were done in Direct mode
  // by cross-referencing against direct_repo_history in localStorage
  const migrateHistory = (items) => {
    const directRepos = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
    const directRepoKeys = new Set(
      directRepos.map(r => `${r.owner}/${r.name}`.toLowerCase())
    );
    return items.map(item => {
      if (item.isEphemeral === true) return item; // already confirmed direct
      const key = item.owner && item.repo ? `${item.owner}/${item.repo}`.toLowerCase() : '';
      // If this repo is in direct_repo_history, it was a Direct session
      return { ...item, isEphemeral: directRepoKeys.has(key) };
    });
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      localStorage.removeItem('search_history');
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const categorizeHistory = () => {
    const direct = [];
    const global = [];
    const permanent = [];

    history.forEach(item => {
      if (item.isEphemeral) {
        direct.push(item);
      } else if (item.repo === 'Global' || !item.repo || item.repo.toLowerCase() === 'global') {
        global.push(item);
      } else {
        permanent.push(item);
      }
    });

    const groupByRepo = (items) => {
      return items.reduce((groups, item) => {
        const repoName = item.repo && item.owner && item.repo !== 'Global' ? `${item.owner}/${item.repo}` : (item.repo || 'Global');
        if (!groups[repoName]) groups[repoName] = [];
        groups[repoName].push(item);
        return groups;
      }, {});
    };

    const directIds = new Set(direct.map(i => i.id));
    const globalIds = new Set(global.map(i => i.id));

    return {
      recent: history.slice(0, 5),
      direct: groupByRepo(direct),
      global: groupByRepo(global),
      permanent: groupByRepo(permanent),
      directIds,
      globalIds
    };
  };

  const { recent, direct, global, permanent, directIds, globalIds } = categorizeHistory();

  const renderHistoryGroup = (repoName, items, type = 'permanent') => {
    const isEphemeral = type === 'direct';
    const isGlobal = type === 'global';
    
    return (
      <div key={repoName} className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {isEphemeral ? (
              <Zap size={14} className="text-accent-cyan shadow-[0_0_10px_rgba(80,227,194,0.4)]" />
            ) : isGlobal ? (
              <Globe size={14} className="text-accent-purple shadow-[0_0_10px_rgba(121,40,202,0.4)]" />
            ) : (
              <Code size={14} className="text-accent-blue" />
            )}
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              isEphemeral ? 'text-accent-cyan' : isGlobal ? 'text-accent-purple' : 'text-accent-blue/60'
            }`}>
              {repoName}
            </h3>
          </div>
          {/* Badges removed for minimalist color-driven UX */}
        </div>
        <div className="grid gap-2">
          {items.map((item) => (
            <motion.button
              key={item.id || item._id}
              whileHover={{ 
                scale: 1.01, 
                backgroundColor: isEphemeral 
                  ? 'rgba(80, 227, 194, 0.05)' 
                  : isGlobal 
                    ? 'rgba(121, 40, 202, 0.05)' 
                    : 'rgba(0, 112, 243, 0.05)' 
              }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                onSelectSearch(item);
                onClose();
              }}
              className={`w-full p-4 rounded-2xl border flex items-start gap-4 text-left group transition-all ${
                isEphemeral 
                  ? 'border-accent-cyan/10 bg-accent-cyan/[0.02] hover:border-accent-cyan/30' 
                  : isGlobal
                    ? 'border-accent-purple/10 bg-accent-purple/[0.02] hover:border-accent-purple/30'
                    : 'border-white/5 bg-white/[0.02] hover:border-accent-blue/30'
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${
                isEphemeral 
                  ? 'bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan/20' 
                  : isGlobal
                    ? 'bg-accent-purple/10 text-accent-purple group-hover:bg-accent-purple/20'
                    : 'bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue/20'
              }`}>
                <Search size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-white font-bold text-sm truncate">{item.query}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-white/20" />
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-tighter">
                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1500]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#050505] border-l border-white/5 backdrop-blur-3xl z-[1501] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <History className="text-accent-blue" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Search History</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your recent neural discoveries</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-12">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-6">
                   <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-accent-blue/20 border-t-accent-blue animate-spin" />
                      <Clock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-blue/40" size={24} />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Syncing Neural Logs...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                    <Search className="text-white/10" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Null Stream</h3>
                  <p className="text-xs text-white/20 font-medium leading-relaxed">Your neural search logs are currently empty. Begin a discovery to populate this stream.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Recent Search (Unified Stream) */}
                  {recent.length > 0 && (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                          <div className="p-1.5 rounded-lg bg-white/5 text-white/40">
                             <Clock size={14} />
                           </div>
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Recent Search</h4>
                       </div>
                       <div className="grid gap-2">
                          {recent.map((item) => {
                            const isDirect = directIds.has(item.id);
                            const isGlobal = globalIds.has(item.id);
                            const colorClass = isDirect
                              ? 'bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan/20'
                              : isGlobal
                              ? 'bg-accent-purple/10 text-accent-purple group-hover:bg-accent-purple/20'
                              : 'bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue/20';
                            return (
                              <button
                                key={`recent-${item.id}`}
                                onClick={() => onSelectSearch(item)}
                                className={`group w-full p-4 glass-dark rounded-2xl border transition-all text-left flex items-center justify-between ${
                                  isDirect ? 'border-accent-cyan/10 hover:border-accent-cyan/20' :
                                  isGlobal ? 'border-accent-purple/10 hover:border-accent-purple/20' :
                                  'border-white/5 hover:border-accent-blue/20'
                                }`}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${colorClass}`}>
                                    <Search size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold truncate group-hover:text-white transition-colors">
                                      {item.query}
                                    </p>
                                    <p className="text-[10px] text-white/20 font-medium">
                                      {item.repo && item.owner ? `${item.owner}/${item.repo}` : 'Global'}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[9px] text-white/10 font-medium group-hover:text-white/30 transition-colors">
                                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  )}

                  {/* Neural Stream (Direct Search) */}
                  {Object.keys(direct).length > 0 && (
                    <div className="space-y-6">
                       <div className="space-y-6">
                          {Object.entries(direct).map(([repoName, items]) => renderHistoryGroup(repoName, items, 'direct'))}
                       </div>
                    </div>
                  )}

                  {/* Global Search (Purple) */}
                  {Object.keys(global).length > 0 && (
                    <div className="space-y-6">
                       <div className="space-y-6">
                          {Object.entries(global).map(([repoName, items]) => renderHistoryGroup(repoName, items, 'global'))}
                       </div>
                    </div>
                  )}

                  {/* Knowledge Vault (Permanent Search) */}
                  {Object.keys(permanent).length > 0 && (
                    <div className="space-y-6">
                       <div className="space-y-6">
                          {Object.entries(permanent).map(([repoName, items]) => renderHistoryGroup(repoName, items, 'permanent'))}
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {history.length > 0 && (
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={handleClearHistory}
                  className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 font-bold transition-all group"
                >
                  <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                  Clear Search History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryPanel;
