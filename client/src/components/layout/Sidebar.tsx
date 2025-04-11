import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import AICompanion from '../ui/AICompanion';
import { 
  Home, 
  User, 
  Grid, 
  Gem, 
  ShoppingBag, 
  Building2, 
  List, 
  Hammer
} from 'lucide-react';

const navItems = [
  { path: "/", label: "Dashboard", icon: <Home className="h-6 w-6" /> },
  { path: "/characters", label: "Characters", icon: <User className="h-6 w-6" /> },
  { path: "/dungeons", label: "Dungeon", icon: <Grid className="h-6 w-6" /> },
  { path: "/farming", label: "Farming", icon: <Gem className="h-6 w-6" /> },
  { path: "/forge", label: "Forge", icon: <Hammer className="h-6 w-6" /> },
  { path: "/blackmarket", label: "Black Market", icon: <ShoppingBag className="h-6 w-6" /> },
  { path: "/buildings", label: "Buildings", icon: <Building2 className="h-6 w-6" /> },
  { path: "/bounty", label: "Bounty Board", icon: <List className="h-6 w-6" /> },
];

const Sidebar = () => {
  const [location] = useLocation();
  
  return (
    <aside className="w-16 md:w-56 bg-[#1A1A2E] border-r border-[#432874]/50 flex flex-col transition-all duration-300">
      <div className="py-4 flex flex-col items-center md:items-start space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <a 
                className={`flex items-center w-full px-3 py-2.5 rounded-lg ${
                  isActive 
                    ? "bg-[#432874]/20 text-[#FF9D00] border-l-2 border-[#FF9D00]" 
                    : "hover:bg-[#432874]/10 text-[#C8B8DB]"
                }`}
              >
                {item.icon}
                <span className="ml-3 hidden md:block">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto p-4 hidden md:block">
        <div className="bg-[#432874]/20 rounded-lg p-2 text-center">
          <div className="text-xs text-[#C8B8DB]/70">AI Companion</div>
          <AICompanion />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
