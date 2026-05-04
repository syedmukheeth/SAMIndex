import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Search, X, Clock, Code } from 'lucide-react';
import { getHistory, clearHistory } from '../../services/api';

const HistoryPanel = ({ onSelectSearch, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem('search_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to load local history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('search_history');
    setHistory([]);
  };

  const groupHistoryByRepo = () => {
    return history.reduce((groups, item) => {
      const repo = item.repo || 'Global';
      if (!groups[repo]) groups[repo] = [];
      groups[repo].push(item);
      return groups;
    }, {});
  };

  const groupedHistory = groupHistoryByRepo();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1500]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/10 backdrop-blur-3xl z-[1501] shadow-2xl flex flex-col pt-4"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <History className="text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Search History</h2>
                  <p className="text-sm text-gray-400">Your recent discoveries</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock className="text-blue-400/50" size={32} />
                  </motion.div>
                  <p className="text-gray-500 animate-pulse">Retrieving history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Search className="text-gray-600" size={32} />
                  </div>
                  <h3 className="text-white font-medium mb-1">No history yet</h3>
                  <p className="text-sm text-gray-500">Your indexed searches will appear here for quick access.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedHistory).map(([repo, items]) => (
                    <div key={repo} className="space-y-3">
                      <div className="flex items-center gap-2 px-2">
                        <Code size={14} className="text-gray-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{repo}</h3>
                      </div>
                      <div className="grid gap-2">
                        {items.map((item) => (
                          <motion.button
                            key={item.id || item._id}
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                              onSelectSearch(item.query, item.repo);
                              onClose();
                            }}
                            className="w-full p-4 rounded-xl border border-white/5 bg-white/2 flex items-start gap-4 text-left group transition-all"
                          >
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                              <Search size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{item.query}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock size={12} className="text-gray-500" />
                                <span className="text-[10px] text-gray-500 uppercase tracking-tighter">
                                  {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
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
