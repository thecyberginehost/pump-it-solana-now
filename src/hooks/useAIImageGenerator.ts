
import { useState } from 'react';
import { toast } from 'sonner';

export const useAIImageGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMemeImage = async (prompt: string): Promise<string | null> => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your meme');
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI image generation - in production you'd use actual AI service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo, return a placeholder image URL
      const memeImages = [
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=512&h=512&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=512&h=512&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=512&h=512&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=512&h=512&fit=crop&crop=face'
      ];
      
      const randomImage = memeImages[Math.floor(Math.random() * memeImages.length)];
      toast.success('🎨 Meme generated successfully!');
      return randomImage;
      
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Failed to generate meme. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateMemeImage,
    isGenerating
  };
};
