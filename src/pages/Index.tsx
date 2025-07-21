import { useState } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import TokenCreator from "@/components/TokenCreator";
import RecentLaunches from "@/components/RecentLaunches";
import ChatbotSidebar from "@/components/ChatbotSidebar";

const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onChatToggle={handleChatToggle} isChatOpen={isChatOpen} />
      
      {/* Main content with dynamic margin when chat is open */}
      <div 
        className={`transition-all duration-300 ${
          isChatOpen ? "mr-80" : "mr-0"
        }`}
      >
        <HeroSection />
        <TokenCreator />
        <RecentLaunches />
      </div>

      {/* Chatbot Sidebar */}
      <ChatbotSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
};

export default Index;
