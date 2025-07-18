import { Button } from "./ui/button";
import { Rocket, TrendingUp, Flame } from "lucide-react";
import FloatingTokens from "./FloatingTokens";
import heroImage from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      
      {/* Floating tokens animation */}
      <FloatingTokens />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Hero headline */}
        <h1 className="text-6xl md:text-8xl font-black mb-6 text-gradient leading-tight">
          Pump It.
          <br />
          Launch Instantly.
          <br />
          Go Viral on Solana.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          The fastest way to launch your meme token. No bullsh*t, no waiting. 
          Just pure degenerate energy.
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary flex items-center gap-2">
              <Rocket className="text-accent" />
              42,069
            </div>
            <div className="text-sm text-muted-foreground">Tokens Pumped</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary flex items-center gap-2">
              <Flame className="text-destructive" />
              1,337
            </div>
            <div className="text-sm text-muted-foreground">SOL Burned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent flex items-center gap-2">
              <TrendingUp className="text-accent" />
              $6.9M
            </div>
            <div className="text-sm text-muted-foreground">Volume 24h</div>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          variant="pump" 
          size="xl" 
          className="mb-8 animate-pump"
          onClick={() => document.getElementById('token-creator')?.scrollIntoView({ behavior: 'smooth' })}
        >
          🚀 Launch My Token
        </Button>

        {/* Sub text */}
        <p className="text-sm text-muted-foreground">
          Join the pump. No experience needed. Just vibes.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;