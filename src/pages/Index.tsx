import HeroSection from "@/components/HeroSection";
import TokenCreator from "@/components/TokenCreator";
import RecentLaunches from "@/components/RecentLaunches";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <TokenCreator />
      <RecentLaunches />
    </div>
  );
};

export default Index;
