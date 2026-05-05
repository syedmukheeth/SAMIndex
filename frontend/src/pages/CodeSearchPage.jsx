import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Code, Book, FileText, Loader, Database, 
  CircleCheck, CircleAlert, Copy, Check, Terminal, Cpu,
  Zap, Hash, ExternalLink, Globe, Sparkles, Command, ArrowRight, X,
  History as HistoryIcon
} from 'lucide-react';
import { searchCode, indexRepo, getIndexStatus } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchParams } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import HistoryPanel from '../components/search/HistoryPanel';

// --- Sub-components (Moved to top for hoist-safety and clarity) ---

const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="text-accent-blue font-bold bg-accent-blue/10 rounded px-0.5 shadow-[0_0_10px_rgba(47,129,247,0.3)]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }}
    className="glass-dark rounded-[2.5rem] p-8 border border-white/5 relative group card-hover overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-accent-blue/30 transition-all duration-500">
      {React.cloneElement(icon, { size: 24, className: "group-hover:scale-110 transition-transform duration-500" })}
    </div>
    <h3 className="text-xl font-black mb-3 tracking-tight group-hover:text-accent-blue transition-colors">{title}</h3>
    <p className="text-white/40 text-sm leading-relaxed font-medium">{desc}</p>
  </motion.div>
);

const ResultCard = ({ result, idx, copiedId, handleCopy, query }) => {
  const openGitHub = (owner, repo, path, line) => {
    window.open(`https://github.com/${owner}/${repo}/blob/main/${path}${line ? `#L${line}` : ''}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-white/10 transition-all premium-shadow"
    >
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-blue">
            <Book size={20} />
          </div>
          <div className="flex flex-col">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => openGitHub(result.owner, result.repo, result.path)}>
                <span className="text-sm font-bold hover:text-accent-blue transition-colors">{result.owner} / {result.repo}</span>
                <ExternalLink size={12} className="text-white/20" />
             </div>
             <span className="text-xs font-mono text-white/30 flex items-center gap-2">
                <FileText size={12} />
                <HighlightText text={result.path} highlight={query} />
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
             <span className="text-[10px] font-black uppercase tracking-tighter text-white/20 block">Language</span>
             <span className="text-xs font-black text-accent-purple">{result.path.split('.').pop()?.toUpperCase()}</span>
          </div>
          <button 
            onClick={() => handleCopy(result.snippets.map(s => s.content).join('\n'), idx)}
            className={`p-3 rounded-xl border border-white/5 transition-all ${copiedId === idx ? 'bg-green-500/10 text-green-400' : 'hover:bg-white/5 text-white/40'}`}
          >
            {copiedId === idx ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div className="p-8 bg-black/20 font-mono text-sm leading-relaxed overflow-x-auto custom-scrollbar">
        {result.snippets.map((snippet, sIdx) => (
          <div key={sIdx} className="mb-6 last:mb-0">
            <div className="flex gap-6">
              <div className="text-white/10 text-right select-none min-w-[40px]">
                {snippet.content.split('\n').map((_, i) => (
                  <div key={i}>{snippet.line + i}</div>
                ))}
              </div>
              <pre className="text-white/70 whitespace-pre">
                <code>
                  <HighlightText text={snippet.content} highlight={query} />
                </code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const IndexingModal = ({ status, progress, repo, isOpen, onComplete }) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-3xl px-6"
    >
      <div className="max-w-xl w-full text-center">
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="glass-dark border border-white/10 rounded-[3rem] p-12 relative overflow-hidden"
        >
          {/* Scanning Animation */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={{ 
                top: ['-100%', '200%'],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-blue to-transparent blur-sm opacity-50"
            />
          </div>

          <div className="relative z-10">
            <div className="w-24 h-24 rounded-3xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20 mx-auto mb-8 relative">
               <Cpu className="text-accent-blue animate-pulse" size={40} />
               <div className="absolute -inset-4 border border-accent-blue/10 rounded-[2rem] animate-[spin_10s_linear_infinity]" />
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tight">Neural Indexing</h2>
            <p className="text-accent-blue font-bold text-sm tracking-[0.2em] uppercase mb-8">{repo}</p>

            <div className="space-y-6">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue bg-[length:200%_auto] animate-[gradient_2s_linear_infinity]"
                />
              </div>
              
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
                <span>{progress >= 100 ? 'Neural Link Established' : 'Synchronizing Neural Nodes'}</span>
                <span className="text-accent-blue">{progress}% Complete</span>
              </div>

              {/* Real-time File Counter */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/40">
                 <Database size={14} className="text-accent-blue" />
                 <span>{status?.includes('Successfully Indexed') ? status : `${Math.floor((progress / 100) * 50)} files indexed...`}</span>
              </div>

              <motion.div 
                key={status}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`py-4 px-6 rounded-2xl bg-white/5 border ${status?.toLowerCase().includes('fail') || status?.toLowerCase().includes('error') ? 'border-red-500/20 text-red-400' : 'border-white/5 text-white/60'} text-xs font-medium italic`}
              >
                "{status || 'Initializing deep scan sequence...'}"
              </motion.div>
            </div>
          </div>
        </motion.div>
        
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
          Do not disconnect from the neural network
        </p>
      </div>
    </motion.div>
  );
};

// --- Main Component ---

const CodeSearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  const [repoUrl, setRepoUrl] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexStatus, setIndexStatus] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeRepo, setActiveRepo] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const searchInputRef = React.useRef(null);

  const debouncedQuery = useDebounce(query, 500);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Check for token in URL (from Google OAuth redirect)
    const token = searchParams.get('token');
    const userDataString = searchParams.get('user');

    if (token && userDataString) {
      try {
        localStorage.setItem('token', token);
        const decodedUser = decodeURIComponent(userDataString);
        localStorage.setItem('user', decodedUser);
        setUser(JSON.parse(decodedUser));
        
        // Clean up URL params to prevent re-processing on refresh
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('token');
        newParams.delete('user');
        setSearchParams(newParams, { replace: true });
      } catch (err) {
        console.error('Failed to parse user from URL:', err);
      }
    } else {
      // Check for existing session
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        try {
          setUser(JSON.parse(savedUser));
        } catch (err) {
          console.error('Failed to parse saved user:', err);
          localStorage.removeItem('user');
        }
      }
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('history') === 'true') {
      setIsHistoryOpen(true);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await searchCode(searchQuery, activeRepo?.repo);
      
      // Senior Dev Safety Filter: Ensure backend results match our active workspace
      let filteredResults = response.data;
      if (activeRepo) {
        filteredResults = response.data.filter(file => 
          file.repo.toLowerCase() === activeRepo.repo.toLowerCase()
        );
      }
      
      setResults(filteredResults);
    } catch (error) {
      console.error('Code search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await searchCode(debouncedQuery, activeRepo?.repo);
        setResults(response.data);

        // Save to local history
        try {
          const savedHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
          const newEntry = { 
            query: debouncedQuery, 
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
          };
          const updatedHistory = [
            newEntry,
            ...savedHistory.filter(h => h.query !== debouncedQuery)
          ].slice(0, 15); // Keep last 15 searches
          localStorage.setItem('search_history', JSON.stringify(updatedHistory));
        } catch (hErr) {
          console.error('Failed to save search history:', hErr);
        }

      } catch (error) {
        console.error('Code search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current && query) {
        // Force save to history on Enter
        const savedHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
        const newEntry = { 
          query, 
          timestamp: new Date().toISOString(),
          id: Math.random().toString(36).substr(2, 9),
          repo: activeRepo ? `${activeRepo.owner}/${activeRepo.repo}` : 'Global'
        };
        const updatedHistory = [
          newEntry,
          ...savedHistory.filter(h => h.query !== query)
        ].slice(0, 15);
        localStorage.setItem('search_history', JSON.stringify(updatedHistory));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, activeRepo]);

  const handleIndexKeyDown = (e) => {
    if (e.key === 'Enter' && repoUrl.trim()) {
      handleIndexRepo();
    }
  };

  const handleClearActiveRepo = () => {
    setActiveRepo(null);
    setIndexStatus(null);
    setShowSuccess(false);
  };

  const pollIndexStatus = async (jobId, owner, repo) => {
    const interval = setInterval(async () => {
      try {
        const response = await getIndexStatus(jobId);
        const { state, progress, result, failedReason } = response.data;
        
        setIndexProgress(progress || 0);

        if (state === 'completed') {
          clearInterval(interval);
          setIndexProgress(100);
          setTimeout(() => {
            const count = result?.filesIndexed || 0;
            setIndexStatus({ type: 'success', message: `Successfully Indexed ${count} files!` });
            
            // Lock the workspace
            setActiveRepo({ owner, repo });
            setIsIndexing(false);
            setRepoUrl('');
            setShowSuccess(true);
            
            // SENIOR DEV AUTO-REFRESH: Instantly search the new workspace
            setTimeout(() => {
              if (query) {
                handleSearch(query);
              } else {
                searchInputRef.current?.focus();
              }
            }, 500);
          }, 1000);
        } else if (state === 'failed' || state === 'error') {
          clearInterval(interval);
          const errorMsg = failedReason || 'GitHub Access Denied or Empty Repo';
          setIndexStatus({ 
            type: 'error', 
            message: `CRITICAL ERROR: ${errorMsg}. Please verify your GITHUB_TOKEN on Render.` 
          });
          // Note: Modal stays open for error review
        } else {
          const count = result?.filesIndexed || 0;
          let msg = `Indexing... (${count} files indexed)`;
          if (progress < 20) msg = `Initializing deep scan sequence... (${count} files)`;
          else if (progress < 40) msg = `Cloning neural file tree... (${count} files)`;
          else if (progress < 60) msg = `Analyzing code semantics... (${count} files)`;
          else if (progress < 80) msg = `Optimizing search vectors... (${count} files)`;
          else msg = `Finalizing neural link... (${count} files)`;
          
          setIndexStatus({ type: 'info', message: msg });
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (err.response?.status === 404) {
          clearInterval(interval);
          setIsIndexing(false);
        }
      }
    }, 2000);
    
    return interval;
  };

  const handleIndexRepo = async () => {
    // SENIOR DEV AUTO-LOGIN: Don't let them get stuck
    if (!localStorage.getItem('token')) {
      setIndexStatus({ type: 'error', message: 'REDIRECTING TO LOGIN... You must be signed in to index code.' });
      setIsIndexing(true);
      setTimeout(() => {
        // Trigger the login flow (usually a modal or redirect)
        const loginBtn = document.querySelector('button:contains("Log In")') || document.querySelector('a[href*="login"]');
        if (loginBtn) loginBtn.click();
        else window.location.href = '/login'; 
      }, 2000);
      return;
    }

    if (!repoUrl.trim()) return;
    setIsIndexing(true);
    setIndexProgress(0);
    setIndexStatus({ type: 'info', message: 'Initializing Neural Engine...' });

    try {
      // Robust URL Parsing
      let path = repoUrl.trim().replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      
      if (parts.length < 2) {
        throw new Error('Invalid URL. Use format: owner/repo');
      }

      const owner = parts[0];
      const repo = parts[1];

      const response = await indexRepo(`${owner}/${repo}`);
      const { jobId, cached } = response.data;

      if (cached) {
        setIndexStatus({ type: 'success', message: 'Neural Link Cached!' });
        setActiveRepo({ owner, repo });
        setIsIndexing(false);
        setRepoUrl('');
        if (query) handleSearch(query);
      } else {
        pollIndexStatus(jobId, owner, repo);
      }
    } catch (error) {
      setIndexStatus({ 
        type: 'error', 
        message: error.response?.data?.message || error.message || 'Indexing Failed' 
      });
      setTimeout(() => setIsIndexing(false), 3000);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-accent-blue/30 relative overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 mesh-bg opacity-30 pointer-events-none z-0" />
      <div className="fixed inset-0 noise pointer-events-none z-0" />
      
      {/* Animated Blobs */}
      <div className="fixed top-[-5%] left-[-5%] w-[45%] h-[45%] bg-accent-blue/5 rounded-full blur-[140px] animate-pulse pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45%] h-[45%] bg-accent-purple/5 rounded-full blur-[140px] animate-pulse pointer-events-none z-0" style={{ animationDelay: '3s' }} />

      <AnimatePresence>
        {isIndexing && (
          <IndexingModal 
            isOpen={isIndexing}
            status={indexStatus?.message}
            progress={indexProgress}
            repo={repoUrl}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 pt-32 pb-20 px-6">
        <header className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={14} className="text-accent-blue animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
                {activeRepo ? `Workspace: ${activeRepo.repo}` : 'Neural Engine v2.0'}
              </span>
            </div>
          </motion.div>
          
          <motion.h1 
            key={activeRepo ? 'workspace' : 'home'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-gradient"
          >
            {activeRepo ? (
              <>Explore <br /> {activeRepo.repo}.</>
            ) : (
              <>Search across <br /> the index.</>
            )}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
          >
            {activeRepo ? (
              `Neural scan complete. You are now searching within the context of ${activeRepo.owner}/${activeRepo.repo}.`
            ) : (
              "The lightning-fast code analysis engine for modern engineering teams. Deep-link into any repository with neural-grade precision."
            )}
          </motion.p>
        </header>

        <section className="max-w-4xl mx-auto mb-32 relative">
          <motion.div 
            layout
            className="relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-accent-blue/10 rounded-[3rem] blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
            
            <div className={`relative glass-dark rounded-[2.5rem] border ${activeRepo ? 'border-accent-blue/30' : 'border-white/10'} p-3 shadow-2xl focus-within:border-accent-blue/50 transition-all duration-500 overflow-hidden`}>
              <div className="flex items-center px-6 py-6">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-0 flex items-center gap-3 pointer-events-none z-10">
                    <Search className={`${activeRepo ? 'text-accent-blue' : 'text-white/20'}`} size={24} />
                  </div>
                  <input 
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={activeRepo ? `Search ${activeRepo.repo}...` : "Ask anything about the codebase..."}
                    className="w-full bg-transparent text-2xl md:text-3xl font-semibold placeholder-white/5 focus:outline-none relative z-0 pl-12"
                  />
                </div>
                
                {activeRepo && (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleClearActiveRepo}
                    className="ml-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all group"
                    title="Exit Workspace"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1, color: '#0070f3' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsHistoryOpen(true)}
                  className="ml-4 p-2 text-white/20 hover:text-white transition-colors relative z-20"
                  title="Search History"
                >
                  <HistoryIcon size={24} />
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {!activeRepo && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-8 flex flex-col items-center gap-6 relative z-30"
                >
                  <div className="flex items-center glass rounded-3xl pl-5 pr-2 py-2 border-white/10 min-w-[340px] md:min-w-[450px] focus-within:border-accent-blue/40 transition-all shadow-2xl relative z-40 bg-black/40 backdrop-blur-md group">
                    <Globe className="text-white/30 group-focus-within:text-accent-blue transition-colors w-4 h-4 shrink-0" />
                    <input
                      id="index-input"
                      type="text"
                      placeholder="github.com/owner/repo"
                      className="bg-transparent px-4 py-2 text-sm text-white/90 focus:outline-none flex-1 placeholder-white/10"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={handleIndexKeyDown}
                    />
                    <button 
                      onClick={handleIndexRepo}
                      className="bg-white hover:bg-accent-blue text-black hover:text-white text-[10px] font-black py-2.5 px-6 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-95"
                    >
                      Index Now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-dark rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4 bg-white/5" />
                      <Skeleton className="h-3 w-1/3 bg-white/5" />
                    </div>
                  </div>
                  <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
                </div>
              ))}
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-8"
            >
               <div className="flex items-center justify-between px-2 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-3">
                    <Hash size={14} className="text-accent-blue" />
                    {results.length} Contextual Matches
                  </h2>
               </div>
               {results.map((result, idx) => (
                 <ResultCard key={idx} result={result} idx={idx} copiedId={copiedId} handleCopy={handleCopy} query={debouncedQuery} />
               ))}
            </motion.div>
          ) : query ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-40 glass-dark border border-white/5 rounded-[3rem] border-dashed"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <Search size={32} className="text-white/20" />
              </div>
              <h3 className="text-2xl font-black mb-3">Zero Hits</h3>
              <p className="text-white/30 max-w-xs mx-auto text-sm leading-relaxed">
                No matches found in the neural index. <br /> 
                Try refining your query or index a new repo.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <FeatureCard 
                icon={<Terminal className="text-accent-blue" />}
                title="Deep Scan"
                desc="Full-tree recursive indexing with advanced dependency mapping."
              />
              <FeatureCard 
                icon={<Zap className="text-accent-purple" />}
                title="Instant Core"
                desc="Proprietary weighted indexing for sub-millisecond search speed."
              />
              <FeatureCard 
                icon={<Globe className="text-accent-cyan" />}
                title="Global Context"
                desc="Intelligent snippet extraction that preserves code semantics."
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        onSelectSearch={(query, repo) => {
          setQuery(query);
        }}
      />

      <footer className="border-t border-white/5 py-16 px-6 mt-20 relative bg-black/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
              <p className="text-[10px] font-black tracking-[0.5em] uppercase text-white/60">
                Neural Code Intelligence
              </p>
            </div>
            <p className="text-xs text-white/20 font-medium max-w-sm leading-relaxed">
              Decentralized repository indexing with sub-millisecond contextual retrieval and advanced dependency mapping.
            </p>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 px-8 py-4 rounded-3xl glass border-white/5 group cursor-pointer relative overflow-hidden"
            onClick={() => window.open('https://www.linkedin.com/in/syedmukheeth/', '_blank')}
          >
            <div className="absolute inset-0 bg-accent-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20 group-hover:border-accent-blue/50 transition-all relative z-10">
              <ExternalLink size={18} className="text-accent-blue" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-1">
                Lead Architect
              </p>
              <p className="text-sm font-black tracking-tight text-white group-hover:text-accent-blue transition-colors">
                Syed Mukheeth
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-accent-blue/5 rounded-full blur-2xl group-hover:bg-accent-blue/10 transition-all" />
          </motion.div>

        </div>
      </footer>
    </div>
  );
};

export default CodeSearchPage;
