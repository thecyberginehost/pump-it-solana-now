import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChatContext } from "@/contexts/ChatContext";
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
  Coins
} from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { publicKey } = useWallet();
  const { isChatOpen, toggleChat } = useChatContext();

  const navItems = [
    { path: "/", label: "Launch", icon: Home },
    { path: "/tokens", label: "Tokens", icon: Coins },
    { path: "/boosts", label: "Boosts", icon: Zap },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Rocket className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              MoonForge
            </span>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Wallet Connection & Chat */}
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

          {/* Mobile menu button */}
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

        {/* Mobile Navigation */}
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
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;