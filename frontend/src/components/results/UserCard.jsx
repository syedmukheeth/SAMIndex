import React from 'react';
import { Users, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const UserCard = ({ user }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.2)' }}
      className="p-6 glass-dark rounded-3xl border border-white/5 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex gap-5 items-start">
        <Link to={`/${user.username}`} className="relative">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            src={user.avatar} 
            alt={user.username} 
            className="w-16 h-16 rounded-2xl border border-white/10 cursor-pointer object-cover shadow-2xl"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent-blue rounded-full border-2 border-obsidian-950 flex items-center justify-center text-[10px] text-white font-black">
            ✓
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/${user.username}`}>
              <h3 className="text-lg font-bold text-white hover:text-accent-blue transition-colors truncate">
                {user.username}
              </h3>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-accent-purple">
              Rank #{user.score.toFixed(0)}
            </span>
          </div>
          
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
            {user.bio || "No bio available for this user."}
          </p>
  
          <div className="flex items-center gap-5 mt-5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
              <Users size={12} className="text-accent-blue" />
              <span>{user.followers.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
              <Briefcase size={12} className="text-accent-cyan" />
              <span>{user.publicRepos}</span>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-auto text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 rounded-xl border border-white/5 transition-all"
            >
              View Profile
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserCard;
