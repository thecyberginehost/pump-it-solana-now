import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Scissors, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onImageUpdate: (newImageUrl: string) => void;
  onRegenerate: () => void;
}

const ImageViewer = ({ isOpen, onClose, imageUrl, onImageUpdate, onRegenerate }: ImageViewerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [currentBaseImageUrl, setCurrentBaseImageUrl] = useState<string>("");

  // Reset processed image when a new base image is provided
  React.useEffect(() => {
    if (imageUrl !== currentBaseImageUrl) {
      setProcessedImageUrl(null);
      setCurrentBaseImageUrl(imageUrl);
    }
  }, [imageUrl, currentBaseImageUrl]);

  const removeBackground = async () => {
    if (!imageUrl) return;
    
    setIsProcessing(true);
    try {
      toast.info("Sending image to AI for background removal...");
      
      // Use the new background-removal type with the actual image URL
      const response = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'background-removal',
          prompt: 'Remove the background completely, keep only the main subject with transparent background',
          imageUrl: imageUrl, // Pass the actual image URL
        },
      });

      if (response.error) throw response.error;
      
      if (response.data?.imageUrl) {
        setProcessedImageUrl(response.data.imageUrl);
        toast.success("Background removed successfully!");
      } else {
        throw new Error("No processed image URL returned");
      }
      
    } catch (error) {
      console.error('Background removal failed:', error);
      toast.error("Failed to remove background. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseProcessedImage = () => {
    if (processedImageUrl) {
      onImageUpdate(processedImageUrl);
      toast.success("Updated token image with background removed!");
      onClose();
    }
  };

  const handleDownload = () => {
    const urlToDownload = processedImageUrl || imageUrl;
    const link = document.createElement('a');
    link.href = urlToDownload;
    link.download = processedImageUrl ? 'token-logo-no-bg.png' : 'token-logo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const handleRegenerate = () => {
    onRegenerate();
    onClose();
  };

  const currentImageUrl = processedImageUrl || imageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Token Image Preview</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          {/* Image Display */}
          <div className="relative mb-6 bg-checker-pattern rounded-lg overflow-hidden">
            <img
              src={currentImageUrl}
              alt="Token preview"
              className="w-full max-h-96 object-contain mx-auto"
            />
            {processedImageUrl && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                Background Removed
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {!processedImageUrl && (
              <Button 
                onClick={removeBackground} 
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scissors className="w-4 h-4" />
                )}
                Remove Background
              </Button>
            )}
            
            {processedImageUrl && (
              <Button 
                onClick={handleUseProcessedImage}
                variant="default"
                className="flex items-center gap-2"
              >
                Use This Image
              </Button>
            )}
            
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            
            <Button 
              onClick={handleRegenerate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate
            </Button>
          </div>

          {isProcessing && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Processing with AI... This may take a few moments.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
