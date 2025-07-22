import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Rocket, 
  Building, 
  Globe, 
  Zap, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Users,
  Code,
  Coins,
  Shield,
  TrendingUp,
  Smartphone,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Roadmap: React.FC = () => {
  const phases = [
    {
      id: 1,
      title: "MoonForge Meme",
      subtitle: "AI-Powered Meme Token Platform",
      status: "current",
      progress: 85,
      timeline: "Q1 2025",
      description: "The world's first AI-native meme token creation platform with gamified achievements",
      features: [
        "🤖 AI Meme Generation",
        "🎮 Achievement System", 
        "🏆 Creator Tools & VIP Access",
        "💎 Token Launching & Trading",
        "🚀 Boost System",
        "📊 Analytics Dashboard"
      ],
      hiring: {
        roles: ["Frontend Developer", "AI Engineer", "Community Manager"],
        team_size: "2-3 people"
      },
      benefits: {
        creators: "Launch viral memes with AI assistance",
        traders: "Earn achievements and unlock exclusive features",
        community: "Discover trending memes and join communities"
      },
      icon: Rocket,
      color: "from-green-500 to-emerald-600"
    },
    {
      id: 2,
      title: "MoonForge Utility",
      subtitle: "Enterprise Token Creation Platform",
      status: "planned",
      progress: 0,
      timeline: "Q2 2025",
      description: "Professional-grade platform for serious projects to create utility tokens with advanced features",
      features: [
        "🏢 Enterprise Smart Contracts",
        "🔒 Advanced Security Features",
        "⚖️ Governance & Voting Systems",
        "💼 Vesting & Token Distribution",
        "🔗 Multi-Chain Support",
        "📋 Compliance Tools"
      ],
      hiring: {
        roles: ["Senior Blockchain Developer", "Smart Contract Auditor", "Enterprise Sales"],
        team_size: "5-8 people"
      },
      benefits: {
        startups: "Launch professional tokens for your company",
        enterprises: "Create internal tokens for employees and customers",
        developers: "Access advanced smart contract templates"
      },
      icon: Building,
      color: "from-blue-500 to-cyan-600"
    },
    {
      id: 3,
      title: "MoonForge Ecosystem",
      subtitle: "Cross-Chain Web3 Platform",
      status: "future",
      progress: 0,
      timeline: "Q3-Q4 2025",
      description: "Expand beyond Solana to create a multi-chain ecosystem with NFTs, DAOs, and DeFi integration",
      features: [
        "🌐 Cross-Chain Support",
        "🎨 NFT Integration",
        "🏛️ DAO Governance",
        "💰 DeFi Protocols",
        "📱 Native Mobile App (iOS & Android)",
        "🛠️ Developer SDK"
      ],
      hiring: {
        roles: ["Mobile App Developers", "DevOps Engineers", "Product Managers", "UI/UX Designers"],
        team_size: "15-20 people"
      },
      benefits: {
        users: "Access tokens across all major blockchains",
        developers: "Build on our platform with powerful APIs",
        investors: "Participate in platform governance and revenue"
      },
      icon: Globe,
      color: "from-purple-500 to-pink-600"
    },
    {
      id: 4,
      title: "MoonForge Infrastructure",
      subtitle: "Web3 Development Platform",
      status: "vision",
      progress: 0,
      timeline: "2026",
      description: "Become the go-to infrastructure for Web3 token creation, powering other platforms and enterprises",
      features: [
        "⚡ White-Label Solutions",
        "🔌 API Marketplace",
        "🏦 Institutional Features",
        "🤝 Partner Integrations",
        "🔬 Advanced Analytics",
        "🌟 AI Marketplace"
      ],
      hiring: {
        roles: ["VP Engineering", "Business Development", "AI/ML Engineers", "Enterprise Architects"],
        team_size: "30+ people"
      },
      benefits: {
        platforms: "Integrate our token creation into your app",
        enterprises: "Custom solutions for your specific needs",
        ecosystem: "Power the next generation of Web3 applications"
      },
      icon: Zap,
      color: "from-orange-500 to-red-600"
    }
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'current':
        return { label: 'In Development', color: 'bg-green-500', icon: Clock };
      case 'planned':
        return { label: 'Planned', color: 'bg-blue-500', icon: ArrowRight };
      case 'future':
        return { label: 'Future', color: 'bg-purple-500', icon: Lightbulb };
      case 'vision':
        return { label: 'Vision', color: 'bg-orange-500', icon: TrendingUp };
      default:
        return { label: 'Unknown', color: 'bg-gray-500', icon: Clock };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            MoonForge Roadmap
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our journey to revolutionize Web3 token creation. From AI-powered memes to enterprise infrastructure.
          </p>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>In Development</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Future</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Vision</span>
            </div>
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-8">
          {phases.map((phase, index) => {
            const statusInfo = getStatusInfo(phase.status);
            const IconComponent = phase.icon;
            const StatusIcon = statusInfo.icon;

            return (
              <div key={phase.id} className="relative">
                {/* Connection Line */}
                {index < phases.length - 1 && (
                  <div className="hidden md:block absolute left-6 top-20 w-0.5 h-32 bg-gradient-to-b from-border to-transparent"></div>
                )}

                <Card className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${phase.color} flex items-center justify-center text-white`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-2xl">{phase.title}</CardTitle>
                            <Badge variant="outline" className={`${statusInfo.color} text-white border-none`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground font-medium">{phase.subtitle}</p>
                          <p className="text-sm text-muted-foreground mt-1">{phase.timeline}</p>
                        </div>
                      </div>
                      
                      {phase.status === 'current' && (
                        <div className="text-right min-w-24">
                          <div className="text-2xl font-bold text-green-600">{phase.progress}%</div>
                          <Progress value={phase.progress} className="w-20 mt-1" />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground text-lg">{phase.description}</p>

                    {/* Features */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Key Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {phase.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hiring Information */}
                    {phase.hiring && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          Team Growth ({phase.hiring.team_size})
                        </h4>
                        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                            <strong>We're hiring!</strong> Join us as we scale to {phase.hiring.team_size}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {phase.hiring.roles.map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Benefits */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Who Benefits
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(phase.benefits).map(([userType, benefit]) => (
                          <div key={userType} className="p-3 rounded-lg bg-muted/50">
                            <div className="font-medium capitalize mb-1">{userType}</div>
                            <div className="text-sm text-muted-foreground">{benefit}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA for current phase */}
                    {phase.status === 'current' && (
                      <div className="pt-4 border-t">
                        <div className="flex flex-wrap gap-3">
                          <Button asChild>
                            <Link to="/">Try MoonForge Now</Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to="/achievements">View Achievements</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Join Our Team Section */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Users className="w-12 h-12 mx-auto text-purple-600" />
              <h3 className="text-2xl font-bold">Join the MoonForge Revolution</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're building the future of Web3, and we need amazing people to join our journey. 
                From blockchain developers to mobile engineers, we're hiring across all phases of our roadmap.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="text-left space-y-2">
                  <h4 className="font-semibold text-purple-600">Current Openings</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• Frontend Developer (React/TypeScript)</div>
                    <div>• AI Engineer (LLM/Computer Vision)</div>
                    <div>• Community Manager</div>
                  </div>
                </div>
                <div className="text-left space-y-2">
                  <h4 className="font-semibold text-purple-600">Coming Soon</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• Mobile App Developers (iOS/Android)</div>
                    <div>• Blockchain Engineers</div>
                    <div>• Product Managers</div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Interested? Send your resume and portfolio to <span className="font-mono bg-muted px-2 py-1 rounded">careers@moonforge.io</span>
                </p>
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  Remote-First • Competitive Equity • Flexible Hours
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why This Matters */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Why This Roadmap Matters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-2">
                <Code className="w-8 h-8 mx-auto text-primary" />
                <h4 className="font-semibold">Innovation First</h4>
                <p className="text-sm text-muted-foreground">
                  We're not copying - we're creating the future of Web3 token platforms
                </p>
              </div>
              <div className="space-y-2">
                <Shield className="w-8 h-8 mx-auto text-primary" />
                <h4 className="font-semibold">User-Centric</h4>
                <p className="text-sm text-muted-foreground">
                  Every feature is designed with real user needs and feedback in mind
                </p>
              </div>
              <div className="space-y-2">
                <Coins className="w-8 h-8 mx-auto text-primary" />
                <h4 className="font-semibold">Sustainable Growth</h4>
                <p className="text-sm text-muted-foreground">
                  Building a platform that scales from memes to enterprise solutions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Join Our Journey</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Be part of the Web3 revolution. Start with meme tokens today, and grow with us as we expand into mobile apps, 
            cross-chain ecosystems, and enterprise solutions.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/">Start Creating</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/tokens">Explore Tokens</Link>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            <strong>Coming 2025:</strong> Native mobile app for iOS and Android
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;