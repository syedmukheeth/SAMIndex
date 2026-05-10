import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Code, Book, FileText, Loader, Database, FileCode,
  CircleCheck, CircleAlert, Copy, Check, Terminal, Cpu,
  Zap, Hash, ExternalLink, Globe, Sparkles, Command, ArrowRight, ArrowLeft, X,
  History as HistoryIcon
} from 'lucide-react';
import { 
  searchCode, indexRepo, getIndexStatus, getIndexedRepos, 
  getRepoDetails, aiExplain, repoSummary, getRepoIntelligence 
} from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchParams, Link } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import HistoryPanel from '../components/search/HistoryPanel';

const openGitHub = (owner, repo, path) => {
  window.open(`https://github.com/${owner}/${repo}/blob/main/${path}`, '_blank');
};

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
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const openGitHub = (owner, repo, path, line) => {
    window.open(`https://github.com/${owner}/${repo}/blob/main/${path}${line ? `#L${line}` : ''}`, '_blank');
  };

  const handleExplain = async () => {
    if (explanation) return;
    setIsExplaining(true);
    try {
      const code = result.snippets.map(s => s.content).join('\n');
      const response = await aiExplain(code, result.path);
      setExplanation(response.data.explanation);
    } catch (err) {
      console.error('Neural analysis failed:', err);
    } finally {
      setIsExplaining(false);
    }
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
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExplain}
            disabled={isExplaining}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${explanation ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border-white/5'}`}
          >
            {isExplaining ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{explanation ? 'AI Summary Active' : 'AI Summary'}</span>
          </button>

          <div className="h-8 w-[1px] bg-white/5 hidden sm:block" />

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

      <AnimatePresence>
        {explanation && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-8 py-6 bg-accent-blue/[0.03] border-b border-white/5 relative overflow-hidden"
          >
             <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue/50 shadow-[0_0_15px_rgba(0,112,243,0.5)]" />
             <div className="flex gap-4 items-start">
                <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue shrink-0">
                  <Sparkles size={14} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue/50">AI Code Summary</span>
                   <p className="text-sm text-gray-300 leading-relaxed font-medium">
                     {explanation}
                   </p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

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

const IndexingModal = ({ status, progress, repo, isOpen, mode, onComplete }) => {
  const [logHistory, setLogHistory] = useState([]);
  
  useEffect(() => {
    if (status) {
      setLogHistory(prev => [status, ...prev].slice(0, 5));
    }
  }, [status]);

  if (!isOpen) return null;

  const isEphemeral = mode === 'ephemeral';
  const theme = isEphemeral ? {
    color: 'text-accent-cyan',
    bg: 'bg-accent-cyan/10',
    border: 'border-accent-cyan/20',
    glow: 'shadow-[0_0_50px_rgba(0,242,255,0.15)]',
    icon: <Zap size={40} className="text-accent-cyan animate-pulse" />,
    label: 'Direct Neural Stream',
    badge: 'Ephemeral Memory Pipeline',
    accent: 'accent-cyan'
  } : {
    color: 'text-accent-purple',
    bg: 'bg-accent-purple/10',
    border: 'border-accent-purple/20',
    glow: 'shadow-[0_0_50px_rgba(139,92,246,0.15)]',
    icon: <Database size={40} className="text-accent-purple animate-pulse" />,
    label: 'Neural Synthesis',
    badge: 'MongoDB Brain Persistence',
    accent: 'accent-purple'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-3xl px-6"
    >
      <div className="max-w-xl w-full text-center">
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className={`glass-dark border border-white/10 rounded-[3.5rem] p-12 relative overflow-hidden ${theme.glow}`}
        >
          {/* Scanning Animation */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={{ 
                top: ['-100%', '200%'],
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "linear"
              }}
              className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-${theme.accent} to-transparent blur-sm opacity-40`}
            />
          </div>

          <div className="relative z-10">
            <div className={`w-24 h-24 rounded-[2rem] ${theme.bg} flex items-center justify-center border ${theme.border} mx-auto mb-10 relative`}>
               {theme.icon}
               <div className={`absolute -inset-4 border ${theme.border} rounded-[2.5rem] animate-[spin_12s_linear_infinity] opacity-30`} />
               <div className={`absolute -inset-8 border ${theme.border} rounded-[3rem] animate-[spin_20s_linear_infinity_reverse] opacity-10`} />
            </div>

            <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase">{theme.label}</h2>
            <p className={`${theme.color} font-black text-[10px] tracking-[0.4em] uppercase mb-10 opacity-80`}>{repo}</p>

            <div className="space-y-8">
              <div className="relative">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full bg-gradient-to-r from-${theme.accent} via-white to-${theme.accent} bg-[length:200%_auto] animate-[gradient_2s_linear_infinity]`}
                  />
                </div>
                {/* Micro-sparkles on progress bar */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                  <motion.div 
                    animate={{ x: ['0%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className={`w-20 h-full bg-white/20 blur-md`}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-white/30">{progress >= 100 ? 'Neural Integrity Verified' : 'Synchronizing Data Nodes'}</span>
                <span className={theme.color}>{progress}% Synchronized</span>
              </div>

              {/* Enhanced Visual Feedback */}
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                 <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Ingestion Stream</span>
                    <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                      <Hash size={12} className={theme.color} />
                      <span>{Math.floor((progress / 100) * 850)} files</span>
                    </div>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Architecture Mode</span>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${theme.bg} border ${theme.border}`}>
                      <div className={`w-1 h-1 rounded-full ${theme.color.replace('text', 'bg')} animate-pulse`} />
                      <span className={`text-[8px] font-black tracking-widest ${theme.color} uppercase`}>{theme.badge}</span>
                    </div>
                 </div>
              </div>

              <div className="h-28 overflow-hidden relative">
                <AnimatePresence mode="popLayout">
                  {logHistory.map((log, i) => (
                    <motion.div 
                      key={`${log}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1 - (i * 0.2), y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`text-left text-[10px] font-mono leading-relaxed mb-1 truncate ${i === 0 ? 'text-white/60 font-bold' : 'text-white/20'}`}
                    >
                      <span className={theme.color}>{'>'}</span> {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {/* Bottom Blur to hide overflow */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>
        
        <p className="mt-10 text-[10px] font-black uppercase tracking-[0.8em] text-white/10 animate-pulse">
          Neural link active · Maintain connection
        </p>
      </div>
    </motion.div>
  );
};

const IntelligencePanel = ({ genome, isLoading }) => {
  if (!genome && !isLoading) return null;

  const metrics = [
    { label: 'Scalability', ...genome?.scalability, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { label: 'Security', ...genome?.security, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Observability', ...genome?.observability, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Infra Maturity', ...genome?.infra_maturity, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
    { label: 'Realtime', ...genome?.realtime_readiness, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-dark rounded-[2.5rem] border border-white/5 p-8 h-fit sticky top-32 overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Cpu size={120} className="text-accent-blue" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Repository Genome</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">AI Architecture Intelligence</p>
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 italic text-sm text-white/60 leading-relaxed">
            "{genome?.architecture || 'Synthesizing architectural signals...'}"
          </div>
          
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Analysis Confidence</span>
            <span className="text-[10px] font-black text-accent-blue">{(genome?.confidence || 0) * 100}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(genome?.confidence || 0) * 100}%` }}
              className="h-full bg-accent-blue shadow-[0_0_10px_rgba(0,112,243,0.5)]"
             />
          </div>
        </div>

        <div className="space-y-6">
          {metrics.map((m, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{m.label}</span>
                <span className={`text-xs font-black ${m.color}`}>{m.score || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${m.score || 0}%` }}
                  className={`h-full ${m.color.replace('text', 'bg')} shadow-lg`}
                />
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed font-medium group-hover:text-white/50 transition-colors">
                {m.reasoning || 'Calibrating neural nodes...'}
              </p>
            </div>
          ))}
        </div>

        {genome?.key_files && (
          <div className="mt-8 pt-8 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 block">Influential Signals</span>
            <div className="space-y-2">
              {genome.key_files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-white/40 hover:text-accent-blue cursor-pointer transition-colors">
                  <FileCode size={12} />
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Main Component ---

const CodeSearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
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
  const [indexedRepos, setIndexedRepos] = useState([]);
  const [directRepos, setDirectRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoInsight, setRepoInsight] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [repoGenome, setRepoGenome] = useState(null);
  const [isLoadingGenome, setIsLoadingGenome] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // NEW: Ephemeral Mode State
  const [searchMode, setSearchMode] = useState(searchParams.get('mode') || 'persistent'); // 'persistent' | 'ephemeral'
  const [ephemeralSessionId, setEphemeralSessionId] = useState(searchParams.get('sid') || null);
  const [isSearchUnlocked, setIsSearchUnlocked] = useState(false);
  
  const searchInputRef = React.useRef(null);
  const debouncedQuery = useDebounce(query, 500);

  // NEW: Instant Workspace Previewing (Senior Dev UX)
  const previewRepo = useMemo(() => {
    if (activeRepo) return activeRepo;
    if (!repoUrl.trim()) return null;
    
    try {
      let path = repoUrl.trim().replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1], isPreview: true };
      }
    } catch (e) {}
    return null;
  }, [activeRepo, repoUrl]);

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
  
  // NEW: Robust Workspace Status Synchronization
  useEffect(() => {
    const syncRepoStatus = async () => {
      const owner = searchParams.get('owner');
      const repo = searchParams.get('repo');
      const sid = searchParams.get('sid');
      
      if (sid) setEphemeralSessionId(sid);

      if (owner && repo) {
        try {
          const response = await getRepoDetails(owner, repo);
          setActiveRepo({ 
            owner: response.data.owner, 
            repo: response.data.name, 
            isIndexed: response.data.isIndexed,
            description: response.data.description 
          });
          if (response.data.description) {
            setRepoInsight(response.data.description);
          }

          // Fetch Intelligence (Genome)
          setIsLoadingGenome(true);
          const intelResponse = await getRepoIntelligence(owner, repo);
          setRepoGenome(intelResponse.data.genome);
          setIsLoadingGenome(false);

        } catch (err) {
          console.warn('Repo metadata sync failed:', err.message);
          setActiveRepo({ owner, repo, isIndexed: false });
        }
      }
    };
    
    syncRepoStatus();
  }, [searchParams]);

  // NEW: Real-time Intelligence Polling during indexing
  useEffect(() => {
    let interval;
    if (isIndexing && activeRepo) {
      interval = setInterval(async () => {
        try {
          const res = await getRepoIntelligence(activeRepo.owner, activeRepo.repo);
          if (res.data.genome) {
            setRepoGenome(res.data.genome);
          }
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isIndexing, activeRepo]);
  
  // NEW: Fetch all indexed repos to show status
  useEffect(() => {
    const fetchIndexedRepos = async () => {
      setLoadingRepos(true);
      try {
        const response = await getIndexedRepos(100);
        const repos = response.data.repositories.filter(r => r.isIndexed);
        setIndexedRepos(repos);
        
        // Load direct repo history from localStorage
        const savedDirect = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
        setDirectRepos(savedDirect);
      } catch (err) {
        console.error('Failed to fetch indexed repos:', err);
      } finally {
        setLoadingRepos(false);
      }
    };
    fetchIndexedRepos();
  }, [isIndexing]); // Re-fetch when indexing finishes

  useEffect(() => {
    if (searchParams.get('history') === 'true') {
      setIsHistoryOpen(true);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await searchCode(
        searchQuery, 
        activeRepo?.repo, 
        activeRepo?.owner,
        ephemeralSessionId
      );
      
      // Senior Dev Safety Filter: Ensure backend results match our active workspace
      let filteredResults = response.data;
      if (activeRepo && !ephemeralSessionId) {
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
        const target = activeRepo || previewRepo;
        const response = await searchCode(
          debouncedQuery, 
          target?.repo, 
          target?.owner,
          ephemeralSessionId
        );
        
        // Senior Dev Safety Filter: Ensure results strictly match workspace
        let filteredResults = response.data;
        if (target && !ephemeralSessionId) {
          filteredResults = response.data.filter(file => 
            file.repo.toLowerCase() === target.repo.toLowerCase()
          );
        }
        
        setResults(filteredResults);
        
        // NEW: Group results by repository for 'Tree' view
        const groups = filteredResults.reduce((acc, result) => {
          const key = `${result.owner}/${result.repo}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(result);
          return acc;
        }, {});
        setGroupedResults(groups);

        // Save to local history
        try {
          const savedHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
          const target = activeRepo || previewRepo;
          const newEntry = { 
            query: debouncedQuery, 
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9),
            owner: target?.owner,
            repo: target?.repo,
            isEphemeral: !!ephemeralSessionId || searchMode === 'ephemeral'
          };
          const updatedHistory = [
            newEntry,
            ...savedHistory.filter(h => h.query !== debouncedQuery)
          ].slice(0, 30); // Expanded to 30 for better historical depth
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
          owner: activeRepo?.owner,
          repo: activeRepo?.repo,
          isEphemeral: !!ephemeralSessionId
        };
        const updatedHistory = [
          newEntry,
          ...savedHistory.filter(h => h.query !== query)
        ].slice(0, 30);
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
    setSearchParams({}); // Return to Global Mode
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pollIndexStatus = async (jobId, owner, repo, isEphemeral = false) => {
    const interval = setInterval(async () => {
      try {
        // If ephemeral, we can poll both job and session status
        const response = await getIndexStatus(jobId);
        const { state, progress, result, failedReason } = response.data;
        
        setIndexProgress(progress || 0);

        if (isEphemeral) {
          try {
            const sessId = `${owner.toLowerCase()}:${repo.toLowerCase()}`;
            const { getEphemeralStatus } = await import('../services/api');
            const sessStatus = await getEphemeralStatus(sessId);
            
            if (sessStatus.data.isSearchReady === 'true' && !isSearchUnlocked) {
              setIsSearchUnlocked(true);
              setIndexStatus({ type: 'success', message: 'DIRECT SEARCH UNLOCKED: You can start searching now!' });
              
              // NEW: Save to Direct History immediately on Unlock (Senior Dev UX)
              const savedDirect = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
              const newEntry = { owner, name: repo, isEphemeral: true, lastAccessed: new Date().toISOString() };
              const updatedHistory = [
                newEntry,
                ...savedDirect.filter(r => !(r.owner === owner && r.name === repo))
              ].slice(0, 10);
              localStorage.setItem('direct_repo_history', JSON.stringify(updatedHistory));
              setDirectRepos(updatedHistory);
            }
          } catch (e) {}
        }

        if (state === 'completed') {
          clearInterval(interval);
          setIndexProgress(100);
          setTimeout(() => {
            setIndexStatus({ type: 'success', message: `${isEphemeral ? 'Transient Indexing' : 'Neural Link'} Established!` });
            
            if (isEphemeral) {
              // Save to Direct History
              const savedDirect = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
              const newEntry = { owner, name: repo, isEphemeral: true, lastAccessed: new Date().toISOString() };
              const updatedHistory = [
                newEntry,
                ...savedDirect.filter(r => !(r.owner === owner && r.name === repo))
              ].slice(0, 6);
              localStorage.setItem('direct_repo_history', JSON.stringify(updatedHistory));
              setDirectRepos(updatedHistory);
            }

            setActiveRepo({ owner, repo, isIndexed: true, isEphemeral });
            setIsIndexing(false);
            if (!isEphemeral) setRepoUrl('');
            setShowSuccess(true);
            
            setSearchParams({ 
              owner, 
              repo, 
              mode: isEphemeral ? 'ephemeral' : 'persistent',
              sid: isEphemeral ? `${owner.toLowerCase()}:${repo.toLowerCase()}` : undefined
            });
            
            setTimeout(() => {
              if (query) handleSearch(query);
              else searchInputRef.current?.focus();
            }, 500);
          }, 1000);
        } else if (state === 'failed' || state === 'error') {
          clearInterval(interval);
          setIndexStatus({ 
            type: 'error', 
            message: `the indexing of this repo not happen man (${failedReason || 'Connection Failed'})` 
          });
        } else {
          const count = result?.filesIndexed || 0;
          setIndexStatus({ type: 'info', message: `Syncing ${isEphemeral ? 'Transient' : 'Neural'} Nodes... (${count} files)` });
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(interval);
        setIsIndexing(false);
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
        // Trigger the login flow
        const loginBtn = Array.from(document.querySelectorAll('button, a')).find(el => 
          el.textContent.includes('Log In') || (el.getAttribute('href') && el.getAttribute('href').includes('login'))
        );
        if (loginBtn) loginBtn.click();
        else window.location.href = '/login'; 
      }, 2000);
      return;
    }

    // Use activeRepo if repoUrl is empty (allows clicking the "Indexing Required" badge)
    let owner = '';
    let repo = '';

    if (!repoUrl.trim()) {
      if (activeRepo) {
        owner = activeRepo.owner;
        repo = activeRepo.repo;
      } else {
        return;
      }
    }
      if (repoUrl.trim()) {
        // Robust URL Parsing
        let path = repoUrl.trim().replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '');
        const parts = path.split('/').filter(Boolean);
        
        if (parts.length < 2) {
          setIndexStatus({ type: 'error', message: 'The indexing of this repo failed: Invalid GitHub URL format' });
          setTimeout(() => setIsIndexing(false), 3000);
          return;
        }

        owner = parts[0];
        repo = parts[1];
      }

      // Now we have valid owner/repo, set active and save history
      setActiveRepo({ owner, repo, isIndexed: false });
      setIsIndexing(true);
      setIndexStatus({ type: 'info', message: 'Initializing Neural Indexing...' });

      // NEW: Immediate Save to Direct History (Senior Dev UX)
      if (searchMode === 'ephemeral') {
        const savedDirect = JSON.parse(localStorage.getItem('direct_repo_history') || '[]');
        const newEntry = { 
          owner, 
          name: repo, 
          isEphemeral: true, 
          lastAccessed: new Date().toISOString(),
          status: 'indexing'
        };
        const updatedHistory = [
          newEntry,
          ...savedDirect.filter(r => !(r.owner === owner && r.name === repo))
        ].slice(0, 10);
        localStorage.setItem('direct_repo_history', JSON.stringify(updatedHistory));
        setDirectRepos(updatedHistory);
      }

    try {
      const isEphemeral = searchMode === 'ephemeral';
      const response = await indexRepo(owner, repo, searchMode);
      const { jobId, cached, sessionId } = response.data;

      if (isEphemeral) {
        setEphemeralSessionId(sessionId);
        setIsSearchUnlocked(false);
      }

      if (cached && !isEphemeral) {
        setIndexStatus({ type: 'success', message: 'Neural Link Cached!' });
        setActiveRepo({ owner, repo, isIndexed: true });
        setSearchParams({ owner, repo }); // Persist workspace
        setIsIndexing(false);
        setRepoUrl('');
        if (query) handleSearch(query);
      } else {
        pollIndexStatus(jobId, owner, repo, isEphemeral);
      }
    } catch (error) {
      setIndexStatus({ 
        type: 'error', 
        message: error.response?.data?.message || error.message || 'Indexing Failed' 
      });
      setTimeout(() => setIsIndexing(false), 3000);
    }
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
            repo={repoUrl || (activeRepo?.owner + '/' + activeRepo?.repo)}
            mode={searchMode}
            onComplete={() => setIsIndexing(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 pt-32 pb-20 px-6">
        <header className="text-center mb-20">
          {/* Status Badge */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xl"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                Neural Engine V2.0
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              {(activeRepo || previewRepo) ? (
                <motion.div
                  key="active-workspace"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 px-6 py-2 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 backdrop-blur-xl shadow-2xl shadow-accent-blue/5"
                >
                  <Globe size={14} className="text-accent-blue" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black tracking-widest text-accent-blue/50 uppercase leading-none">Active Repo</span>
                    <span className="text-sm font-bold text-white">{(activeRepo || previewRepo).owner} / {(activeRepo || previewRepo).repo}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveRepo(null);
                      setSearchParams({});
                      setRepoUrl('');
                      setRepoInsight(null);
                    }}
                    className="ml-2 p-1.5 hover:bg-accent-blue/20 rounded-lg text-accent-blue/50 hover:text-accent-blue transition-all"
                    title="Exit Repo"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="global-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/2 border border-white/5"
                >
                  <Globe size={12} className="text-gray-600" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Neural Scan</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
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
              <div className="flex flex-col items-center gap-4">
                <span>
                  {activeRepo.isIndexed 
                    ? `Neural scan complete. You are now searching within the context of ${activeRepo.owner}/${activeRepo.repo}.`
                    : `Legacy search mode. Neural indexing is recommended for ${activeRepo.owner}/${activeRepo.repo}.`}
                </span>
                {activeRepo.isIndexed ? (
                   <div className="flex flex-col items-center gap-4">
                     <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Neural Link Established
                     </div>
                     {repoInsight ? (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 italic text-sm text-white/60 max-w-lg"
                       >
                         "{repoInsight}"
                       </motion.div>
                     ) : (
                       <button 
                        onClick={async () => {
                          setIsSummarizing(true);
                          try {
                            const res = await repoSummary(activeRepo.owner, activeRepo.repo);
                            setrepoInsight(res.data.summary);
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSummarizing(false);
                          }
                        }}
                        disabled={isSummarizing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-all"
                       >
                         {isSummarizing ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                         Generate Repo Insight
                       </button>
                     )}
                   </div>
                ) : (
                  <button 
                    onClick={handleIndexRepo}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-500/20 transition-all"
                  >
                    <CircleAlert size={12} />
                    Neural Indexing Required
                  </button>
                )}
              </div>
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
                    placeholder={previewRepo ? `Search ${previewRepo.repo}...` : (activeRepo ? `Search ${activeRepo.repo}...` : "Ask anything about the codebase...")}
                    className="w-full bg-transparent text-2xl md:text-3xl font-semibold placeholder-white/5 focus:outline-none relative z-0 pl-12 pr-12"
                  />
                  {query && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        setQuery('');
                        setResults([]);
                        setGroupedResults({});
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-0 p-2 text-white/20 hover:text-white transition-colors z-10"
                    >
                      <X size={20} />
                    </motion.button>
                  )}
                </div>
                
                {activeRepo && (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleClearActiveRepo}
                    className="ml-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all group"
                    title="Exit Repo"
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
                  className="mt-8 flex flex-col items-center gap-4 relative z-30"
                >
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <button 
                      onClick={() => setSearchMode('persistent')}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${searchMode === 'persistent' ? 'bg-accent-blue text-white shadow-[0_0_20px_rgba(0,112,243,0.3)]' : 'text-white/30 hover:text-white/60'}`}
                    >
                      <Database size={12} />
                      Permanent Index
                    </button>
                    <button 
                      onClick={() => setSearchMode('ephemeral')}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${searchMode === 'ephemeral' ? 'bg-accent-purple text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'text-white/30 hover:text-white/60'}`}
                    >
                      <Zap size={12} />
                      Direct Search
                    </button>
                  </div>

                  <div className={`flex items-center glass-dark rounded-3xl pl-5 pr-2 py-2 border-white/10 min-w-[340px] md:min-w-[450px] focus-within:border-${searchMode === 'ephemeral' ? 'accent-purple' : 'accent-blue'}/40 transition-all shadow-2xl relative z-40 group`}>
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
                    {repoUrl && (
                      <button 
                        onClick={() => setRepoUrl('')}
                        className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors mr-2"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button 
                      onClick={handleIndexRepo}
                      className={`${searchMode === 'ephemeral' ? 'bg-accent-purple' : 'bg-accent-blue'} hover:opacity-80 text-white text-[10px] font-black py-2.5 px-6 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-95 border border-white/10`}
                    >
                      {searchMode === 'ephemeral' ? 'Direct Search' : 'Index Now'}
                    </button>
                  </div>
                  
                  {searchMode === 'ephemeral' && (
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] animate-pulse">
                      Zero-Persistence Mode: Session data auto-destroys in 1hr
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Neural Workspace Discovery Section */}
            {!activeRepo && !query && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-16 space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Cpu size={14} className="text-accent-blue" />
                    Your Recently Indexed Repos
                  </h3>
                  <Link 
                    to="/repos" 
                    className="text-[10px] font-black uppercase tracking-widest text-accent-blue hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    View Your Repo History
                    <ArrowLeft size={12} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
                                <div className="space-y-12">
                  {loadingRepos ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => <div key={i} className="h-24 glass-dark rounded-3xl border border-white/5 animate-pulse" />)}
                    </div>
                  ) : (
                    <>
                      {/* Section 1: Neural Stream (Direct) */}
                      {directRepos.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-2">
                             <div className="p-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan">
                               <Zap size={14} className="animate-pulse" />
                             </div>
                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-cyan/60">Neural Stream (Ephemeral Sessions)</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {directRepos.map(repo => (
                              <motion.button
                                key={`dir-${repo.owner}-${repo.name}`}
                                whileHover={{ scale: 1.02, borderColor: 'rgba(0,242,255,0.3)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setSearchMode('ephemeral');
                                  setRepoUrl(`${repo.owner}/${repo.name}`);
                                  handleIndexRepo();
                                }}
                                className="flex items-center gap-4 p-4 glass-dark rounded-3xl border border-white/5 text-left group transition-all relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-accent-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan/20 transition-colors">
                                  <Zap size={18} />
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                  <p className="text-sm font-bold truncate">{repo.name}</p>
                                  <p className="text-[10px] text-white/30 truncate">{repo.owner}</p>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Knowledge Vault (Permanent) */}
                      {indexedRepos.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-2">
                             <div className="p-1.5 rounded-lg bg-accent-blue/10 text-accent-blue">
                               <Database size={14} />
                             </div>
                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue/60">Knowledge Vault (Permanent Index)</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {indexedRepos.map(repo => (
                              <motion.button
                                key={repo.githubId}
                                whileHover={{ scale: 1.02, borderColor: 'rgba(47,129,247,0.3)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setSearchMode('persistent');
                                  setActiveRepo({ owner: repo.owner, repo: repo.name, isIndexed: true });
                                  setSearchParams({ owner: repo.owner, repo: repo.name });
                                  searchInputRef.current?.focus();
                                }}
                                className="flex items-center gap-4 p-4 glass-dark rounded-3xl border border-white/5 text-left group transition-all relative overflow-hidden"
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue/20 transition-colors">
                                  <Book size={18} />
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                  <p className="text-sm font-bold truncate">{repo.name}</p>
                                  <p className="text-[10px] text-white/30 truncate">{repo.owner}</p>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                      {directRepos.length === 0 && indexedRepos.length === 0 && (
                        <div className="col-span-full py-12 text-center glass-dark rounded-[2.5rem] border border-white/5 border-dashed">
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Database size={20} className="text-white/20" />
                          </div>
                          <h4 className="text-sm font-bold mb-2">Repository History Empty</h4>
                          <p className="text-[10px] text-white/30 max-w-[200px] mx-auto leading-relaxed mb-6">
                            No repositories indexed yet. You can restore your previously indexed repos below.
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              try {
                                setLoadingRepos(true);
                                await import('../services/api').then(m => m.claimOrphans());
                                window.location.reload();
                              } catch (err) {
                                console.error('Migration failed:', err);
                              } finally {
                                setLoadingRepos(false);
                              }
                            }}
                            className="px-6 py-2.5 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                          >
                            Restore My Repos
                          </motion.button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          
          {/* Intelligence Panel Triggered for Active Repo */}
          {activeRepo && (
             <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-12"
             >
                <div className="lg:col-span-2 space-y-12">
                   {/* This was where the search bar section ended */}
                </div>
                <IntelligencePanel genome={repoGenome} isLoading={isLoadingGenome} />
             </motion.div>
          )}
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
              className="space-y-12"
            >
               <div className="flex items-center justify-between px-2 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-3">
                    <Hash size={14} className="text-accent-blue" />
                    {results.length} Contextual Matches
                  </h2>
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/2 border border-white/5 backdrop-blur-md">
                     <Database size={12} className={ephemeralSessionId ? "text-accent-purple" : "text-accent-blue"} />
                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                       {ephemeralSessionId ? "Ephemeral Session Active" : "SAM Indexing Engine"}
                     </span>
                  </div>
               </div>

               {/* Tree-Style Grouped Results */}
               {Object.entries(groupedResults).map(([repoKey, items]) => (
                <div key={repoKey} className="space-y-6">
                  {/* Repo Header */}
                  <div className="flex items-center gap-3 px-6 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                      <Globe className="text-accent-blue" size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest leading-none mb-1">Repository</span>
                      <span className="text-xl font-bold text-white tracking-tight">{repoKey}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                      <FileCode size={12} className="text-gray-500" />
                      <span className="text-[10px] font-bold text-gray-400">
                        {items.length} file matches
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {items.map((result, index) => (
                      <ResultCard 
                        key={`${result.owner}-${result.repo}-${result.path}-${index}`} 
                        result={result} 
                        idx={index} 
                        copiedId={copiedId} 
                        handleCopy={handleCopy} 
                        query={debouncedQuery} 
                      />
                    ))}
                  </div>
                </div>
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
                No matches found in the repository index. <br /> 
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
        onSelectSearch={(item) => {
          setQuery(item.query);
          if (item.repo && item.owner) {
            setActiveRepo({ 
              owner: item.owner, 
              repo: item.repo, 
              isIndexed: true,
              isEphemeral: item.isEphemeral
            });
            setSearchParams({ 
              owner: item.owner, 
              repo: item.repo,
              mode: item.isEphemeral ? 'ephemeral' : 'persistent',
              sid: item.isEphemeral ? `${item.owner.toLowerCase()}:${item.repo.toLowerCase()}` : undefined
            });
          } else {
            setActiveRepo(null);
            setSearchParams({});
          }
        }}
      />

      <footer className="border-t border-white/5 py-16 px-6 mt-20 relative bg-black/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
              <p className="text-[10px] font-black tracking-[0.5em] uppercase text-white/60">
                SAM Code Intelligence
              </p>
            </div>
            <p className="text-xs text-white/20 font-medium max-w-sm leading-relaxed">
              Decentralized repository indexing with sub-millisecond contextual retrieval and advanced dependency mapping. Powered by the **SAM Indexing Engine**.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">DB CLOUD SYNC: ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-blue/5 border border-accent-blue/10">
                   <Database size={10} className="text-accent-blue/60" />
                   <span className="text-[9px] font-bold text-accent-blue/60 uppercase tracking-widest">SAM REPOSITORY INDEX V2.0</span>
                </div>
              </div>
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
                Sole Developer
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
