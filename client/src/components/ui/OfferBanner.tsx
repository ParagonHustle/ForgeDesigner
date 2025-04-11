import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/zustandStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const OfferBanner = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!user) return;
    
    setIsPurchasing(true);
    try {
      // Simulate purchase API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Purchase Successful!",
        description: "6,200 Forge Tokens have been added to your account.",
        variant: "default",
      });
      
      // Refresh user data
      fetchUser();
      setDialogOpen(false);
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "There was an error processing your purchase.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-[#432874]/80 to-[#00B9AE]/50 rounded-lg mb-6 relative overflow-hidden">
      <button 
        onClick={() => setShowBanner(false)}
        className="absolute top-2 right-2 text-[#C8B8DB]/70 hover:text-[#C8B8DB] text-sm"
      >
        ✕
      </button>
      
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="text-[#FF9D00] font-cinzel text-xl font-bold">Limited Time Offer!</h3>
          <p className="text-[#C8B8DB] text-sm">Get 6,200 Forge Tokens and unlock exclusive Legendary Auras!</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E] font-semibold">
              Buy Now
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
            <DialogHeader>
              <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Premium Token Package</DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <div className="bg-[#432874]/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center mb-3">
                  <img 
                    src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop"
                    alt="Forge Tokens" 
                    className="w-16 h-16 rounded-full border-2 border-[#FF9D00]"
                  />
                </div>
                
                <h3 className="text-center text-[#FF9D00] font-cinzel text-2xl">6,200 Forge Tokens</h3>
                <p className="text-center text-sm mt-2">
                  Forge Tokens can be used for premium purchases in the Black Market, 
                  speed up building upgrades, and unlock Legendary Auras.
                </p>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#C8B8DB]">Price:</span>
                <span className="text-[#FF9D00] font-bold">$19.99</span>
              </div>
              
              <Button 
                onClick={handlePurchase} 
                disabled={isPurchasing}
                className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E] font-semibold"
              >
                {isPurchasing ? "Processing..." : "Complete Purchase"}
              </Button>
              
              <p className="text-center text-xs mt-4 text-[#C8B8DB]/60">
                For demonstration purposes only. No actual purchase will be made.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full -mr-10 -mt-10 blur-md"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00B9AE]/20 rounded-full -ml-10 -mb-10 blur-md"></div>
    </div>
  );
};

export default OfferBanner;
