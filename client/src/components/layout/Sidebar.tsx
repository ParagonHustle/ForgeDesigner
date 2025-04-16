import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import AICompanion from '../ui/AICompanion';
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Package, 
  Grid, 
  Gem, 
  ShoppingBag, 
  Building2, 
  List, 
  Hammer,
  Award,
  HelpCircle,
  User,
  Scroll
} from 'lucide-react';

const navItems = [
  { path: "/", label: "Dashboard", icon: <Home className="h-6 w-6" /> },
  { path: "/inventory", label: "Inventory", icon: <Package className="h-6 w-6" /> },
  { path: "/dungeons", label: "Dungeon", icon: <Grid className="h-6 w-6" /> },
  { path: "/farming", label: "Farming", icon: <Gem className="h-6 w-6" /> },
  { path: "/forge", label: "Forge", icon: <Hammer className="h-6 w-6" /> },
  { path: "/blackmarket", label: "Black Market", icon: <ShoppingBag className="h-6 w-6" /> },
  { path: "/bountyboard", label: "Bounty Board", icon: <Scroll className="h-6 w-6" /> },
  { path: "/townhall", label: "Townhall", icon: <Building2 className="h-6 w-6" /> },
  { path: "/tavern", label: "Tavern", icon: <User className="h-6 w-6" /> },
  { path: "/buildings", label: "Buildings", icon: <Building2 className="h-6 w-6" /> },
  { path: "/collections", label: "Collections", icon: <Award className="h-6 w-6" /> },
];

const Sidebar = () => {
  const [location] = useLocation();
  
  return (
    <aside className="w-16 md:w-56 bg-[#1A1A2E] border-r border-[#432874]/50 flex flex-col h-screen transition-all duration-300">
      <div className="py-4 flex flex-col items-center md:items-start space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div 
                className={`flex items-center w-full px-3 py-2.5 rounded-lg cursor-pointer ${
                  isActive 
                    ? "bg-[#432874]/20 text-[#FF9D00] border-l-2 border-[#FF9D00]" 
                    : "hover:bg-[#432874]/10 text-[#C8B8DB]"
                }`}
              >
                {item.icon}
                <span className="ml-3 hidden md:block">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto p-4 hidden md:block space-y-4">
        <div className="bg-[#432874]/20 rounded-lg p-3 text-center">
          <div className="text-xs text-[#C8B8DB]/70 mb-2">Today's Special Offer</div>
          <div className="text-[#FF9D00] text-sm font-bold">50% OFF ALL PREMIUM PACKS</div>
          <div className="text-xs text-[#C8B8DB]/90 mt-1">Limited time offer! Ends in 3h 45m</div>
          <div className="mt-2">
            <Button size="sm" className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]">
              Claim Offer
            </Button>
          </div>
        </div>
        
        <div className="bg-[#432874]/20 rounded-lg p-2 text-center">
          <div className="text-xs text-[#C8B8DB]/70">AI Companion</div>
          <AICompanion />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
