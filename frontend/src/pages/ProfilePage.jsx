import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import RepoCard from '../components/results/RepoCard';
import Skeleton from '../components/ui/Skeleton';
import { ChevronLeft, Users, Briefcase, MapPin, Globe } from 'lucide-react';
import { getUserDetails } from '../services/api';

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
      <div className="min-h-screen bg-[#f6f8fa]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/4 space-y-4">
              <Skeleton className="w-full aspect-square rounded-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-1/4" />
              <div className="grid grid-cols-1 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f8fa]">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-800">{error}</h2>
          <Link to="/" className="text-[#0969da] hover:underline mt-4 inline-block flex items-center justify-center gap-1">
            <ChevronLeft size={20} /> Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const { user, repositories } = data;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/" className="text-gray-500 hover:text-[#0969da] flex items-center gap-1 mb-8 text-sm transition-colors">
          <ChevronLeft size={16} /> Back to Search
        </Link>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar: User Info */}
          <aside className="w-full md:w-1/4">
            <img 
              src={user.avatar} 
              alt={user.username} 
              className="w-full aspect-square rounded-full border border-gray-200 mb-4 shadow-sm"
            />
            <h1 className="text-2xl font-bold text-[#1f2328]">{user.username}</h1>
            <p className="text-xl text-gray-500 font-light mb-4">@{user.username}</p>
            
            <p className="text-[#1f2328] mb-6">{user.bio || "No bio available."}</p>

            <button className="w-full py-1.5 px-4 bg-[#f6f8fa] border border-[#d0d7de] rounded-md font-bold text-sm mb-6 hover:bg-[#ebedef] transition-colors">
              Follow
            </button>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span className="font-bold text-[#1f2328]">{user.followers.toLocaleString()}</span> followers
                <span className="mx-1">•</span>
                <span className="font-bold text-[#1f2328]">{user.following.toLocaleString()}</span> following
              </div>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-gray-400" />
                <span>{user.publicRepos} public repositories</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-[#0969da] bg-blue-50 p-2 rounded-md border border-blue-100">
                <span>SamIndex Score: {user.score.toFixed(2)}</span>
              </div>
            </div>
          </aside>

          {/* Main Content: Repositories */}
          <main className="flex-1">
            <div className="border-b border-[#d0d7de] mb-6">
              <nav className="flex gap-8">
                <button className="pb-4 border-b-2 border-[#fd8c73] font-semibold text-sm flex items-center gap-2">
                  Repositories
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-bold">{repositories.length}</span>
                </button>
                <button className="pb-4 text-gray-500 hover:text-gray-700 text-sm">Projects</button>
                <button className="pb-4 text-gray-500 hover:text-gray-700 text-sm">Packages</button>
                <button className="pb-4 text-gray-500 hover:text-gray-700 text-sm">Stars</button>
              </nav>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {repositories.map(repo => (
                <RepoCard key={repo.githubId} repo={repo} />
              ))}
              {repositories.length === 0 && (
                <div className="text-center py-20 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  No repositories synced for this user.
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
