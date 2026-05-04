import React from 'react';
import { Star, GitFork, Book, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const RepoCard = ({ repo }) => {
  return (
    <motion.div 
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.2)' }}
      className="p-6 glass-dark rounded-3xl border border-white/5 transition-all group cursor-pointer relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
            <Book size={16} />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-accent-blue transition-colors truncate max-w-[240px]">
            {repo.owner}/{repo.name}
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-white/30">
            Public
          </span>
        </div>
        <ArrowUpRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
      </div>
      
      <p className="text-sm text-white/40 leading-relaxed line-clamp-2 min-h-[40px] mb-6">
        {repo.description || "No description provided for this repository."}
      </p>

      <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.1em] text-white/30">
        {repo.language && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_10px_rgba(47,129,247,0.5)]"></span>
            <span>{repo.language}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 hover:text-white transition-colors">
          <Star size={12} className="text-accent-purple" />
          <span>{repo.stars.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-white transition-colors">
          <GitFork size={12} className="text-accent-cyan" />
          <span>{repo.forks.toLocaleString()}</span>
        </div>
        <div className="ml-auto text-[9px] font-bold opacity-30">
          Last Synced 2D AGO
        </div>
      </div>
    </motion.div>
  );
};

export default RepoCard;
