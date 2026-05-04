import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import RepoCard from '../components/results/RepoCard';
import UserCard from '../components/results/UserCard';
import Skeleton from '../components/ui/Skeleton';
import { Search, Filter, RefreshCcw, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f6f8fa]">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <form onSubmit={handleSearch} className="flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories or users..." 
                className="w-full bg-white border border-[#d0d7de] rounded-md py-2 pl-10 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#2da44e] text-white font-bold py-2 px-4 rounded-md hover:bg-[#2c974b] disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <button 
            onClick={handleSync}
            disabled={syncing || !query}
            className="flex items-center gap-2 text-sm font-semibold border border-[#d0d7de] bg-white px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync from GitHub"}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#d0d7de] mb-6 flex gap-8">
          <button 
            onClick={() => setActiveTab('repos')}
            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'repos' ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Repositories
            <span className={`text-xs ml-2 px-2 py-0.5 rounded-full bg-gray-100 ${activeTab === 'repos' ? 'text-black font-bold' : 'text-gray-500'}`}>
              {results.repositories.length}
            </span>
            {activeTab === 'repos' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#fd8c73]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'users' ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Users
            <span className={`text-xs ml-2 px-2 py-0.5 rounded-full bg-gray-100 ${activeTab === 'users' ? 'text-black font-bold' : 'text-gray-500'}`}>
              {results.users.length}
            </span>
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#fd8c73]"></div>}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 border border-[#d0d7de] rounded-lg bg-white space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : activeTab === 'repos' ? (
            results.repositories.length > 0 ? (
              results.repositories.map(repo => <RepoCard key={repo.githubId} repo={repo} />)
            ) : (
              <div className="text-center py-20 bg-white border border-[#d0d7de] rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800">No repositories found</h3>
                <p className="text-gray-500 mt-2">Try syncing a user to populate the database.</p>
              </div>
            )
          ) : (
            results.users.length > 0 ? (
              results.users.map(user => <UserCard key={user.githubId} user={user} />)
            ) : (
              <div className="text-center py-20 bg-white border border-[#d0d7de] rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800">No users found</h3>
                <p className="text-gray-500 mt-2">Enter a username and click 'Sync' to fetch data.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
