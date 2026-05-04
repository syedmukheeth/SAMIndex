import React from 'react';
import { Star, GitFork, Book } from 'lucide-react';
import { motion } from 'framer-motion';

const RepoCard = ({ repo }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border border-[#d0d7de] rounded-lg bg-white hover:bg-[#f6f8fa] transition-colors group cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Book size={18} className="text-gray-500" />
          <h3 className="text-lg font-semibold text-[#0969da] group-hover:underline truncate max-w-[200px]">
            {repo.owner}/{repo.name}
          </h3>
          <span className="text-xs px-2 py-0.5 border border-[#d0d7de] rounded-full text-gray-600">
            Public
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[40px]">
        {repo.description || "No description provided."}
      </p>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
        {repo.language && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#3178c6]"></span>
            <span>{repo.language}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Star size={14} />
          <span>{repo.stars.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <GitFork size={14} />
          <span>{repo.forks.toLocaleString()}</span>
        </div>
        <div className="ml-auto text-gray-400">
          Updated recently
        </div>
      </div>
    </motion.div>
  );
};

export default RepoCard;
