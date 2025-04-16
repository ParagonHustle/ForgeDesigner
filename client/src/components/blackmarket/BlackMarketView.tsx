import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  Coins, 
  Clock, 
  Sparkles, 
  Users, 
  Shield, 
  Gem, 
  AlertTriangle,
  Lock,
  Scroll,
  CheckCircle2
} from 'lucide-react';

import type { BlackMarketListing } from '@shared/schema';

const BlackMarketView = () => {
  const { user, fetchUser } = useDiscordAuth();
  const { fetchResources, fetchCharacters, fetchAuras } = useGameStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, listing: BlackMarketListing | null}>({
    open: false,
    listing: null
  });
  
  // Fetch user's Black Market level
  const blackMarketLevel = user?.blackMarketLevel || 1;
  const maxItemsPerCategory = blackMarketLevel < 3 ? (blackMarketLevel + 2) : 6; // 3 slots at level 1, 4 at level 2, etc.
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Fetch black market listings
  const { data: listings = [], isLoading, refetch: refetchListings } = useQuery<BlackMarketListing[]>({ 
    queryKey: ['/api/blackmarket/listings'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Filter listings by different categories
  const premiumListings = listings.filter(listing => 
    (listing.isPremium === true || listing.currencyType === 'forgeTokens') && !listing.sold
  ).slice(0, maxItemsPerCategory);
  
  const standardListings = listings.filter(listing => 
    listing.currencyType === 'rogueCredits' && !listing.isPremium && !listing.sold
  ).slice(0, maxItemsPerCategory);
  
  // Add placeholder slots to show locked slots
  const addLockedSlots = (listings: BlackMarketListing[], count: number) => {
    const result = [...listings];
    // Add one more slot than current capacity, showing the "next" locked slot
    if (result.length < maxItemsPerCategory + 1) {
      const placeholdersNeeded = maxItemsPerCategory + 1 - result.length;
      for (let i = 0; i < placeholdersNeeded; i++) {
        result.push({
          id: `placeholder-${i}`,
          itemType: 'placeholder',
          itemData: { name: 'Locked Slot' },
          price: 0,
          currencyType: 'rogueCredits',
          sold: false,
          isPlaceholder: true
        } as any);
      }
    }
    return result;
  };
  
  const premiumListingsWithPlaceholders = addLockedSlots(premiumListings, maxItemsPerCategory + 1);
  const standardListingsWithPlaceholders = addLockedSlots(standardListings, maxItemsPerCategory + 1);

  // Generate time until refresh
  const getTimeUntilRefresh = () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    
    const diffMs = tomorrow.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  const handlePurchase = async (listing: BlackMarketListing) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', `/api/blackmarket/buy/${listing.id}`, undefined);
      const data = await response.json();
      
      toast({
        title: "Purchase Successful!",
        description: `You have acquired a new ${listing.itemType}.`,
      });
      
      // Refresh data
      fetchUser();
      refetchListings();
      
      // Refresh related collections based on purchased item type
      if (listing.itemType === 'character') {
        fetchCharacters();
      } else if (listing.itemType === 'aura') {
        fetchAuras();
      } else if (listing.itemType === 'resource') {
        fetchResources();
      }
      
      setConfirmDialog({ open: false, listing: null });
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "You may not have enough currency or the item is no longer available.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stock images for items based on their types and rarity/element
  const stockImages = {
    character: {
      warrior: "https://i.imgur.com/eYhqUWb.jpg", // Knight with armor
      mage: "https://i.imgur.com/uEyo0gB.jpg", // Mage casting spell
      rogue: "https://i.imgur.com/9xEcTOx.jpg", // Rogue with daggers
      archer: "https://i.imgur.com/pK2uFQG.jpg", // Archer with bow
      healer: "https://i.imgur.com/STy2tX0.jpg", // Healer with staff
      default: "https://i.imgur.com/jlQM1tJ.jpg" // Generic fantasy character
    },
    aura: {
      fire: "https://i.imgur.com/zZFXEfS.jpg", // Fire element
      water: "https://i.imgur.com/HlVLv7M.jpg", // Water element
      earth: "https://i.imgur.com/EkuS2Iy.jpg", // Earth element
      air: "https://i.imgur.com/JA4a3kY.jpg", // Air element
      light: "https://i.imgur.com/0bKk5n9.jpg", // Light element
      dark: "https://i.imgur.com/rCQjyfY.jpg", // Dark element
      default: "https://i.imgur.com/sBsT4s3.jpg" // Generic magic aura
    },
    resource: {
      crystal: "https://i.imgur.com/fv7qOVB.jpg", // Magical crystals
      herb: "https://i.imgur.com/Z5YZEBS.jpg", // Herbs and plants
      metal: "https://i.imgur.com/gPlqXH4.jpg", // Metal ores and ingots
      gem: "https://i.imgur.com/6O1Usyw.jpg", // Gemstones
      wood: "https://i.imgur.com/B2v8XDM.jpg", // Rare woods
      default: "https://i.imgur.com/RHszhSh.jpg" // Generic resource pile
    },
    default: "https://i.imgur.com/sBsT4s3.jpg" // Fallback image
  };

  const getItemInfo = (listing: BlackMarketListing) => {
    if (!listing) return {
      title: 'Unknown Item',
      description: 'Item details unavailable',
      detailLines: [],
      image: stockImages.default
    };
    
    const itemData = listing.itemData as any;
    
    switch (listing.itemType) {
      case 'character':
        // Determine character class for appropriate image
        let characterClass = (itemData?.class || '').toLowerCase();
        let characterImageKey = stockImages.character[characterClass as keyof typeof stockImages.character] 
          ? characterClass : 'default';
          
        return {
          title: itemData?.name || 'Mystery Character',
          description: `${itemData?.rarity || 'Unknown'} ${itemData?.class || 'Character'} - Level ${itemData?.level || '?'}`,
          detailLines: [
            itemData?.stats ? `STR: ${itemData.stats.strength || 0} | AGI: ${itemData.stats.agility || 0}` : '',
            itemData?.stats ? `INT: ${itemData.stats.intelligence || 0} | VIT: ${itemData.stats.vitality || 0}` : '',
            itemData?.passiveSkills?.length > 0 ? `Skills: ${itemData.passiveSkills.map((s: any) => s.name).join(', ')}` : 'No special skills'
          ],
          image: itemData?.avatarUrl || stockImages.character[characterImageKey as keyof typeof stockImages.character]
        };
        
      case 'aura':
        // Determine aura element for appropriate image
        let auraElement = (itemData?.element || '').toLowerCase();
        let auraImageKey = stockImages.aura[auraElement as keyof typeof stockImages.aura] 
          ? auraElement : 'default';
          
        return {
          title: itemData?.name || 'Mystery Aura',
          description: `${itemData?.element || 'Unknown'} Element - Level ${itemData?.level || '?'}`,
          detailLines: [
            itemData?.statMultipliers ? `Multipliers: STR ×${itemData.statMultipliers.strength?.toFixed(1) || '1.0'}, AGI ×${itemData.statMultipliers.agility?.toFixed(1) || '1.0'}` : '',
            itemData?.statMultipliers ? `INT ×${itemData.statMultipliers.intelligence?.toFixed(1) || '1.0'}, VIT ×${itemData.statMultipliers.vitality?.toFixed(1) || '1.0'}` : '',
            itemData?.skills?.length > 0 ? `Skills: ${itemData.skills.map((s: any) => s.name).join(', ')}` : 'No skills'
          ],
          image: stockImages.aura[auraImageKey as keyof typeof stockImages.aura]
        };
        
      case 'resource':
        // Determine resource type for appropriate image
        let resourceType = (itemData?.type || '').toLowerCase();
        let resourceImageKey = stockImages.resource[resourceType as keyof typeof stockImages.resource] 
          ? resourceType : 'default';
          
        return {
          title: itemData?.name || 'Rare Materials',
          description: `${itemData?.quantity || '?'} ${itemData?.type || 'material'} units`,
          detailLines: [
            itemData?.description || 'Valuable crafting resource'
          ],
          image: itemData?.iconUrl || stockImages.resource[resourceImageKey as keyof typeof stockImages.resource]
        };
        
      default:
        return {
          title: 'Market Item',
          description: 'A valuable item for your collection',
          detailLines: ['Unknown item details'],
          image: stockImages.default
        };
    }
  };

  const getCurrencyIcon = (currencyType: string) => {
    if (currencyType === 'forgeTokens') {
      return "https://i.imgur.com/fv7qOVB.jpg"; // Forge tokens
    } else {
      return "https://i.imgur.com/6O1Usyw.jpg"; // Rogue credits
    }
  };

  const canAfford = (listing: BlackMarketListing) => {
    if (!user) return false;
    
    if (listing.currencyType === 'forgeTokens') {
      return (user.forgeTokens || 0) >= listing.price;
    } else {
      return (user.rogueCredits || 0) >= listing.price;
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading market data...</div>
      </div>
    );
  }

  return (
    <>
      {/* Black Market Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-[#1A1A2E] border-[#432874]/50 text-[#C8B8DB] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Upgrade Black Market</DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Upgrading your Black Market unlocks more item slots and better offerings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-semibold">Current Level: {blackMarketLevel}</h4>
                <p className="text-sm text-[#C8B8DB]/70">Next Level: {blackMarketLevel + 1}</p>
              </div>
              <div className="bg-[#432874]/30 px-3 py-1 rounded">
                <span className="text-[#FF9D00] font-semibold">Lv.{blackMarketLevel}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#15152C] p-3 rounded-md">
                <h4 className="font-semibold mb-2">Required Materials</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#432874]/30 flex items-center justify-center mr-2">
                        <Scroll className="h-4 w-4 text-[#00B9AE]" />
                      </div>
                      <span>Market Expansion Plans</span>
                    </div>
                    <Badge className="bg-[#15152C] border-[#432874]">
                      {blackMarketLevel * 2} pcs
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#432874]/30 flex items-center justify-center mr-2">
                        <span className="text-[#FF9D00] text-xs">RC</span>
                      </div>
                      <span>Rogue Credits</span>
                    </div>
                    <Badge className="bg-[#15152C] border-[#432874]">
                      {blackMarketLevel * 1000}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#15152C] p-3 rounded-md">
                <h4 className="font-semibold mb-2">Unlocks at Level {blackMarketLevel + 1}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    +1 Item Slot per Category
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    {blackMarketLevel + 1 >= 3 ? "Rare Item Availability" : 
                     blackMarketLevel + 1 >= 5 ? "Epic Item Availability" :
                     blackMarketLevel + 1 >= 7 ? "Mythic Item Availability" :
                     "Better Price Offerings"}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    Improved Refresh Rate
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Black Market upgrade functionality will be available in a future update."
                });
                setShowUpgradeDialog(false);
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Black Market</h1>
            <p className="text-[#C8B8DB]/80">
              Purchase rare characters, auras, and valuable materials with your currencies.
            </p>
          </div>
          
          {/* Upgrade Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#FF9D00]/50 text-[#FF9D00] hover:bg-[#FF9D00]/10"
            onClick={() => setShowUpgradeDialog(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Upgrade Market
          </Button>
        </div>
      </div>
      
      {/* Market Header */}
      <div className="bg-gradient-to-r from-[#432874]/60 to-[#1A1A2E] rounded-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D00]/10 rounded-full -mr-32 -mt-32 blur-md"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#00B9AE]/10 rounded-full blur-md"></div>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center relative z-10">
          <div>
            <h2 className="text-2xl font-cinzel font-bold text-[#FF9D00] mb-2">Today's Offerings</h2>
            <div className="flex items-center text-[#C8B8DB]/70">
              <Clock className="h-4 w-4 mr-1" />
              <span>Refreshes in {getTimeUntilRefresh()}</span>
            </div>
            <div className="flex items-center text-[#C8B8DB]/70 mt-2">
              <Shield className="h-4 w-4 mr-1" />
              <span>Black Market Level: {blackMarketLevel} (Slots: {maxItemsPerCategory})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center bg-[#1A1A2E]/50 rounded-lg px-3 py-2">
              <img 
                src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop" 
                alt="Forge Tokens" 
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="text-[#FFD700]">{user?.forgeTokens || 0}</span>
            </div>
            <div className="flex items-center bg-[#1A1A2E]/50 rounded-lg px-3 py-2">
              <img 
                src="https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=250&h=250&fit=crop" 
                alt="Rogue Credits" 
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="text-[#C8B8DB]">{user?.rogueCredits || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Premium Items */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Gem className="h-5 w-5 mr-2 text-[#FF9D00]" />
          <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">Premium Items</h3>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {premiumListingsWithPlaceholders.length === 0 ? (
            <div className="col-span-full bg-[#1A1A2E] rounded-xl p-8 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No premium items are available at the moment. Check back later!
              </p>
            </div>
          ) : (
            premiumListingsWithPlaceholders.map((listing, index) => {
              const itemInfo = getItemInfo(listing);
              const isLocked = index >= blackMarketLevel + 2 || (listing as any).isPlaceholder;
              
              return (
                <motion.div
                  key={listing.id}
                  variants={item}
                  className={`bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden relative ${isLocked ? 'opacity-60' : ''}`}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                      <Lock className="h-12 w-12 text-[#432874] mb-4" />
                      <p className="text-center text-[#C8B8DB] font-semibold">
                        Upgrade your Black Market to Level {Math.ceil((index + 1) / 3)} to unlock this slot
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 border-[#FF9D00]/50 text-[#FF9D00] hover:bg-[#FF9D00]/10"
                        onClick={() => setShowUpgradeDialog(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Upgrade Market
                      </Button>
                    </div>
                  )}
                  
                  <div className="relative h-40">
                    <img 
                      src={itemInfo.image} 
                      alt={itemInfo.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] to-transparent"></div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">
                        Premium
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">{itemInfo.title}</h3>
                      <p className="text-sm text-[#C8B8DB]/80">{itemInfo.description}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* Item details section */}
                    {itemInfo.detailLines && itemInfo.detailLines.length > 0 && (
                      <div className="mb-3 text-xs text-[#C8B8DB]/80 bg-[#1A1A2E]/80 rounded p-2 border border-[#432874]/20">
                        {itemInfo.detailLines.map((line, index) => 
                          line ? <div key={index} className="mb-1">{line}</div> : null
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <img 
                          src={getCurrencyIcon(listing.currencyType)} 
                          alt={listing.currencyType} 
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="text-lg font-semibold text-[#FFD700]">{listing.price}</span>
                      </div>
                      
                      <Button
                        className={`${canAfford(listing) 
                          ? 'bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]' 
                          : 'bg-[#432874]/50 text-[#C8B8DB]/50 cursor-not-allowed'}`}
                        disabled={!canAfford(listing) || isSubmitting || isLocked}
                        onClick={() => setConfirmDialog({ open: true, listing })}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        {isLocked ? 'Locked' : canAfford(listing) ? 'Purchase' : 'Can\'t Afford'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-[#C8B8DB]/60 italic">
                      Limited time offer, refreshes with the daily market.
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
      
      {/* Standard Items */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Coins className="h-5 w-5 mr-2 text-[#C8B8DB]" />
          <h3 className="text-xl font-cinzel font-bold text-[#C8B8DB]">Standard Items</h3>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {standardListingsWithPlaceholders.length === 0 ? (
            <div className="col-span-full bg-[#1A1A2E] rounded-xl p-8 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No standard items are available at the moment. Check back later!
              </p>
            </div>
          ) : (
            standardListingsWithPlaceholders.map((listing, index) => {
              const itemInfo = getItemInfo(listing);
              const isLocked = index >= blackMarketLevel + 2 || (listing as any).isPlaceholder;
              
              return (
                <motion.div
                  key={listing.id}
                  variants={item}
                  className={`bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden relative ${isLocked ? 'opacity-60' : ''}`}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                      <Lock className="h-12 w-12 text-[#432874] mb-4" />
                      <p className="text-center text-[#C8B8DB] font-semibold">
                        Upgrade your Black Market to Level {Math.ceil((index + 1) / 3)} to unlock this slot
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 border-[#FF9D00]/50 text-[#FF9D00] hover:bg-[#FF9D00]/10"
                        onClick={() => setShowUpgradeDialog(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Upgrade Market
                      </Button>
                    </div>
                  )}
                  
                  <div className="relative h-40">
                    <img 
                      src={itemInfo.image} 
                      alt={itemInfo.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] to-transparent"></div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-[#C8B8DB]/20 text-[#C8B8DB] border-[#C8B8DB]/30">
                        Standard
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-xl font-cinzel font-bold text-[#C8B8DB]">{itemInfo.title}</h3>
                      <p className="text-sm text-[#C8B8DB]/80">{itemInfo.description}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* Item details section */}
                    {itemInfo.detailLines && itemInfo.detailLines.length > 0 && (
                      <div className="mb-3 text-xs text-[#C8B8DB]/80 bg-[#1A1A2E]/80 rounded p-2 border border-[#432874]/20">
                        {itemInfo.detailLines.map((line, index) => 
                          line ? <div key={index} className="mb-1">{line}</div> : null
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <img 
                          src={getCurrencyIcon(listing.currencyType)} 
                          alt={listing.currencyType} 
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="text-lg font-semibold text-[#C8B8DB]">{listing.price}</span>
                      </div>
                      
                      <Button
                        className={`${canAfford(listing) 
                          ? 'bg-[#432874] hover:bg-[#432874]/80' 
                          : 'bg-[#432874]/50 text-[#C8B8DB]/50 cursor-not-allowed'}`}
                        disabled={!canAfford(listing) || isSubmitting || isLocked}
                        onClick={() => setConfirmDialog({ open: true, listing })}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        {isLocked ? 'Locked' : canAfford(listing) ? 'Purchase' : 'Can\'t Afford'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-[#C8B8DB]/60 italic">
                      Available until the daily market refresh.
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
      
      {/* Coming Soon: Player Listings */}
      <div className="mt-12 bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Users className="h-6 w-6 text-[#FF9D00] mr-2" />
          <h2 className="text-xl font-cinzel font-bold">Coming Soon: Player Listings</h2>
        </div>
        <p className="text-[#C8B8DB]/80 mb-4">
          Soon you'll be able to list your own characters, auras, and resources for sale to other players. Upgrade your Black Market level to unlock more listing slots!
        </p>
        
        <div className="bg-[#432874]/20 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Shield className="h-5 w-5 text-[#00B9AE] mr-2" />
            <h3 className="font-semibold">Your Black Market Level: {user?.blackMarketLevel || 1}</h3>
          </div>
          <div className="text-sm text-[#C8B8DB]/80">
            Listing Slots: {user?.blackMarketLevel || 1} / 5 (max)
          </div>
        </div>
      </div>
      
      {/* Purchase Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Confirm Purchase</DialogTitle>
          </DialogHeader>
          
          {confirmDialog.listing && (
            <div className="py-4">
              <div className="flex items-center mb-4">
                <img 
                  src={getItemInfo(confirmDialog.listing).image}
                  alt={getItemInfo(confirmDialog.listing).title} 
                  className="w-16 h-16 rounded-lg object-cover mr-4"
                />
                <div>
                  <h3 className="font-semibold text-lg">{getItemInfo(confirmDialog.listing).title}</h3>
                  <p className="text-sm text-[#C8B8DB]/70">
                    {getItemInfo(confirmDialog.listing).description}
                  </p>
                </div>
              </div>
              
              {/* Display item details in the confirmation dialog */}
              {getItemInfo(confirmDialog.listing).detailLines && getItemInfo(confirmDialog.listing).detailLines.length > 0 && (
                <div className="mb-4 p-3 bg-[#432874]/10 rounded border border-[#432874]/30">
                  <h4 className="text-sm font-semibold mb-1">Item Details:</h4>
                  {getItemInfo(confirmDialog.listing).detailLines.map((line, index) => 
                    line ? <div key={index} className="text-xs text-[#C8B8DB]/80 mb-1">{line}</div> : null
                  )}
                </div>
              )}
              
              <div className="bg-[#432874]/20 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span>Price:</span>
                  <div className="flex items-center">
                    <img 
                      src={getCurrencyIcon(confirmDialog.listing.currencyType)} 
                      alt={confirmDialog.listing.currencyType} 
                      className="w-5 h-5 rounded-full mr-1"
                    />
                    <span className={confirmDialog.listing.currencyType === 'forgeTokens' ? 'text-[#FFD700]' : ''}>
                      {confirmDialog.listing.price}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span>Your Balance:</span>
                  <div className="flex items-center">
                    <img 
                      src={getCurrencyIcon(confirmDialog.listing.currencyType)} 
                      alt={confirmDialog.listing.currencyType} 
                      className="w-5 h-5 rounded-full mr-1"
                    />
                    <span className={confirmDialog.listing.currencyType === 'forgeTokens' ? 'text-[#FFD700]' : ''}>
                      {confirmDialog.listing.currencyType === 'forgeTokens' 
                        ? user?.forgeTokens || 0 
                        : user?.rogueCredits || 0
                      }
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 border-t border-[#432874]/50 pt-2">
                  <span>After Purchase:</span>
                  <div className="flex items-center">
                    <img 
                      src={getCurrencyIcon(confirmDialog.listing.currencyType)} 
                      alt={confirmDialog.listing.currencyType} 
                      className="w-5 h-5 rounded-full mr-1"
                    />
                    <span className={confirmDialog.listing.currencyType === 'forgeTokens' ? 'text-[#FFD700]' : ''}>
                      {confirmDialog.listing.currencyType === 'forgeTokens' 
                        ? (user?.forgeTokens || 0) - confirmDialog.listing.price
                        : (user?.rogueCredits || 0) - confirmDialog.listing.price
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start mb-4">
                <AlertTriangle className="h-5 w-5 text-[#FF9D00] mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  This purchase cannot be undone. Are you sure you want to proceed?
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
              onClick={() => setConfirmDialog({ open: false, listing: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
              onClick={() => confirmDialog.listing && handlePurchase(confirmDialog.listing)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlackMarketView;