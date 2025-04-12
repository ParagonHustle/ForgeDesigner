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
  AlertTriangle
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
  
  // Fetch black market listings
  const { data: listings = [], isLoading, refetch: refetchListings } = useQuery<BlackMarketListing[]>({ 
    queryKey: ['/api/blackmarket/listings'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Filter listings by different categories
  const featuredPremiumListings = listings.filter(listing => 
    listing.isPremium === true && !listing.sold
  );
  
  const regularPremiumListings = listings.filter(listing => 
    listing.currencyType === 'forgeTokens' && !listing.isPremium && !listing.sold
  );
  
  const standardListings = listings.filter(listing => 
    listing.currencyType === 'rogueCredits' && !listing.isPremium && !listing.sold
  );

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

  const getItemInfo = (listing: BlackMarketListing) => {
    const itemData = listing.itemData as any;
    
    switch (listing.itemType) {
      case 'character':
        return {
          title: itemData?.name || 'Mystery Character',
          description: `${itemData?.rarity || 'Unknown'} ${itemData?.class || 'Character'} - Level ${itemData?.level || '?'}`,
          detailLines: [
            itemData?.stats ? `STR: ${itemData.stats.strength || 0} | AGI: ${itemData.stats.agility || 0}` : '',
            itemData?.stats ? `INT: ${itemData.stats.intelligence || 0} | VIT: ${itemData.stats.vitality || 0}` : '',
            itemData?.passiveSkills?.length > 0 ? `Skills: ${itemData.passiveSkills.map((s: any) => s.name).join(', ')}` : 'No special skills'
          ],
          image: itemData?.avatarUrl || 'https://images.unsplash.com/photo-1577095972620-2f389ca3abcd?w=150&h=150&fit=crop'
        };
      case 'aura':
        return {
          title: itemData?.name || 'Mystery Aura',
          description: `${itemData?.element || 'Unknown'} Element - Level ${itemData?.level || '?'}`,
          detailLines: [
            itemData?.statMultipliers ? `Multipliers: STR ×${itemData.statMultipliers.strength?.toFixed(1) || '1.0'}, AGI ×${itemData.statMultipliers.agility?.toFixed(1) || '1.0'}` : '',
            itemData?.statMultipliers ? `INT ×${itemData.statMultipliers.intelligence?.toFixed(1) || '1.0'}, VIT ×${itemData.statMultipliers.vitality?.toFixed(1) || '1.0'}` : '',
            itemData?.skills?.length > 0 ? `Skills: ${itemData.skills.map((s: any) => s.name).join(', ')}` : 'No skills'
          ],
          image: 'https://images.unsplash.com/photo-1618325500063-14cd8117369c?w=150&h=150&fit=crop'
        };
      case 'resource':
        return {
          title: itemData?.name || 'Rare Materials',
          description: `${itemData?.quantity || '?'} ${itemData?.type || 'material'} units`,
          detailLines: [
            itemData?.description || 'Valuable crafting resource'
          ],
          image: itemData?.iconUrl || 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
        };
      default:
        return {
          title: 'Market Item',
          description: 'A valuable item for your collection',
          detailLines: ['Unknown item details'],
          image: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
        };
    }
  };

  const getCurrencyIcon = (currencyType: string) => {
    if (currencyType === 'forgeTokens') {
      return "https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop";
    } else {
      return "https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=250&h=250&fit=crop";
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
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Black Market</h1>
        <p className="text-[#C8B8DB]/80">
          Purchase rare characters, auras, and valuable materials with your currencies.
        </p>
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
      
      {/* Featured Premium Items Section */}
      {featuredPremiumListings.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Sparkles className="h-5 w-5 mr-2 text-[#FFD700]" />
            <h3 className="text-xl font-cinzel font-bold text-[#FFD700]">Featured Premium Items</h3>
          </div>
          
          <div className="bg-gradient-to-r from-[#432874]/40 to-[#1A1A2E] p-1 rounded-xl">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4"
            >
              {featuredPremiumListings.map(listing => {
                const itemInfo = getItemInfo(listing);
                
                return (
                  <motion.div
                    key={listing.id}
                    variants={item}
                    className="bg-[#1A1A2E] border border-[#FFD700]/30 rounded-xl overflow-hidden shadow-lg shadow-[#FFD700]/10"
                  >
                    <div className="relative h-40">
                      <img 
                        src={itemInfo.image} 
                        alt={itemInfo.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] to-transparent"></div>
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-[#FFD700]/30 text-[#FFD700] border-[#FFD700]/50">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-xl font-cinzel font-bold text-[#FFD700]">{itemInfo.title}</h3>
                        <p className="text-sm text-[#C8B8DB]/80">{itemInfo.description}</p>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {/* Item details section */}
                      {itemInfo.detailLines && itemInfo.detailLines.length > 0 && (
                        <div className="mb-3 text-xs text-[#C8B8DB]/80 bg-[#1A1A2E]/80 rounded p-2 border border-[#FFD700]/20">
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
                            ? 'bg-[#FFD700] hover:bg-[#FFD700]/80 text-[#1A1A2E]' 
                            : 'bg-[#432874]/50 text-[#C8B8DB]/50 cursor-not-allowed'}`}
                          disabled={!canAfford(listing) || isSubmitting}
                          onClick={() => setConfirmDialog({ open: true, listing })}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          {canAfford(listing) ? 'Purchase' : 'Can\'t Afford'}
                        </Button>
                      </div>
                      
                      <div className="text-xs text-[#FFD700]/60 italic">
                        Limited time offer, exclusive premium item!
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
      
      {/* Regular Premium Items */}
      {regularPremiumListings.length > 0 && (
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
            {regularPremiumListings.map(listing => {
              const itemInfo = getItemInfo(listing);
              
              return (
                <motion.div
                  key={listing.id}
                  variants={item}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                >
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
                        disabled={!canAfford(listing) || isSubmitting}
                        onClick={() => setConfirmDialog({ open: true, listing })}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        {canAfford(listing) ? 'Purchase' : 'Can\'t Afford'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-[#C8B8DB]/60 italic">
                      Limited time offer, refreshes with the daily market.
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
      
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
          {standardListings.length === 0 ? (
            <div className="col-span-full bg-[#1A1A2E] rounded-xl p-8 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No standard items are available at the moment. Check back later!
              </p>
            </div>
          ) : (
            standardListings.map(listing => {
              const itemInfo = getItemInfo(listing);
              
              return (
                <motion.div
                  key={listing.id}
                  variants={item}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                >
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
                        disabled={!canAfford(listing) || isSubmitting}
                        onClick={() => setConfirmDialog({ open: true, listing })}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        {canAfford(listing) ? 'Purchase' : 'Can\'t Afford'}
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