
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Award,
  MapPin,
  Zap,
  Trophy
} from "lucide-react";

export const MoreDropdown = () => {
  const location = useLocation();
  
  const secondaryItems = [
    { path: "/achievements", label: "Achievements", icon: Award },
    { path: "/roadmap", label: "Roadmap", icon: MapPin },
    { path: "/boosts", label: "Boosts", icon: Zap },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const isActive = (path: string) => location.pathname === path;
  const hasActiveItem = secondaryItems.some(item => isActive(item.path));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={hasActiveItem ? "default" : "ghost"} 
          className="flex items-center space-x-2"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border border-border">
        {secondaryItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                to={item.path}
                className={`flex items-center space-x-2 w-full px-2 py-2 text-sm cursor-pointer ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
