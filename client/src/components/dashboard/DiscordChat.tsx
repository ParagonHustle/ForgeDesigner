import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/zustandStore';
import { Send, Maximize2, Minimize2 } from 'lucide-react';
import { useDiscordAuth } from '@/lib/discordAuth';

const DiscordChat = () => {
  const { discordMessages, addDiscordMessage } = useGameStore();
  const { user } = useDiscordAuth();
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discordMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    // Add message to local state
    addDiscordMessage(user.username, message);
    
    // Clear input
    setMessage('');
    
    // In a real implementation, this would send to Discord via WebSocket
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
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
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-cinzel font-bold">Discord</h2>
        <div className="bg-[#FF9D00]/20 rounded-full px-2 py-0.5 text-xs text-[#FF9D00]">
          {Math.floor(Math.random() * 10) + 5} Online
        </div>
      </div>
      
      <motion.div 
        className="h-32 overflow-y-auto bg-[#1F1D36]/50 rounded-lg p-3 mb-3 text-sm"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {discordMessages.map((msg, index) => (
          <motion.div key={msg.id} className="mb-2" variants={item}>
            <span className={`font-semibold ${
              msg.username === 'GuildMaster' ? 'text-[#FF9D00]' : 
              msg.username === 'AuraCollector' ? 'text-[#00B9AE]' : 
              'text-[#C8B8DB]'
            }`}>
              {msg.username}:
            </span>
            <span className="text-[#C8B8DB]/90"> {msg.content}</span>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </motion.div>
      
      <div className="flex">
        <input 
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-[#1F1D36]/80 border border-[#432874]/30 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF9D00]"
        />
        <button 
          onClick={handleSendMessage}
          className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 transition-colors px-4 rounded-r-lg flex items-center justify-center"
        >
          <Send className="h-4 w-4 text-[#1A1A2E]" />
        </button>
      </div>
    </motion.div>
  );
};

export default DiscordChat;
