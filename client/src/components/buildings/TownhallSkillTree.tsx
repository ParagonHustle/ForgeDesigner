import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wheat, Hammer, Plus, Check, Building } from 'lucide-react';

const TownhallSkillTree = ({ 
  building, 
  currentLevel, 
  onUpgrade 
}: { 
  building: any; 
  currentLevel: number; 
  onUpgrade: (skillId: string) => void; 
}) => {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [resourceChecked, setResourceChecked] = useState(false);
  
  const { data: skillTreeData, isLoading } = useQuery({
    queryKey: [`/api/buildings/skills/townhall`],
    enabled: !!building
  });

  useEffect(() => {
    // Check if player has "Building Plans" resource
    const checkForBuildingPlans = async () => {
      try {
        const resources = await apiRequest('GET', '/api/resources');
        if (Array.isArray(resources)) {
          const buildingPlans = resources.find((r: any) => r.name === 'Building Plans');
          setResourceChecked(true);
          if (!buildingPlans || buildingPlans.quantity < 1) {
            toast({
              title: "Building Plans Required",
              description: "You need Building Plans to upgrade your Townhall",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error("Error checking for Building Plans:", error);
      }
    };
    
    checkForBuildingPlans();
  }, []);

  const availableUpgrades = React.useMemo(() => {
    if (!skillTreeData || !skillTreeData.availableSkillTree || !Array.isArray(skillTreeData.availableSkillTree) || !skillTreeData.unlockedSkills) {
      return { farmPlots: [], forgeSlots: [], specialUpgrades: [] };
    }
    
    const unlockedSkills = Array.isArray(skillTreeData.unlockedSkills) ? skillTreeData.unlockedSkills : [];
    
    return {
      farmPlots: skillTreeData.availableSkillTree.filter((skill: any) => 
        skill.id && typeof skill.id === 'string' && 
        skill.id.startsWith('th_farm_plot_') && 
        !unlockedSkills.includes(skill.id)
      ),
      forgeSlots: skillTreeData.availableSkillTree.filter((skill: any) => 
        skill.id && typeof skill.id === 'string' && 
        skill.id.startsWith('th_forge_slot_') && 
        !unlockedSkills.includes(skill.id)
      ),
      specialUpgrades: skillTreeData.availableSkillTree.filter((skill: any) => 
        skill.id && typeof skill.id === 'string' && 
        (skill.id.startsWith('th_crafting_station_') || skill.id.startsWith('th_farm_expansion_')) &&
        !unlockedSkills.includes(skill.id) &&
        (!skill.requires || (skill.requires.townhall_level && skill.requires.townhall_level <= currentLevel))
      )
    };
  }, [skillTreeData, currentLevel]);

  const specialUpgradesAvailable = currentLevel % 5 === 0 && availableUpgrades.specialUpgrades.length > 0;

  const handleUpgrade = () => {
    if (!selectedOption) {
      toast({
        title: "Selection Required",
        description: "Please select an option to upgrade",
        variant: "destructive"
      });
      return;
    }
    
    onUpgrade(selectedOption);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading townhall upgrade options...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="mr-2 h-5 w-5" />
          Townhall Upgrade Options
        </CardTitle>
        <CardDescription>
          Use Building Plans to upgrade your Townhall
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {specialUpgradesAvailable ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Special Upgrades (Townhall Level {currentLevel})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableUpgrades.specialUpgrades.map((upgrade: any) => (
                <motion.div
                  key={upgrade.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedOption === upgrade.id ? 'border-2 border-primary' : 'border-border'
                  }`}
                  onClick={() => setSelectedOption(upgrade.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{upgrade.name}</h4>
                      <p className="text-sm text-muted-foreground">{upgrade.description}</p>
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                      {selectedOption === upgrade.id ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Plus className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="farm" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="farm" className="flex items-center">
                <Wheat className="mr-2 h-4 w-4" />
                Farm Plots
              </TabsTrigger>
              <TabsTrigger value="forge" className="flex items-center">
                <Hammer className="mr-2 h-4 w-4" />
                Forge Slots
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="farm" className="p-1 mt-4">
              <div className="grid grid-cols-1 gap-3">
                {availableUpgrades.farmPlots.length > 0 ? (
                  availableUpgrades.farmPlots.map((plot: any) => (
                    <motion.div
                      key={plot.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        selectedOption === plot.id ? 'border-2 border-primary' : 'border-border'
                      }`}
                      onClick={() => setSelectedOption(plot.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{plot.name}</h4>
                          <p className="text-sm text-muted-foreground">{plot.description}</p>
                        </div>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                          {selectedOption === plot.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    All farm plots have been unlocked
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="forge" className="p-1 mt-4">
              <div className="grid grid-cols-1 gap-3">
                {availableUpgrades.forgeSlots.length > 0 ? (
                  availableUpgrades.forgeSlots.map((slot: any) => (
                    <motion.div
                      key={slot.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        selectedOption === slot.id ? 'border-2 border-primary' : 'border-border'
                      }`}
                      onClick={() => setSelectedOption(slot.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{slot.name}</h4>
                          <p className="text-sm text-muted-foreground">{slot.description}</p>
                        </div>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                          {selectedOption === slot.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    All forge slots have been unlocked
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={!selectedOption}
          onClick={handleUpgrade}
        >
          Confirm Selection
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TownhallSkillTree;