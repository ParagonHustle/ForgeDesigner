import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

const ResourcesOverview = () => {
  const { user } = useDiscordAuth();
  const { resources, fetchResources } = useGameStore();

  // Ensure we have the latest resources data
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

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
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="bg-[#1A1A2E] rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h2 className="text-xl font-cinzel font-bold mb-4">Resources</h2>
      
      <motion.div 
        className="space-y-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          className="flex justify-between items-center"
          variants={item}
        >
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop" 
              alt="Forge Tokens" 
              className="w-8 h-8 rounded-full mr-2"
            />
            <div>
              <div className="text-sm font-semibold">Forge Tokens</div>
              <div className="text-xs text-[#C8B8DB]/70">Premium Currency</div>
            </div>
          </div>
          <div className="text-[#FFD700] font-bold">{user?.forgeTokens || 0}</div>
        </motion.div>
        
        <motion.div 
          className="flex justify-between items-center"
          variants={item}
        >
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=150&h=150&fit=crop" 
              alt="Rogue Credits" 
              className="w-8 h-8 rounded-full mr-2"
            />
            <div>
              <div className="text-sm font-semibold">Rogue Credits</div>
              <div className="text-xs text-[#C8B8DB]/70">Standard Currency</div>
            </div>
          </div>
          <div className="text-[#C8B8DB] font-bold">{user?.rogueCredits || 0}</div>
        </motion.div>
        
        <motion.div 
          className="flex justify-between items-center"
          variants={item}
        >
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1618325500063-14cd8117369c?w=150&h=150&fit=crop" 
              alt="Soul Shards" 
              className="w-8 h-8 rounded-full mr-2"
            />
            <div>
              <div className="text-sm font-semibold">Soul Shards</div>
              <div className="text-xs text-[#C8B8DB]/70">Character Upgrades</div>
            </div>
          </div>
          <div className="text-[#00B9AE] font-bold">{user?.soulShards || 0}</div>
        </motion.div>
        
        {resources.slice(0, 2).map((resource) => (
          <motion.div 
            key={resource.id}
            className="flex justify-between items-center"
            variants={item}
          >
            <div className="flex items-center">
              <img 
                src={resource.iconUrl || "https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop"} 
                alt={resource.name} 
                className="w-8 h-8 rounded-full mr-2"
              />
              <div>
                <div className="text-sm font-semibold">{resource.name}</div>
                <div className="text-xs text-[#C8B8DB]/70">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</div>
              </div>
            </div>
            <div className="text-[#C8B8DB] font-bold">{resource.quantity}</div>
          </motion.div>
        ))}
      </motion.div>
      
      <div className="flex flex-col space-y-2 mt-4">
        <Link href="/characters">
          <motion.button 
            className="w-full bg-[#432874]/40 hover:bg-[#432874]/60 transition-colors py-2 rounded-lg text-sm"
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View All Resources
          </motion.button>
        </Link>
        
        {/* Admin Button to Add 15,000 Essence */}
        <motion.button 
          className="w-full bg-[#00B9AE]/30 hover:bg-[#00B9AE]/50 transition-colors py-2 rounded-lg text-sm text-[#00B9AE]"
          variants={item}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            try {
              const response = await fetch('/api/admin/add-essence', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                // Refresh resources after adding Essence
                fetchResources();
                alert('Added 15,000 Essence!');
              } else {
                console.error('Failed to add Essence:', await response.text());
              }
            } catch (error) {
              console.error('Error adding Essence:', error);
            }
          }}
        >
          Add 15,000 Essence (Admin)
        </motion.button>
        
        {/* Admin Button to Add Currency */}
        <motion.button 
          className="w-full bg-[#FFD700]/30 hover:bg-[#FFD700]/50 transition-colors py-2 rounded-lg text-sm text-[#FFD700]"
          variants={item}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            try {
              const response = await fetch('/api/admin/add-currency', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                // Refresh the user data to update the currencies
                window.location.reload(); // Force a full reload to update currency display in header
                alert('Added 5,000 Rogue Credits and 5,000 Forge Tokens!');
              } else {
                console.error('Failed to add Currency:', await response.text());
              }
            } catch (error) {
              console.error('Error adding Currency:', error);
            }
          }}
        >
          Add 5,000 Credits & Tokens (Admin)
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ResourcesOverview;
