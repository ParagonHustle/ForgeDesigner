import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/zustandStore';
import { Send, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Get the two most recent messages
  const recentMessages = discordMessages.slice(-2);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative">
        <div className="flex items-center">
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#432874]/20 border-[#432874]/30 hover:bg-[#432874]/40 flex items-center"
            >
              <MessageSquare className="h-4 w-4 mr-1 text-[#7855FF]" />
              <span>Discord</span>
              {unreadCount.current > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[#FF9D00] text-[#1A1A2E] text-xs flex items-center justify-center">
                  {unreadCount.current > 9 ? '9+' : unreadCount.current}
                </span>
              )}
            </Button>
          </DialogTrigger>
          
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            className="ml-1 text-[#C8B8DB] hover:text-[#FF9D00] transition-colors"
          >
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        
        {/* Preview of recent messages */}
        {showPreview && recentMessages.length > 0 && (
          <div className="mt-1 bg-[#1F1D36]/80 border border-[#432874]/30 rounded-lg p-2 max-w-md overflow-hidden text-xs absolute z-10 w-72">
            {recentMessages.map((msg) => (
              <div key={msg.id} className="flex truncate mb-1 last:mb-0">
                <span className={`font-semibold ${
                  msg.username === 'GuildMaster' ? 'text-[#FF9D00]' : 
                  msg.username === 'AuraCollector' ? 'text-[#00B9AE]' : 
                  'text-[#C8B8DB]'
                }`}>
                  {msg.username}:
                </span>
                <span className="text-[#C8B8DB]/90 ml-1 truncate">{msg.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <DialogContent className="sm:max-w-md bg-[#1A1A2E] border-[#432874]/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-cinzel font-bold text-[#FF9D00]">Discord Chat</h2>
          <div className="bg-[#FF9D00]/20 rounded-full px-2 py-0.5 text-xs text-[#FF9D00]">
            {Math.floor(Math.random() * 10) + 5} Online
          </div>
        </div>
        
        <div className="h-60 overflow-y-auto bg-[#1F1D36]/50 rounded-lg p-3 mb-3 text-xs space-y-2">
          {discordMessages.map((msg) => (
            <div key={msg.id} className="flex">
              <span className={`font-semibold ${
                msg.username === 'GuildMaster' ? 'text-[#FF9D00]' : 
                msg.username === 'AuraCollector' ? 'text-[#00B9AE]' : 
                'text-[#C8B8DB]'
              }`}>
                {msg.username}:
              </span>
              <span className="text-[#C8B8DB]/90 ml-1">{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
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