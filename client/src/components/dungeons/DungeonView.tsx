import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/lib/zustandStore';
import { format, formatDistanceToNow } from 'date-fns';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Compass,
  Skull,
  FileText,
  Hourglass,
  CheckCircle,
  XCircle,
  FlaskConical,
  Clock,
  ChevronRight,
  Swords,
  Loader2,
  Flame,
  User
} from 'lucide-react';

// Custom components
import BattleLog from '../battles/BattleLog';
// We'll handle character selection directly in this component for now
// import CharacterSelection from '../characters/CharacterSelection';

// Types for the dungeon system
interface DungeonType {
  id: number;
  name: string;
  description: string;
  baseDuration: number;
  difficulty: string;
  level: number;
  element: string;           // Frontend uses 'element'
  elementalType: string;     // Backend uses 'elementalType'
  rewards: any;
}

interface DungeonRun {
  id: number;
  userId: number;
  dungeonTypeId: number;
  dungeonName: string;
  dungeonLevel: number;
  characterIds: number[];
  startTime: string;
  endTime: string;
  completed: boolean;
  success: boolean;
  battleLog?: any[];
}

/**
 * Main component for dungeon system
 */
export default function DungeonView() {
  // State for dungeon selection and runs
  const [selectedDungeonId, setSelectedDungeonId] = useState<number | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);
  const [runDuration, setRunDuration] = useState<number>(1); // in minutes
  const [showBattleLog, setShowBattleLog] = useState<boolean>(false);
  const [activeBattleLog, setActiveBattleLog] = useState<any[]>([]);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [filterCompleted, setFilterCompleted] = useState<boolean>(false);
  
  // Access global state for user settings
  const { selectedCharacterIds, setSelectedCharacterIds } = useStore();
  
  // Query client for cache management
  const queryClient = useQueryClient();
  
  // Fetch dungeon types
  const {
    data: dungeonTypes,
    isLoading: isLoadingDungeonTypes,
    error: dungeonTypesError
  } = useQuery({
    queryKey: ['/api/dungeons/types'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch active dungeon runs
  const {
    data: dungeonRuns,
    isLoading: isLoadingRuns,
    error: runsError
  } = useQuery({
    queryKey: ['/api/dungeons/runs'],
    refetchInterval: 10000, // Refresh every 10 seconds to update run progress
  });
  
  // Fetch available characters
  const {
    data: characters,
    isLoading: isLoadingCharacters,
    error: charactersError
  } = useQuery({
    queryKey: ['/api/characters'],
  });
  
  // Mutation to start a dungeon run
  const startDungeonMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest('POST', '/api/dungeons/start', data);
    },
    onSuccess: () => {
      toast({
        title: 'Dungeon run started',
        description: 'Your party has entered the dungeon!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dungeons/runs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start dungeon run',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation to complete a dungeon run
  const completeDungeonMutation = useMutation({
    mutationFn: (runId: number) => {
      return apiRequest('POST', `/api/dungeons/complete/${runId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: data?.success ? 'Dungeon completed successfully!' : 'Dungeon run failed',
        description: data?.success ? 'Your party has conquered the dungeon!' : 'Your party was defeated!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dungeons/runs'] });
      setShowBattleLog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to complete dungeon run',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Effect to initialize selectedCharacters from global state
  useEffect(() => {
    if (selectedCharacterIds && selectedCharacterIds.length > 0) {
      setSelectedCharacters(selectedCharacterIds);
    }
  }, [selectedCharacterIds]);
  
  // Function to handle character selection
  const handleCharacterSelection = (characterIds: number[]) => {
    setSelectedCharacters(characterIds);
    setSelectedCharacterIds(characterIds);
  };
  
  // Function to start a dungeon run
  const handleStartDungeon = () => {
    if (!selectedDungeonId) {
      toast({
        title: 'No dungeon selected',
        description: 'Please select a dungeon to enter',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedCharacters.length === 0) {
      toast({
        title: 'No characters selected',
        description: 'Please select at least one character for your party',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedDungeon = (dungeonTypes as DungeonType[])?.find((d: DungeonType) => d.id === selectedDungeonId);
    if (!selectedDungeon) return;
    
    // Calculate end time based on dungeon duration
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (runDuration * 60 * 1000));
    
    startDungeonMutation.mutate({
      dungeonTypeId: selectedDungeonId,
      dungeonName: selectedDungeon.name,
      dungeonLevel: selectedDungeon.level || 1,  // Ensure we have a valid level
      elementalType: selectedDungeon.elementalType || selectedDungeon.element || 'neutral', // Prefer elementalType, fallback to element
      characterIds: selectedCharacters,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  };
  
  // Function to view battle log for a completed run
  const handleViewBattleLog = (run: DungeonRun) => {
    setActiveBattleLog(run.battleLog || []);
    setActiveRunId(run.id);
    setShowBattleLog(true);
  };
  
  // Function to handle completing a dungeon after viewing battle log
  const handleCompleteDungeon = (runId: number) => {
    completeDungeonMutation.mutate(runId);
  };
  
  // Function to calculate progress percentage of an active run
  const calculateProgress = (run: DungeonRun): number => {
    const now = new Date().getTime();
    const start = new Date(run.startTime).getTime();
    const end = new Date(run.endTime).getTime();
    
    if (now >= end) return 100;
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(0, progress), 100);
  };
  
  // Function to calculate remaining time text
  const getRemainingTimeText = (run: DungeonRun): string => {
    const endTime = new Date(run.endTime);
    const now = new Date();
    
    if (now >= endTime) {
      return 'Complete - Collect rewards';
    }
    
    return formatDistanceToNow(endTime, { addSuffix: true });
  };
  
  // Filter dungeon runs based on completion status
  const filteredRuns = dungeonRuns 
    ? (dungeonRuns as DungeonRun[]).filter((run: DungeonRun) => filterCompleted ? run.completed : true)
    : [];
  
  // Debug to console for inspection
  console.log('All dungeon runs:', dungeonRuns);
  console.log('Filtered runs:', filteredRuns);
  
  // Group runs by completion status - Check for character IDs too
  const activeRuns = filteredRuns.filter((run: DungeonRun) => {
    console.log('Checking run:', run);
    return !run.completed && new Date(run.endTime) > new Date() && 
           run.characterIds && run.characterIds.length > 0;
  });
  
  console.log('Active runs after filter:', activeRuns);
  
  const completedRuns = filteredRuns.filter((run: DungeonRun) => 
    run.completed || new Date(run.endTime) <= new Date()
  );
  
  // Loading states
  const isLoading = isLoadingDungeonTypes || isLoadingRuns;
  const startingDungeon = startDungeonMutation.isPending;
  const completingDungeon = completeDungeonMutation.isPending;
  
  return (
    <div className="container mx-auto py-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dungeon Selection Panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              <span>Dungeon Selection</span>
            </CardTitle>
            <CardDescription>
              Choose a dungeon and select your party members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingDungeonTypes ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : dungeonTypesError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load dungeons. Please try refreshing.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dungeon-select">Select Dungeon</Label>
                  <Select
                    value={selectedDungeonId?.toString() || ""}
                    onValueChange={(value) => setSelectedDungeonId(parseInt(value))}
                  >
                    <SelectTrigger id="dungeon-select">
                      <SelectValue placeholder="Select a dungeon" />
                    </SelectTrigger>
                    <SelectContent>
                      {(dungeonTypes as DungeonType[])?.map((dungeon: DungeonType) => (
                        <SelectItem key={dungeon.id} value={dungeon.id.toString()}>
                          {dungeon.name} (Lvl {dungeon.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedDungeonId && (
                  <div className="bg-[#251942] rounded-md p-3 text-sm">
                    {(dungeonTypes as DungeonType[])?.find((d: DungeonType) => d.id === selectedDungeonId)?.description || 'No description available.'}
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-[#1D1128]">
                        <Flame className="w-3 h-3 mr-1" />
                        {(dungeonTypes as DungeonType[])?.find((d: DungeonType) => d.id === selectedDungeonId)?.element || 'Unknown'}
                      </Badge>
                      <Badge variant="outline" className="bg-[#1D1128]">
                        <Skull className="w-3 h-3 mr-1" />
                        {(dungeonTypes as DungeonType[])?.find((d: DungeonType) => d.id === selectedDungeonId)?.difficulty || 'Normal'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="time-select">Run Time (for testing)</Label>
                  <Select
                    value={runDuration.toString()}
                    onValueChange={(value) => setRunDuration(parseInt(value))}
                  >
                    <SelectTrigger id="time-select">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Characters</Label>
                  {isLoadingCharacters ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : charactersError ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Failed to load characters. Please try refreshing.
                      </AlertDescription>
                    </Alert>
                  ) : (characters as any[])?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No characters available</p>
                      <p className="text-sm mt-1">Create characters in the Character section</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {(characters as any[])?.map((character: any) => (
                        <Button
                          key={character.id}
                          variant={selectedCharacters.includes(character.id) ? "default" : "outline"}
                          size="sm"
                          className="p-2 h-auto flex flex-col justify-center items-center"
                          onClick={() => {
                            if (selectedCharacters.includes(character.id)) {
                              handleCharacterSelection(selectedCharacters.filter(cid => cid !== character.id));
                            } else if (selectedCharacters.length < 4) {
                              handleCharacterSelection([...selectedCharacters, character.id]);
                            }
                          }}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#432874] mb-1 flex items-center justify-center overflow-hidden">
                            {character.avatarUrl ? (
                              <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-xs line-clamp-1">{character.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCharacters.length}/4 characters selected
                  </p>
                </div>
                
                <Button
                  onClick={handleStartDungeon}
                  disabled={!selectedDungeonId || selectedCharacters.length === 0 || startingDungeon}
                  className="w-full"
                >
                  {startingDungeon ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Swords className="mr-2 h-4 w-4" />
                      Enter Dungeon
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Active Dungeon Runs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="h-5 w-5" />
              <span>Active Dungeon Runs</span>
            </CardTitle>
            <CardDescription>
              Your party's ongoing adventures in the dungeons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingRuns ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : runsError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load dungeon runs. Please try refreshing.
                </AlertDescription>
              </Alert>
            ) : activeRuns.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Compass className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No active dungeon runs</p>
                <p className="text-sm mt-1">Select a dungeon and start a new adventure</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRuns.map((run: DungeonRun) => {
                  const progress = calculateProgress(run);
                  return (
                    <div 
                      key={run.id} 
                      className="bg-[#251942] rounded-lg p-4 relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-[#E5DBFF]">{run.dungeonName}</h4>
                          <p className="text-sm text-[#C8B8DB]">Level {run.dungeonLevel}</p>
                        </div>
                        <Badge variant={progress >= 100 ? "default" : "outline"}>
                          {progress >= 100 ? 'Complete' : 'In Progress'}
                        </Badge>
                      </div>
                      
                      <Progress value={progress} className="h-2 mb-3" />
                      
                      <div className="flex justify-between items-center text-xs text-[#C8B8DB]">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{getRemainingTimeText(run)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <span>Characters: {run.characterIds.length}</span>
                        </div>
                      </div>
                      
                      {progress >= 100 && (
                        <Button
                          variant="default"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleViewBattleLog(run)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Battle Report
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Completed Dungeon Runs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Dungeon History</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilterCompleted(!filterCompleted)}
            >
              {filterCompleted ? 'Show All' : 'Only Completed'}
            </Button>
          </div>
          <CardDescription>
            Records of your past dungeon expeditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRuns ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : completedRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No dungeon history yet</p>
              <p className="text-sm mt-1">Complete some dungeons to see your records</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {completedRuns.map((run: DungeonRun) => (
                <AccordionItem 
                  key={run.id} 
                  value={run.id.toString()}
                  className="border border-[#432874] rounded-md overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-2 hover:bg-[#432874]/20">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={run.success ? "default" : "destructive"} className="h-6">
                          {run.success ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          <span>{run.success ? 'Success' : 'Failed'}</span>
                        </Badge>
                        <span className="font-medium">{run.dungeonName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(run.endTime), 'PPp')}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-2 bg-[#251942]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-[#C8B8DB]">Dungeon Level</p>
                        <p className="font-medium">{run.dungeonLevel}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-[#C8B8DB]">Characters</p>
                        <p className="font-medium">{run.characterIds.length} adventurers</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-[#C8B8DB]">Duration</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(run.startTime), { 
                            addSuffix: false 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        size="sm"
                        onClick={() => handleViewBattleLog(run)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Battle Report
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      {/* Battle Log Dialog */}
      {showBattleLog && (
        <BattleLog
          isOpen={showBattleLog}
          onClose={() => setShowBattleLog(false)}
          battleLog={activeBattleLog}
          runId={activeRunId}
          onCompleteDungeon={handleCompleteDungeon}
        />
      )}
    </div>
  );
}
