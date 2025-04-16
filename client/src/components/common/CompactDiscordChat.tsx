import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/zustandStore';
import { Send, MessageSquare, ChevronDown, ChevronUp, Maximize2, MessageCircle } from 'lucide-react';
import { useDiscordAuth } from '@/lib/discordAuth';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CompactDiscordChat = () => {
  const { discordMessages, addDiscordMessage } = useGameStore();
  const { user } = useDiscordAuth();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadCount = useRef(0);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isOpen && discordMessages.length > 0) {
      unreadCount.current += 1;
    }
  }, [discordMessages, isOpen]);

  // Reset unread count when opening
  useEffect(() => {
    if (isOpen) {
      unreadCount.current = 0;
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    // Add message to local state
    addDiscordMessage(user.username, message);
    
    // Clear input
    setMessage('');
  };

  // Get the three most recent messages to display in the header
  const recentMessages = discordMessages.slice(-3);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative flex-1">
        {/* Live Discord Chat Bar */}
        <div className="flex items-center h-9 relative w-72 md:w-96">  {/* Increased width */}
          {/* Live Chat Display (Always visible) - Full width without Discord label */}
          <div className="bg-[#1F1D36]/80 border border-[#432874]/30 rounded-l-md flex-1 h-12 overflow-y-auto scrollbar-none px-3 py-1 flex flex-col justify-center w-full">
            {recentMessages.length > 0 ? (
              <div className="w-full">
                {recentMessages.map((msg, index) => (
                  <div key={msg.id} className={`flex ${index !== recentMessages.length - 1 ? 'mb-0.5' : ''}`}>
                    <span className={`font-semibold text-xs whitespace-nowrap ${
                      msg.username === 'GuildMaster' ? 'text-[#FF9D00]' : 
                      msg.username === 'AuraCollector' ? 'text-[#00B9AE]' : 
                      'text-[#C8B8DB]'
                    }`}>
                      {msg.username}:
                    </span>
                    <span className="text-[#C8B8DB]/90 ml-1 truncate text-xs flex-1">{msg.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[#C8B8DB]/50 text-xs">No messages yet</span>
            )}
            {unreadCount.current > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-[#FF9D00] text-[#1A1A2E] text-xs flex items-center justify-center">
                {unreadCount.current > 9 ? '9+' : unreadCount.current}
              </span>
            )}
          </div>
          
          {/* Expand Button */}
          <DialogTrigger asChild>
            <button className="bg-[#432874]/20 border border-[#432874]/30 border-l-0 rounded-r-md px-2 h-full flex items-center justify-center hover:bg-[#432874]/40 transition-colors">
              <Maximize2 className="h-4 w-4 text-[#7855FF]" />
            </button>
          </DialogTrigger>
        </div>
      </div>
      
      <DialogContent className="sm:max-w-xl bg-[#1A1A2E] border-[#432874]/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-cinzel font-bold text-[#FF9D00]">Discord Chat</h2>
          <div className="bg-[#FF9D00]/20 rounded-full px-2 py-0.5 text-xs text-[#FF9D00]">
            {Math.floor(Math.random() * 10) + 5} Online
          </div>
        </div>
        
        <div className="h-80 overflow-y-auto bg-[#1F1D36]/50 rounded-lg p-3 mb-3 text-xs space-y-2 custom-scrollbar">
          {discordMessages.length > 0 ? (
            <>
              {discordMessages.map((msg) => (
                <div key={msg.id} className="flex items-start group hover:bg-[#432874]/10 p-1 rounded-md transition-colors">
                  <span className={`font-semibold whitespace-nowrap ${
                    msg.username === 'GuildMaster' ? 'text-[#FF9D00]' : 
                    msg.username === 'AuraCollector' ? 'text-[#00B9AE]' : 
                    'text-[#C8B8DB]'
                  }`}>
                    {msg.username}:
                  </span>
                  <span className="text-[#C8B8DB]/90 ml-1 break-words">{msg.content}</span>
                  <span className="ml-auto text-[#C8B8DB]/40 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#C8B8DB]/40">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>
        
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
      </DialogContent>
    </Dialog>
  );
};

export default CompactDiscordChat;