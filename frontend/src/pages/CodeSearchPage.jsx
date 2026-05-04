import React, { useState, useEffect } from 'react';
import { Search, Code, Book, FileText, Loader2, Database, CheckCircle2, AlertCircle, Copy, Check, Terminal, Zap, Hash, ExternalLink } from 'lucide-react';
import { searchCode, indexRepo, getIndexStatus } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

const CodeSearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Indexing State
  const [repoUrl, setRepoUrl] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState(null);
  const [indexProgress, setIndexProgress] = useState(0);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await searchCode(debouncedQuery);
        setResults(response.data);
      } catch (error) {
        console.error('Code search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleIndexRepo = async () => {
    // Clean URL/Path
    let cleanPath = repoUrl.trim().replace(/\/$/, ""); // Remove trailing slash
    if (cleanPath.includes('github.com/')) {
      cleanPath = cleanPath.split('github.com/')[1];
    }
    const parts = cleanPath.split('/').filter(Boolean);
    
    if (parts.length < 2) {
      setIndexStatus({ type: 'error', message: 'Please provide both owner and repository (e.g. syedmukheeth/SAMIndex)' });
      return;
    }

    const owner = parts[0];
    const repo = parts[1];
    setIsIndexing(true);
    setIndexStatus(null);
    setIndexProgress(10); // Start progress

    // Fake progress animation since it's a single request
    const progressInterval = setInterval(() => {
      setIndexProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 500);

    try {
      const response = await indexRepo(owner, repo);
      
      if (response.data && response.data.jobId) {
        // We have a background job (or local fallback job)
        const jobId = response.data.jobId;
        
        // Start Polling
        const pollStatus = async () => {
          try {
            const statusRes = await getIndexStatus(jobId);
            const { state, progress, result } = statusRes.data;
            
            setIndexProgress(progress);
            
            if (state === 'completed') {
              setIndexStatus({ 
                type: 'success', 
                message: `Successfully indexed ${result?.filesIndexed || 'all'} files from ${repo}` 
              });
              setIsIndexing(false);
              setRepoUrl('');
              setTimeout(() => {
                setIndexStatus(null);
                setIndexProgress(0);
              }, 5000);
            } else if (state === 'failed') {
              setIndexStatus({ type: 'error', message: 'Indexing failed. Please check logs.' });
              setIsIndexing(false);
            } else {
              // Still active, poll again
              setTimeout(pollStatus, 2000);
            }
          } catch (err) {
            console.error('Polling failed:', err);
            setIsIndexing(false);
            setIndexStatus({ type: 'error', message: 'Lost connection to indexing server' });
          }
        };
        
        pollStatus();
      } else {
        // Direct response (legacy or small repo)
        setIndexProgress(100);
        setIndexStatus({ 
          type: 'success', 
          message: `Successfully indexed ${response.data.filesIndexed} files from ${repo}` 
        });
        setIsIndexing(false);
        setRepoUrl('');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setIndexProgress(0);
      setIndexStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Indexing failed. Check repository visibility.' 
      });
      setIsIndexing(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const highlightKeyword = (text, keyword) => {
    if (!text) return '';
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === keyword.toLowerCase() 
        ? <span key={i} className="bg-blue-500/40 text-blue-100 font-bold px-0.5 rounded-[2px] border-b-2 border-blue-400/50">{part}</span> 
        : part
    );
  };

  const openGitHub = (owner, repo, path, line) => {
    const url = `https://github.com/${owner}/${repo}/blob/main/${path}${line ? `#L${line}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
            <Zap className="w-3 h-3 fill-current" />
            Next-Gen Code Intelligence
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
            Search across the index
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Deep-code analysis engine powered by SamIndex. Explore thousands of repositories with line-level context.
          </p>
        </div>

        {/* Unified Search & Index Bar */}
        <div className="mb-16 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
              <div className="relative flex items-center bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-all shadow-2xl">
                <Search className="ml-5 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Find something in the code..."
                  className="w-full bg-transparent py-5 px-4 focus:outline-none text-xl text-white placeholder-gray-600"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="relative flex items-center bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-xl px-2 shadow-2xl min-w-[300px]">
               <input
                type="text"
                placeholder="Index a new repo..."
                className="bg-transparent py-3 px-4 focus:outline-none text-sm text-white placeholder-gray-600 flex-1"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <button
                onClick={handleIndexRepo}
                disabled={isIndexing || !repoUrl}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2 rounded-lg transition-all"
                title="Index Repository"
              >
                {isIndexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              </button>

              {/* Progress Bar Overlay */}
              {isIndexing && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#30363d] rounded-b-xl overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${indexProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {indexStatus && (
            <div className={`flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-2 ${indexStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {indexStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {indexStatus.message}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <Terminal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white mb-1">Scanning Neural Index</p>
                <p className="text-gray-500 text-sm">Aggregating matching snippets from indexed projects...</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  {results.length} Matches Found
                </h2>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Showing top relevance
                </div>
              </div>

              <div className="space-y-6">
                {results.map((result, idx) => (
                  <div key={idx} className="group relative bg-[#161b22]/40 backdrop-blur-sm border border-[#30363d] rounded-2xl overflow-hidden hover:border-blue-500/30 hover:bg-[#161b22]/60 transition-all duration-300 shadow-xl">
                    {/* Glossy Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1c2128] to-transparent border-b border-[#30363d]">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                          <Book className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                          <div 
                            className="flex items-center gap-2 cursor-pointer group/link"
                            onClick={() => openGitHub(result.owner, result.repo, result.path, result.snippets[0]?.line)}
                          >
                            <span className="text-sm font-bold text-white group-hover/link:text-blue-400 transition-colors">
                              {result.owner} <span className="text-gray-600">/</span> {result.repo}
                            </span>
                            <ExternalLink className="w-3 h-3 text-gray-600 group-hover/link:text-blue-400 transition-colors" />
                          </div>
                          <span 
                            className="text-xs text-gray-500 font-mono flex items-center gap-1 cursor-pointer hover:text-blue-300 transition-colors"
                            onClick={() => openGitHub(result.owner, result.repo, result.path, result.snippets[0]?.line)}
                          >
                            <FileText className="w-3 h-3" />
                            {result.path} <span className="text-blue-500/70 ml-1">#L{result.snippets[0]?.line}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                           <span className="text-[10px] text-gray-500 uppercase tracking-tighter font-bold">Language</span>
                           <span className="text-xs font-bold text-blue-400">{result.path.split('.').pop()?.toUpperCase()}</span>
                        </div>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const fullSnippet = result.snippets.map(s => s.content.replace(/\.\.\.\n/g, '').replace(/\n\.\.\./g, '')).join('\n---\n');
                            handleCopy(fullSnippet, idx); 
                          }}
                          className={`p-2.5 rounded-xl border border-[#30363d] transition-all flex items-center gap-2 ${
                            copiedId === idx 
                              ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                              : 'hover:bg-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          {copiedId === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span className="text-xs font-bold hidden sm:block">{copiedId === idx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Code Editor Style Body */}
                    <div 
                      className="relative bg-[#0d1117] p-6 group-hover:bg-[#0a0d12] transition-colors cursor-pointer space-y-6"
                      onClick={() => openGitHub(result.owner, result.repo, result.path, result.snippets[0]?.line)}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      {result.snippets.map((snippet, sIdx) => (
                        <div key={sIdx} className="flex gap-4 overflow-x-auto custom-scrollbar">
                          {/* Fake line numbers for aesthetic */}
                          <div className="hidden sm:flex flex-col text-right text-gray-700 font-mono text-[13.5px] select-none pr-4 border-r border-[#30363d]/30 min-w-[40px]">
                            {snippet.content.split('\n').map((_, i) => (
                              <div key={i}>{snippet.line - 2 + i > 0 ? snippet.line - 2 + i : ''}</div>
                            ))}
                          </div>
                          <pre className="text-[13.5px] font-mono leading-relaxed text-gray-300">
                            <code>{highlightKeyword(snippet.content, debouncedQuery)}</code>
                          </pre>
                        </div>
                      ))}
                      
                      {/* View on GitHub Overlay Badge */}
                      <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
                        <ExternalLink className="w-3 h-3" />
                        DEEP LINK TO GITHUB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-full bg-red-500/5 border border-red-500/10 flex items-center justify-center mb-6">
                <Code className="w-10 h-10 text-red-500/30" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Code mismatch</h3>
              <p className="text-gray-500 max-w-sm">
                No indexed files contained the token <span className="text-red-400 font-mono">"{debouncedQuery}"</span>. Try indexing a new repository above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
              {[
                { icon: <Terminal className="w-5 h-5" />, title: "Recursive Scan", desc: "Full-tree recursive scanning for deep code discovery." },
                { icon: <Zap className="w-5 h-5" />, title: "Instant Search", desc: "Weighted text indexing for sub-second query execution." },
                { icon: <Hash className="w-5 h-5" />, title: "Line Context", desc: "Intelligent snippet extraction with contextual line markers." },
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#161b22]/40 border border-[#30363d] hover:border-blue-500/20 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h4 className="text-white font-bold mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="max-w-6xl mx-auto px-6 pb-20 mt-20 border-t border-[#30363d] pt-8 text-center">
        <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">
          Index Engine v2.5 // SamIndex Deep-Link Search
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d1117;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default CodeSearchPage;
