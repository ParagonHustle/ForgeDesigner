import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { ActivityLog } from '@shared/schema';

const RecentActivity = () => {
  // Fetch recent activity logs
  const { data: activityLogs, isLoading } = useQuery<ActivityLog[]>({ 
    queryKey: ['/api/activity?limit=5'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMilliseconds = now.getTime() - activityDate.getTime();
    
    // Convert to seconds
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    // Convert to minutes
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    // Convert to hours
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    // Convert to days
    const diffInDays = Math.floor(diffInHours / 24);
    
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  const getActivityColor = (activityType: string) => {
    const typeColors: Record<string, string> = {
      dungeon_completed: '[#FF9D00]',
      dungeon_started: '[#DC143C]',
      aura_crafted: '[#FF9D00]',
      aura_fusion_completed: '[#FF9D00]',
      farming_completed: '[#228B22]',
      farming_started: '[#228B22]',
      item_purchased: '[#C8B8DB]',
      character_created: '[#00B9AE]',
      aura_created: '[#00B9AE]',
    };

    return typeColors[activityType] || '[#C8B8DB]/50';
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  if (isLoading) {
    return (
      <motion.div 
        className="bg-[#1A1A2E] rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-cinzel font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-l-2 border-[#432874]/30 pl-3 py-1">
              <div className="h-4 bg-[#432874]/20 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-[#432874]/10 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-[#1A1A2E] rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-xl font-cinzel font-bold mb-4">Recent Activity</h2>
      
      <motion.div 
        className="space-y-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {activityLogs && activityLogs.length > 0 ? (
          activityLogs.map((log) => (
            <motion.div 
              key={log.id} 
              className={`border-l-2 border-${getActivityColor(log.activityType)} pl-3 py-1`}
              variants={item}
            >
              <div className="text-sm font-medium">{log.description}</div>
              <div className="text-xs text-[#C8B8DB]/70">{formatTimeAgo(log.timestamp)}</div>
            </motion.div>
          ))
        ) : (
          <div className="text-center text-[#C8B8DB]/50 py-4">
            No recent activity to display
          </div>
        )}
      </motion.div>
      
      <motion.button 
        className="w-full mt-4 bg-[#432874]/40 hover:bg-[#432874]/60 transition-colors py-2 rounded-lg text-sm"
        variants={item}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View Activity Log
      </motion.button>
    </motion.div>
  );
};

export default RecentActivity;
