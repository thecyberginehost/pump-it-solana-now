
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { AlertTriangle, Sparkles, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { useAIQuickLaunch, QuickLaunchResult } from '@/hooks/useAIQuickLaunch';

interface AIQuickLaunchModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tokenData: QuickLaunchResult) => void;
}

const AIQuickLaunchModal = ({ open, onClose, onConfirm }: AIQuickLaunchModalProps) => {
  const [step, setStep] = useState<'confirm' | 'generating' | 'preview'>('confirm');
  const [understood, setUnderstood] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<QuickLaunchResult | null>(null);
  
  const { generateTrendBasedToken, regenerateComponent, isGenerating, currentStep } = useAIQuickLaunch();

  const handleGenerate = async () => {
    setStep('generating');
    const result = await generateTrendBasedToken();
    
    if (result) {
      setGeneratedToken(result);
      setStep('preview');
    } else {
      setStep('confirm');
    }
  };

  const handleRegenerateComponent = async (component: 'name' | 'symbol' | 'image') => {
    if (!generatedToken) return;
    
    const result = await regenerateComponent(component, generatedToken);
    if (result) {
      setGeneratedToken(prev => prev ? { ...prev, ...result } : null);
    }
  };

  const handleConfirm = () => {
    if (generatedToken) {
      onConfirm(generatedToken);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setUnderstood(false);
    setAgreedToTerms(false);
    setGeneratedToken(null);
    onClose();
  };

  if (step === 'generating') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent animate-spin" />
              AI Quick Launch
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                <TrendingUp className="absolute inset-0 m-auto h-6 w-6 text-accent" />
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">{currentStep || 'Initializing AI systems...'}</p>
                <p className="text-sm text-muted-foreground">
                  This may take up to 30 seconds
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'preview' && generatedToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Generated Token Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Token Preview Card */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-4">
                {generatedToken.imageUrl && (
                  <div className="relative group">
                    <img 
                      src={generatedToken.imageUrl} 
                      alt="Token logo" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRegenerateComponent('image')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 group">
                    <h3 className="font-bold text-lg">{generatedToken.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRegenerateComponent('name')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 group">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      ${generatedToken.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRegenerateComponent('symbol')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {generatedToken.description}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-3 rounded text-xs">
                <p className="font-medium mb-1">💡 Why this could go viral:</p>
                <p className="text-muted-foreground">{generatedToken.reasoning}</p>
              </div>
            </div>

            {/* Final Warning */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-orange-500">Final Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    Once you proceed with payment (0.02 SOL), this token will be created with the exact details shown above. 
                    <strong className="text-foreground"> Name, symbol, and image cannot be changed after creation.</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1 gap-2" variant="neon">
                <Zap className="h-4 w-4" />
                Launch Token (0.02 SOL)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Quick Launch
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Feature Explanation */}
          <div className="space-y-4">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                AI Trend Research
              </h4>
              <p className="text-sm text-muted-foreground">
                Our AI will research current crypto trends, viral memes, and market sentiment to create a token concept positioned for maximum viral potential.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">This will automatically generate:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Token name based on trending themes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Ticker symbol optimized for virality
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Professional logo image
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Compelling description
                </li>
              </ul>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-orange-500">Important Notice</p>
                <p className="text-sm text-muted-foreground">
                  After payment and token creation, the name, ticker symbol, and logo image 
                  <strong className="text-foreground"> cannot be changed</strong>. 
                  You'll have a chance to preview and approve before final creation.
                </p>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="understood" 
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(!!checked)}
              />
              <label htmlFor="understood" className="text-sm leading-relaxed">
                I understand that AI will generate all token details automatically based on current trends
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed">
                I agree that token details cannot be changed after creation and payment
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!understood || !agreedToTerms}
              className="flex-1 gap-2"
              variant="neon"
            >
              <Sparkles className="h-4 w-4" />
              Generate Token
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIQuickLaunchModal;
