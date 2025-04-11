import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, AlignCenter, Sparkles, Swords, Target, Zap, Shield, BookOpenText, Flame } from 'lucide-react';

const CollectionsView = () => {
  const [selectedTab, setSelectedTab] = useState('achievements');
  const gameStore = useGameStore();
  const { user } = useDiscordAuth();
  const { toast } = useToast();

  // Animation variants
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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Mock achievement data (to be replaced with real data from API)
  const achievements = [
    {
      id: 1,
      name: "Forge Apprentice",
      description: "Create your first Aura in the Forge",
      progress: 100,
      icon: <Flame className="h-8 w-8 text-[#FF9D00]" />,
      reward: "50 Forge Tokens",
      completed: true
    },
    {
      id: 2,
      name: "Bounty Hunter",
      description: "Complete 10 bounty quests",
      progress: 40,
      icon: <Target className="h-8 w-8 text-[#00B9AE]" />,
      reward: "100 Rogue Credits",
      completed: false
    },
    {
      id: 3,
      name: "Dungeon Master",
      description: "Complete all available dungeons",
      progress: 30,
      icon: <Swords className="h-8 w-8 text-[#DC143C]" />,
      reward: "Rare Character",
      completed: false
    },
    {
      id: 4,
      name: "Farming Prodigy",
      description: "Collect 1000 resources from farming",
      progress: 65,
      icon: <AlignCenter className="h-8 w-8 text-[#4CAF50]" />,
      reward: "100 Soul Shards",
      completed: false
    },
    {
      id: 5,
      name: "Builder",
      description: "Upgrade all buildings to level 3",
      progress: 50,
      icon: <Shield className="h-8 w-8 text-[#9C27B0]" />,
      reward: "200 Forge Tokens",
      completed: false
    }
  ];

  // Mock perks data
  const perks = [
    {
      id: 1,
      name: "Essence Harvester",
      description: "Increases Essence gain by 10%",
      level: 2,
      maxLevel: 5,
      icon: <Zap className="h-8 w-8 text-[#4CAF50]" />,
      effect: "+10% Essence per level",
      cost: "100 Forge Tokens"
    },
    {
      id: 2,
      name: "Combat Specialist",
      description: "Increases all character stats by 5%",
      level: 1,
      maxLevel: 5,
      icon: <Swords className="h-8 w-8 text-[#DC143C]" />,
      effect: "+5% Character Stats per level",
      cost: "150 Forge Tokens"
    },
    {
      id: 3,
      name: "Forge Master",
      description: "Reduces Aura forging time by 10%",
      level: 0,
      maxLevel: 3,
      icon: <Flame className="h-8 w-8 text-[#FF9D00]" />,
      effect: "-10% Forging Time per level",
      cost: "200 Forge Tokens"
    },
    {
      id: 4,
      name: "Treasure Hunter",
      description: "Increases rare item drops by 15%",
      level: 0,
      maxLevel: 3,
      icon: <Trophy className="h-8 w-8 text-[#FFD700]" />,
      effect: "+15% Rare Drop Chance per level",
      cost: "250 Forge Tokens"
    }
  ];

  // Mock titles data
  const titles = [
    {
      id: 1,
      name: "The Collector",
      description: "Collect 50 unique items",
      progress: 70,
      icon: <BookOpenText className="h-8 w-8 text-[#FFD700]" />,
      requirements: "50/50 unique items collected",
      status: "Unlocked"
    },
    {
      id: 2,
      name: "Dungeon Conqueror",
      description: "Complete all legendary dungeons",
      progress: 25,
      icon: <Swords className="h-8 w-8 text-[#DC143C]" />,
      requirements: "2/8 legendary dungeons completed",
      status: "Locked"
    },
    {
      id: 3,
      name: "Forge Grandmaster",
      description: "Create 10 legendary Auras",
      progress: 40,
      icon: <Flame className="h-8 w-8 text-[#FF9D00]" />,
      requirements: "4/10 legendary Auras created",
      status: "Locked"
    }
  ];

  const handleUpgradePerk = (perkId: number) => {
    // API call to upgrade a perk would go here
    toast({
      title: "Perk Upgraded",
      description: "Your account-wide bonus has been increased.",
    });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Collections</h1>
        <p className="text-[#C8B8DB]/80">
          Track your achievements, unlock account-wide bonuses, and earn exclusive titles.
        </p>
      </div>
      
      {/* Collection Tabs */}
      <Tabs defaultValue="achievements" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="bg-[#432874]/20 mb-6">
          <TabsTrigger value="achievements" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Trophy className="h-4 w-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="perks" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Star className="h-4 w-4 mr-2" />
            Account Perks
          </TabsTrigger>
          <TabsTrigger value="titles" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Sparkles className="h-4 w-4 mr-2" />
            Titles
          </TabsTrigger>
        </TabsList>
        
        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {achievements.map(achievement => (
              <motion.div
                key={achievement.id}
                variants={item}
                className={`bg-[#1A1A2E] border ${achievement.completed ? 'border-[#FFD700]/50' : 'border-[#432874]/30'} rounded-xl overflow-hidden`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {achievement.icon}
                      <CardTitle className="ml-2 font-cinzel">{achievement.name}</CardTitle>
                    </div>
                    <Badge className={`${achievement.completed ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' : 'bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50'}`}>
                      {achievement.completed ? 'Completed' : `${achievement.progress}%`}
                    </Badge>
                  </div>
                  <CardDescription>{achievement.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-2">
                  <div className="mb-4">
                    <Progress 
                      value={achievement.progress} 
                      className="h-2 bg-[#1F1D36] border-[#432874]/20" 
                    />
                  </div>
                  
                  <div className="bg-[#432874]/20 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Trophy className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                      <p className="text-sm text-[#C8B8DB]/90">
                        Reward: {achievement.reward}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
        
        {/* Account Perks Tab */}
        <TabsContent value="perks">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2"
          >
            {perks.map(perk => (
              <motion.div
                key={perk.id}
                variants={item}
                className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {perk.icon}
                      <CardTitle className="ml-2 font-cinzel">{perk.name}</CardTitle>
                    </div>
                    <Badge className="bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50">
                      Level {perk.level}/{perk.maxLevel}
                    </Badge>
                  </div>
                  <CardDescription>{perk.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-2">
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#C8B8DB]/80">Progress</span>
                      <span className="text-[#FF9D00]">{perk.level}/{perk.maxLevel}</span>
                    </div>
                    <div className="h-2 bg-[#1F1D36] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#FF9D00]" 
                        style={{ width: `${(perk.level / perk.maxLevel) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#432874]/20 p-3 rounded-lg mb-4">
                    <div className="flex items-center mb-2">
                      <Zap className="h-4 w-4 text-[#FF9D00] mr-2 flex-shrink-0" />
                      <p className="text-sm text-[#C8B8DB]/90">
                        Current Effect: {perk.level > 0 ? `+${perk.level * 10}%` : 'None'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                      <p className="text-sm text-[#C8B8DB]/90">
                        Next Level: {perk.effect}
                      </p>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  {perk.level < perk.maxLevel ? (
                    <Button
                      className="w-full bg-[#432874] hover:bg-[#432874]/80"
                      onClick={() => handleUpgradePerk(perk.id)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Upgrade ({perk.cost})
                    </Button>
                  ) : (
                    <div className="w-full flex items-center justify-center bg-[#00B9AE]/20 py-2 rounded-lg text-sm text-[#00B9AE]">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Maximum Level Reached
                    </div>
                  )}
                </CardFooter>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
        
        {/* Titles Tab */}
        <TabsContent value="titles">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-1"
          >
            {titles.map(title => (
              <motion.div
                key={title.id}
                variants={item}
                className={`bg-[#1A1A2E] border ${title.status === 'Unlocked' ? 'border-[#FFD700]/50' : 'border-[#432874]/30'} rounded-xl overflow-hidden`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex items-center justify-center md:w-1/4 bg-[#1F1D36]">
                    <div className="bg-[#432874]/30 p-4 rounded-full">
                      {title.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">{title.name}</h3>
                      <Badge className={`${title.status === 'Unlocked' ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' : 'bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50'}`}>
                        {title.status}
                      </Badge>
                    </div>
                    
                    <p className="text-[#C8B8DB]/80 mb-4">{title.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#C8B8DB]/80">Progress</span>
                        <span className="text-[#FF9D00]">{title.progress}%</span>
                      </div>
                      <Progress 
                        value={title.progress} 
                        className="h-2 bg-[#1F1D36] border-[#432874]/20" 
                      />
                    </div>
                    
                    <div className="bg-[#432874]/20 p-3 rounded-lg">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                        <p className="text-sm text-[#C8B8DB]/90">
                          {title.requirements}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center justify-center md:w-1/5">
                    {title.status === 'Unlocked' ? (
                      <Button
                        className="w-full bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/30"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Equip Title
                      </Button>
                    ) : (
                      <div className="w-full text-center text-[#C8B8DB]/60">
                        <p className="text-sm">Complete requirements to unlock</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* Collections Info */}
      <div className="mt-12 bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <h2 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Collection Benefits</h2>
        <div className="space-y-4">
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <Trophy className="h-4 w-4 text-[#FFD700]" />
            </div>
            <p className="text-[#C8B8DB]/80">
              <span className="text-[#FFD700] font-semibold">Achievements</span> track your progress through the game and reward you with resources and special items.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <Star className="h-4 w-4 text-[#FF9D00]" />
            </div>
            <p className="text-[#C8B8DB]/80">
              <span className="text-[#FF9D00] font-semibold">Account Perks</span> provide permanent, account-wide bonuses that affect all your characters and activities.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-[#00B9AE]" />
            </div>
            <p className="text-[#C8B8DB]/80">
              <span className="text-[#00B9AE] font-semibold">Titles</span> are exclusive designations you can show off to other players and may grant special bonuses.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CollectionsView;