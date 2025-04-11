import { motion } from 'framer-motion';

interface WelcomeSectionProps {
  username: string;
  charactersCount: number;
  aurasCount: number;
  activeDungeons: number;
  farmingSlotsCount: number;
}

const WelcomeSection = ({
  username,
  charactersCount,
  aurasCount,
  activeDungeons,
  farmingSlotsCount
}: WelcomeSectionProps) => {
  return (
    <motion.div 
      className="bg-[#1A1A2E] rounded-xl p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#432874]/20 rounded-full -mr-32 -mt-32 blur-md"></div>
      
      <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] relative z-10">Welcome back, {username}</h1>
      <p className="mt-2 text-[#C8B8DB]/80 relative z-10">Your journey continues with new challenges and rewards.</p>
      
      {/* Account Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 relative z-10">
        <div className="bg-[#2D1B4E]/50 p-3 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Characters</div>
          <div className="text-xl font-semibold">{charactersCount}/20</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-3 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Auras</div>
          <div className="text-xl font-semibold">{aurasCount}</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-3 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Dungeons</div>
          <div className="text-xl font-semibold">{activeDungeons} Active</div>
        </div>
        <div className="bg-[#2D1B4E]/50 p-3 rounded-lg border border-[#432874]/30">
          <div className="text-xs text-[#C8B8DB]/70">Farming</div>
          <div className="text-xl font-semibold">{farmingSlotsCount} Slots</div>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeSection;
