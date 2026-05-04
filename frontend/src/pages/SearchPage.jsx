import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import RepoCard from '../components/results/RepoCard';
import UserCard from '../components/results/UserCard';
import Skeleton from '../components/ui/Skeleton';
import { Search, Filter, RefreshCcw, CircleAlert } from 'lucide-react';
import { searchGitHub, fetchUser } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], repositories: [] });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('repos');

  const debouncedQuery = useDebounce(query, 500);

  // Live Search Effect
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery) {
        setResults({ users: [], repositories: [] });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await searchGitHub(debouncedQuery);
        setResults(data.data);
      } catch (err) {
        setError("Failed to fetch results. Please check if the backend is running.");
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    // Search is handled by debouncedQuery effect
  };

  const handleSync = async () => {
    if (!query) return;
    setSyncing(true);
    try {
      await fetchUser(query);
      handleSearch();
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-white selection:bg-accent-blue/30">
      <main className="max-w-6xl mx-auto px-6 py-24">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12">
          <form onSubmit={handleSearch} className="flex-1 w-full flex gap-3">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories or users..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 transition-all group-hover:border-white/20"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent-blue transition-colors" size={20} />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="bg-white text-black font-black py-3 px-8 rounded-2xl hover:bg-white/90 disabled:opacity-50 transition-all shadow-xl active:shadow-none uppercase tracking-tight text-xs"
            >
              {loading ? "Searching..." : "Search"}
            </motion.button>
          </form>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSync}
            disabled={syncing || !query}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest glass-dark px-6 py-3 rounded-2xl hover:bg-white/5 disabled:opacity-50 transition-all border border-white/10"
          >
            <RefreshCcw size={16} className={syncing ? "animate-spin" : "text-accent-cyan"} />
            {syncing ? "Syncing..." : "Sync from GitHub"}
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/5 mb-10 flex gap-10">
          <button 
            onClick={() => setActiveTab('repos')}
            className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === 'repos' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            Repositories
            <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-full ${activeTab === 'repos' ? 'bg-accent-blue text-white' : 'bg-white/5 text-white/30'}`}>
              {results.repositories.length}
            </span>
            {activeTab === 'repos' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-[2px] bg-accent-blue shadow-[0_0_10px_rgba(47,129,247,0.5)]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === 'users' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            Users
            <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-full ${activeTab === 'users' ? 'bg-accent-purple text-white' : 'bg-white/5 text-white/30'}`}>
              {results.users.length}
            </span>
            {activeTab === 'users' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-[2px] bg-accent-purple shadow-[0_0_10px_rgba(163,113,247,0.5)]" />
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 glass-dark border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400"
          >
            <CircleAlert size={20} />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="p-6 glass-dark rounded-3xl border border-white/5 space-y-4">
                <Skeleton className="h-6 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
            ))
          ) : activeTab === 'repos' ? (
            results.repositories.length > 0 ? (
              results.repositories.map(repo => <RepoCard key={repo.githubId} repo={repo} />)
            ) : (
              <div className="col-span-full text-center py-32 glass-dark rounded-3xl border border-white/5 border-dashed">
                <h3 className="text-xl font-bold text-white/80">No repositories found</h3>
                <p className="text-white/30 mt-2 text-sm">Try syncing a user to populate the database.</p>
              </div>
            )
          ) : (
            results.users.length > 0 ? (
              results.users.map(user => <UserCard key={user.githubId} user={user} />)
            ) : (
              <div className="col-span-full text-center py-32 glass-dark rounded-3xl border border-white/5 border-dashed">
                <h3 className="text-xl font-bold text-white/80">No users found</h3>
                <p className="text-white/30 mt-2 text-sm">Enter a username and click 'Sync' to fetch data.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
