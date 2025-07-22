
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { ChatProvider, useChatContext } from "@/contexts/ChatContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TokenSuccess from "./pages/TokenSuccess";
import TokenDetail from "./pages/TokenDetail";
import Disclaimer from "./pages/Disclaimer";
import Boosts from "./pages/Boosts";
import CreatorDashboard from "@/components/CreatorDashboard";
import TokenList from "@/pages/TokenList";
import Leaderboard from "@/components/Leaderboard";
import Achievements from "./pages/Achievements";
import Roadmap from "./pages/Roadmap";
import ChatbotSidebar from "@/components/ChatbotSidebar";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isChatOpen, setIsChatOpen } = useChatContext();

  return (
    <div className="relative">
      {/* Main content with dynamic margin when chat is open */}
      <div 
        className={`transition-all duration-300 ${
          isChatOpen ? "mr-80" : "mr-0"
        }`}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<CreatorDashboard />} />
          <Route path="/tokens" element={<TokenList />} />
          <Route path="/token/:identifier" element={<TokenDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/boosts" element={<Boosts />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/token-success" element={<TokenSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {/* Global Chatbot Sidebar */}
      <ChatbotSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletContextProvider>
      <ChatProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </ChatProvider>
    </WalletContextProvider>
  </QueryClientProvider>
);

export default App;
