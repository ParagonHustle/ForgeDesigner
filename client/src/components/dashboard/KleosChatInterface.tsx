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
  
  // Generate random witty welcome message
  const generateWittyMessage = () => {
    const activitySummaries = [
      `I see you've got ${activeDungeons} brave souls risking their pixels in dungeons, while ${farmingSlotsCount} minions are farming away. Your empire grows, ${user?.username || 'Adventurer'}!`,
      `${user?.username || 'Adventurer'}! Your ${charactersCount} characters are getting restless. Maybe send a few more on adventures? The dungeons are practically begging for heroes.`,
      `Hot off the digital press: You've collected ${aurasCount} Auras! That's ${aurasCount > 10 ? 'impressive' : 'a good start'}. Keep it up and you'll be glowing brighter than my circuits soon.`,
      `${activeDungeons > 0 ? `Your ${activeDungeons} active dungeons are in full swing!` : 'No active dungeons? The monsters are getting bored!'} And your ${farmingSlotsCount} farming slots are ${farmingSlotsCount > 3 ? 'working overtime' : 'looking a bit lonely'}.`,
      `Welcome back, ${user?.username || 'Adventurer'}! I've been counting your ${aurasCount} Auras while you were away. It's not weird, it's just what AI assistants do.`,
      `Stats update: ${charactersCount} characters, ${aurasCount} Auras, and ${activeDungeons + farmingSlotsCount} active tasks. Not to pressure you, but the leaderboards are watching!`
    ];

    const offers = [
      `Today's special: Double essence drops in Fire dungeons! Not to be dramatic, but this is THE time to farm.`,
      `Weekend offer: 30% off all Forge accelerations! Time to craft those Legendary Auras you've been dreaming about.`,
      `Psst! The Black Market just got a fresh shipment. I spotted some rare items that would complement your collection nicely.`,
      `The Townhall is buzzing with news of an upcoming event. Something about "celestial invasions" - sounds ominous and profitable!`,
      `I heard a rumor that premium dungeon tickets will be half-price tomorrow. Just saying, your inventory could use a restock.`,
      `Special event alert! "Eclipse of Elements" starts tomorrow. Get your team ready for some interdimensional farming.`
    ];

    const wittyTips = [
      `Pro tip: Matching Aura elements with character affinities boosts performance by 25%. I'm not saying your current setup is wrong, but... well, you know.`,
      `You know what would really complete your collection? That legendary Wind Aura you've been avoiding crafting. Just a thought!`,
      `Between you and me, focusing on Speed attributes is the meta right now. Your competitors are already catching on.`,
      `I analyzed your dungeon strategies. Have you considered actually surviving? I kid! But seriously, more vitality might help.`,
      `Your farming efficiency is good, but with a few optimizations to your character assignments, it could be great. Just saying!`,
      `I've been running simulations, and your current team would last approximately 2.7 seconds against the upcoming boss. Might want to prepare a bit more.`
    ];

    // Randomly select one from each category
    const activitySummary = activitySummaries[Math.floor(Math.random() * activitySummaries.length)];
    const offer = offers[Math.floor(Math.random() * offers.length)];
    const wittyTip = wittyTips[Math.floor(Math.random() * wittyTips.length)];

    return `${activitySummary}\n\n${offer}\n\n${wittyTip}\n\nHow can I assist you today? You can ask me about Forge mechanics, dungeon strategies, character building, market insights, or game updates.`;
  };

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = generateWittyMessage();

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
      const generalResponses = [
        "I'm analyzing the dungeons data now. The best strategy for your level would be to focus on elemental synergies between your characters and auras. Fire and Earth combos are particularly devastating against the new Abyssal enemies.",
        "Looking at the market trends, Forge Tokens are up 15% this week, while essence prices have stabilized. Might be a good time to craft those high-tier auras you've been planning.",
        "Your character progression is solid! For your next upgrades, I'd recommend investing in more vitality for your tanks and accuracy for damage dealers. The upcoming dungeons have some seriously evasive bosses.",
        "Based on your collection, you're just 3 auras away from completing the Celestial set. That 30% bonus to all elemental damage is definitely worth hunting down those last few pieces!",
        "The next game update will introduce the Shadow Realm dungeon tier with some juicy exclusive rewards. You'll want at least 3 characters with Dark resistance above 50% - might want to start preparing!",
        "For optimal farming efficiency this week, I'd focus on Soul Shards in the Misty Highlands. With the current event bonus, you could increase your yield by up to 75% with the right character setup."
      ];
      
      const characterAdvice = [
        `I've been observing your ${charactersCount > 0 ? 'favorite character' : 'characters'}, and I've noticed a potential improvement path. Have you considered focusing more on elemental specialization? The new meta heavily rewards it.`,
        `Your character roster is looking ${charactersCount > 5 ? 'quite diverse' : 'like it could use some variety'}! A balanced team with at least one tank, two DPS, and a support character would boost your dungeon clear rate significantly.`,
        `Did you know that pairing characters with complementary auras can increase their effectiveness by up to 35%? Your current setups could benefit from some strategic reassignments.`,
        `Your characters' skill allocations could use some optimization. The current endgame meta favors burst damage over sustained DPS - might be worth respeccing a few skill trees.`,
        `I've analyzed your character progression paths, and it seems you're prioritizing raw stats over synergy effects. While solid, you could gain an extra 20% efficiency by aligning your team compositions better.`
      ];
      
      const personalizedTips = [
        `By the way, I noticed you tend to prefer ${activeDungeons > farmingSlotsCount ? 'dungeon runs over farming' : 'farming over dungeon runs'}. Did you know you can optimize your rewards by balancing your activities based on the day of the week? Essence drops are boosted on weekends!`,
        `Based on your activity patterns, you might enjoy the new Guild Challenges that are coming next week. They're designed specifically for players who enjoy ${activeDungeons > 0 ? 'challenging dungeon content' : 'strategic resource management'}.`,
        `Your playstyle reminds me of some of the top players on the leaderboard! They also focus on ${aurasCount > 10 ? 'building diverse aura collections' : 'mastering a few powerful characters'}. You're definitely on the right track.`,
        `I've been tracking your progress, and you're advancing 15% faster than the average player at your stage! Whatever you're doing with those ${charactersCount} characters, keep it up!`,
        `Quick observation: players with similar profiles to yours often excel at the Celestial Trials event. With your current setup, you could potentially reach the top 10% bracket with just a few strategic adjustments.`
      ];
      
      // Randomly select a response category with weighting
      const responseType = Math.random();
      let randomResponse;
      
      if (responseType < 0.4) {
        randomResponse = generalResponses[Math.floor(Math.random() * generalResponses.length)];
      } else if (responseType < 0.7) {
        randomResponse = characterAdvice[Math.floor(Math.random() * characterAdvice.length)];
      } else {
        randomResponse = personalizedTips[Math.floor(Math.random() * personalizedTips.length)];
      }
      
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