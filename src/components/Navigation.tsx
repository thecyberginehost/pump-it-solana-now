import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/WalletButton";
import { MobileWalletButton } from "@/components/MobileWalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChatContext } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Home, 
  Trophy, 
  BarChart3, 
  Menu, 
  X, 
  Rocket,
  Crown,
  Zap,
  Bot,
  Coins,
  Award,
  MapPin,
  ChevronUp,
  MoreHorizontal
} from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const location = useLocation();
  const { publicKey } = useWallet();
  const { isChatOpen, toggleChat } = useChatContext();
  const isMobile = useIsMobile();

  const navItems = [
    { path: "/", label: "Launch", icon: Home },
    { path: "/tokens", label: "Tokens", icon: Coins },
    { path: "/achievements", label: "Achievements", icon: Award },
    { path: "/roadmap", label: "Roadmap", icon: MapPin },
    { path: "/boosts", label: "Boosts", icon: Zap },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  // Most important buttons for mobile bottom nav
  const primaryMobileItems = [
    { path: "/", label: "Launch", icon: Home },
    { path: "/tokens", label: "Tokens", icon: Coins },
    { path: "/achievements", label: "Achievements", icon: Award },
  ];

  // Secondary items for dropdown
  const secondaryMobileItems = [
    { path: "/roadmap", label: "Roadmap", icon: MapPin },
    { path: "/boosts", label: "Boosts", icon: Zap },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <img 
                  src="https://s3.us-east-1.amazonaws.com/moonforge.io/moonforgelogo.png" 
                  alt="MoonForge Logo" 
                  className="w-8 h-8 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                MoonForge
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Wallet & Chat */}
            <div className="hidden md:flex items-center space-x-4">
              {publicKey && (
                <Button
                  variant={isChatOpen ? "default" : "outline"}
                  size="sm"
                  onClick={toggleChat}
                  className="flex items-center space-x-2"
                >
                  <Bot className="w-4 h-4" />
                  <span>Degen Copilot</span>
                </Button>
              )}
              <WalletButton />
            </div>

            {/* Mobile menu button for full screen overlay */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Full Navigation Overlay */}
          {isOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-t border-border">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="pt-4 space-y-2">
                  {publicKey && (
                    <Button
                      variant={isChatOpen ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        toggleChat();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Degen Copilot</span>
                    </Button>
                  )}
                  <div className="w-full">
                    <MobileWalletButton />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
          {/* Drop-up menu for secondary items */}
          {isMobileMoreOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border">
              <div className="grid grid-cols-2 gap-2 p-4">
                {secondaryMobileItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMoreOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mb-1" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {publicKey && (
                  <Button
                    variant={isChatOpen ? "default" : "outline"}
                    onClick={() => {
                      toggleChat();
                      setIsMobileMoreOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-3 h-auto text-xs"
                  >
                    <Bot className="w-5 h-5 mb-1" />
                    <span>Copilot</span>
                  </Button>
                )}
                <div className="flex flex-col items-center justify-center">
                  <MobileWalletButton />
                </div>
              </div>
            </div>
          )}

          {/* Main bottom navigation */}
          <div className="flex items-center justify-around px-4 py-2 safe-area-pb">
            {primaryMobileItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors min-w-16 ${
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComponent className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* More button */}
            <Button
              variant={isMobileMoreOpen ? "default" : "ghost"}
              onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
              className="flex flex-col items-center justify-center p-2 h-auto text-xs font-medium min-w-16"
            >
              <ChevronUp className={`w-5 h-5 mb-1 transition-transform ${isMobileMoreOpen ? 'rotate-180' : ''}`} />
              <span>More</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;