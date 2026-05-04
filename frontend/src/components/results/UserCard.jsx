import React from 'react';
import { Users, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const UserCard = ({ user }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 border border-[#d0d7de] rounded-lg bg-white flex gap-4 items-start hover:shadow-sm transition-shadow"
    >
      <Link to={`/${user.username}`}>
        <img 
          src={user.avatar} 
          alt={user.username} 
          className="w-16 h-16 rounded-full border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/${user.username}`}>
            <h3 className="text-lg font-semibold text-[#0969da] hover:underline cursor-pointer">
              {user.username}
            </h3>
          </Link>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-600">
            Rank: #{user.score.toFixed(0)}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mt-1 line-clamp-1 italic">
          {user.bio || "No bio available."}
        </p>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{user.followers.toLocaleString()} followers</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase size={14} />
            <span>{user.publicRepos} repos</span>
          </div>
        </div>
      </div>

      <button className="text-xs font-bold border border-[#d0d7de] bg-[#f6f8fa] px-3 py-1.5 rounded-md hover:bg-[#ebedef] transition-colors">
        Follow
      </button>
    </motion.div>
  );
};

export default UserCard;
