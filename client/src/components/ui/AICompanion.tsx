import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

const AICompanion = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "I'm your Aura Guide! How can I assist you with your journey through The Forge today?" }
  ]);
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "To maximize your Aura fusion success, try matching elements when possible.",
        "Don't forget to collect your farming resources regularly!",
        "Characters gain passive bonuses from equipped Auras even when inactive.",
        "The Forge level determines the maximum level your characters can reach.",
        "Upgrade your Townhall to unlock more simultaneous tasks.",
        "Rare auras have a higher chance of transferring skills during fusion.",
        "Visit the Black Market often - the inventory refreshes every 24 hours.",
        "Complete Bounty Board quests for valuable Soul Shards.",
        "Characters with high Vitality perform better in longer dungeon runs."
      ];
      
      const aiResponse = { 
        role: 'assistant' as const, 
        content: responses[Math.floor(Math.random() * responses.length)] 
      };
      setMessages(prevMessages => [...prevMessages, aiResponse]);
    }, 1000);
  };

  return (
    <>
      {/* Mobile version - just the icon */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-10 h-10 md:w-auto md:h-auto flex items-center justify-center mt-2">
            <img 
              src="https://cdn.pixabay.com/photo/2020/06/01/22/23/eye-5248678_960_720.jpg" 
              alt="AI Assistant" 
              className="w-10 h-10 rounded-full border-2 border-[#00B9AE]"
            />
            <span className="ml-2 text-sm hidden md:block">Aura Guide</span>
          </button>
        </DialogTrigger>
        
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00B9AE] font-cinzel text-xl">Aura Guide</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 h-80 overflow-y-auto p-2 bg-[#1F1D36]/50 rounded-md">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-3 ${
                  msg.role === 'assistant' 
                    ? 'bg-[#432874]/20 border-l-2 border-[#00B9AE]' 
                    : 'bg-[#432874]/10 border-r-2 border-[#FF9D00]'
                } p-2 rounded-md`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
          
          <div className="flex mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask your AI companion..."
              className="flex-1 bg-[#1F1D36]/80 border border-[#432874]/30 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00B9AE]"
            />
            <Button 
              onClick={handleSendMessage}
              className="bg-[#00B9AE] hover:bg-[#00B9AE]/80 rounded-r-lg rounded-l-none"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AICompanion;
