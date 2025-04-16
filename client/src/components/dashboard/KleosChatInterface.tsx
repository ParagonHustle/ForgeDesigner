import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, Sparkles, InfoIcon } from 'lucide-react';
import { useDiscordAuth } from '@/lib/discordAuth';

interface Message {
  id: string;
  sender: 'user' | 'kleos';
  content: string;
  timestamp: Date;
}

interface KleosChatInterfaceProps {
  charactersCount: number;
  aurasCount: number;
  activeDungeons: number;
  farmingSlotsCount: number;
}

const KleosChatInterface = ({
  charactersCount,
  aurasCount,
  activeDungeons,
  farmingSlotsCount
}: KleosChatInterfaceProps) => {
  const { user } = useDiscordAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = `Welcome back, ${user?.username || 'Adventurer'}! I'm Kleos, your AI guide to The Forge. 
      
You currently have ${charactersCount} characters, ${aurasCount} Auras, ${activeDungeons} active dungeons, and ${farmingSlotsCount} farming slots in use.

How can I assist you today? You can ask me about:
• Forge mechanics and crafting
• Dungeon strategies
• Character building
• Market insights
• Game updates`;

      setMessages([
        {
          id: '1',
          sender: 'kleos',
          content: initialMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, [charactersCount, aurasCount, activeDungeons, farmingSlotsCount, user?.username, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Simulate AI thinking
    setIsTyping(true);
    
    // Simulate AI response delay
    setTimeout(() => {
      const responses = [
        "I'm analyzing the dungeons data now. The best strategy for your current level would be to focus on elemental synergies between your characters and auras.",
        "Looking at the market trends, Forge Tokens are up 15% this week. It might be a good time to craft some rare auras with your resources.",
        "Your character progression is solid! Consider investing in more vitality for your main tank to handle the upcoming dungeon challenges.",
        "Based on your collection, you're just 3 auras away from completing the Celestial set. The Black Market might have what you need this week.",
        "The next major game update will introduce a new dungeon tier with exclusive rewards. Make sure to prepare your team!",
        "For optimal farming efficiency, I recommend focusing on Soul Shards during the double yield event this weekend."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'kleos',
        content: randomResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <motion.div 
      className="bg-[#1A1A2E] rounded-xl p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#432874]/20 rounded-full -mr-32 -mt-32 blur-md"></div>
      
      {/* Header with Kleos info */}
      <div className="flex items-center mb-4 relative z-10">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF9D00] to-[#7855FF] flex items-center justify-center">
            <Bot className="h-6 w-6 text-[#1A1A2E]" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#00B9AE] rounded-full p-1">
            <Sparkles className="h-3 w-3 text-[#1A1A2E]" />
          </div>
        </div>
        <div className="ml-3">
          <div className="text-xl font-cinzel font-bold text-[#FF9D00]">Kleos</div>
          <div className="text-xs text-[#C8B8DB]/70 flex items-center">
            <span className="bg-[#00B9AE]/20 text-[#00B9AE] px-1.5 py-0.5 rounded text-[0.65rem] mr-2">AI Assistant</span>
            <span>Forge Knowledge Engine</span>
          </div>
        </div>
        <div className="ml-auto">
          <InfoIcon className="h-5 w-5 text-[#C8B8DB]/50 hover:text-[#C8B8DB] cursor-pointer" />
        </div>
      </div>
      
      {/* Messages container */}
      <div className="bg-[#1F1D36]/50 rounded-lg p-4 h-64 overflow-y-auto mb-4 relative z-10">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`mb-3 ${msg.sender === 'user' ? 'text-right' : ''}`}
          >
            {msg.sender === 'kleos' && (
              <div className="flex items-start mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FF9D00] to-[#7855FF] flex items-center justify-center mr-2">
                  <Bot className="h-3 w-3 text-[#1A1A2E]" />
                </div>
                <div className="text-xs font-semibold text-[#FF9D00]">Kleos</div>
              </div>
            )}
            
            <div 
              className={`inline-block max-w-[85%] rounded-xl p-3 text-sm ${
                msg.sender === 'user' 
                  ? 'bg-[#432874]/40 text-[#C8B8DB]' 
                  : 'bg-[#1A1A2E] text-[#C8B8DB] border border-[#432874]/30'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <div key={i} className={line.trim() === '' ? 'h-2' : ''}>
                  {line}
                </div>
              ))}
            </div>
            
            <div className="text-xs text-[#C8B8DB]/50 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FF9D00] to-[#7855FF] flex items-center justify-center mr-2">
              <Bot className="h-3 w-3 text-[#1A1A2E]" />
            </div>
            <div className="bg-[#1A1A2E] rounded-xl p-3 text-sm border border-[#432874]/30">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#C8B8DB]/70 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#C8B8DB]/70 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#C8B8DB]/70 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="flex relative z-10">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Kleos anything about The Forge..."
          className="flex-1 bg-[#1F1D36]/80 border border-[#432874]/30 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF9D00]"
        />
        <button 
          onClick={handleSendMessage}
          className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 transition-colors px-4 rounded-r-lg flex items-center justify-center"
          disabled={!input.trim()}
        >
          <Send className="h-4 w-4 text-[#1A1A2E]" />
        </button>
      </div>
      
      {/* Account Stats - Minimized as this is now integrated into the chat */}
      <div className="grid grid-cols-4 gap-4 mt-4 relative z-10">
        <div className="bg-[#2D1B4E]/50 p-2 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Characters</div>
          <div className="text-lg font-semibold">{charactersCount}/20</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-2 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Auras</div>
          <div className="text-lg font-semibold">{aurasCount}</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-2 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Dungeons</div>
          <div className="text-lg font-semibold">{activeDungeons} Active</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-2 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Farming</div>
          <div className="text-lg font-semibold">{farmingSlotsCount} Slots</div>
        </div>
      </div>
    </motion.div>
  );
};

export default KleosChatInterface;