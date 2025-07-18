import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Rocket, Zap, Trophy, DollarSign } from "lucide-react";
import { toast } from "sonner";

const QuickStart = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      title: "Choose Your Strategy",
      description: "Pick your token launch strategy for maximum success",
      icon: Rocket,
      options: [
        { name: "Meme Token", bonus: "Popular category, high viral potential" },
        { name: "Utility Token", bonus: "Long-term value, sustainable growth" },
        { name: "Community Token", bonus: "Strong holder loyalty, organic growth" }
      ]
    },
    {
      title: "AI-Powered Creation",
      description: "Let AI create the perfect name, symbol, and image",
      icon: Zap,
      benefits: ["90% higher success rate", "Viral name generation", "Trending meme creation"]
    },
    {
      title: "Launch Strategy",
      description: "Select boosts to maximize your launch impact",
      icon: Trophy,
      boosts: [
        { name: "Trending Launch", roi: "300% average ROI" },
        { name: "Viral Package", roi: "500% average ROI" },
        { name: "Whale Package", roi: "1000%+ average ROI" }
      ]
    },
    {
      title: "Profit Tracking", 
      description: "Monitor and optimize your token's performance",
      icon: DollarSign,
      features: ["Real-time analytics", "Revenue optimization", "Market insights"]
    }
  ];

  const handleStepComplete = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
      toast.success(`Step ${stepIndex + 1} completed! 🎉`);
    }
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      toast.success("🚀 Ready to launch! Let's make you money!", {
        description: "Start creating your first token now"
      });
    }
  };

  const handleSkipToCreator = () => {
    toast.success("💰 Let's start making money!");
    // Scroll to token creator
    document.getElementById('token-creator')?.scrollIntoView({ behavior: 'smooth' });
  };

  const progress = ((completedSteps.length) / steps.length) * 100;

  return (
    <div className="py-12 px-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            Quick Start Guide
          </h2>
          <p className="text-muted-foreground mb-6">
            Follow these steps to maximize your token's success potential
          </p>
          <div className="max-w-md mx-auto mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isCompleted = completedSteps.includes(index);
            const isCurrent = currentStep === index;
            const isAccessible = index <= currentStep;

            return (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all duration-300 cursor-pointer ${
                  isCompleted 
                    ? 'border-green-500 bg-green-500/10' 
                    : isCurrent 
                      ? 'border-primary bg-primary/10 shadow-lg scale-105' 
                      : isAccessible
                        ? 'border-border hover:border-primary/50'
                        : 'border-border opacity-50'
                }`}
                onClick={() => isAccessible && handleStepComplete(index)}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60" />
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    isCompleted ? 'bg-green-500' : isCurrent ? 'bg-primary' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <IconComponent className={`w-6 h-6 ${isCurrent ? 'text-white' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {step.description}
                  </p>
                  
                  {/* Step-specific content */}
                  {step.options && (
                    <div className="space-y-2">
                      {step.options.map((option, idx) => (
                        <div key={idx} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{option.name}</div>
                          <div className="text-muted-foreground">{option.bonus}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {step.benefits && (
                    <div className="space-y-1">
                      {step.benefits.map((benefit, idx) => (
                        <div key={idx} className="text-xs flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {step.boosts && (
                    <div className="space-y-2">
                      {step.boosts.map((boost, idx) => (
                        <div key={idx} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{boost.name}</div>
                          <div className="text-green-500">{boost.roi}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {step.features && (
                    <div className="space-y-1">
                      {step.features.map((feature, idx) => (
                        <div key={idx} className="text-xs flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Success Stories */}
        <Card className="mb-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">💰 Success Stories</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">$2.5M</div>
                <div className="text-sm text-muted-foreground">Highest token market cap</div>
                <div className="text-xs text-muted-foreground mt-1">Using Viral Package</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">1,247%</div>
                <div className="text-sm text-muted-foreground">Average ROI with boosts</div>
                <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">24h</div>
                <div className="text-sm text-muted-foreground">Fastest to $100k market cap</div>
                <div className="text-xs text-muted-foreground mt-1">With AI + Trending boost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all duration-300"
            onClick={handleSkipToCreator}
          >
            <Rocket className="w-5 h-5 mr-2" />
            Start Creating & Earning Now
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Join 10,000+ successful token creators
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickStart;