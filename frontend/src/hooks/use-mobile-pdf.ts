// React Hook for Mobile PDF Handling
// Integrates MobilePdfHandler with React components

import { useState, useCallback } from 'react';
import { mobilePdfHandler, PdfUploadResult, PdfViewResult, MobilePdfOptions } from '../../../mobile/mobile-pdf-handler';
import { useToast } from '@/hooks/use-toast';

export interface UseMobilePdfReturn {
  // Upload functions
  uploadPdf: (options?: MobilePdfOptions) => Promise<PdfUploadResult>;
  isUploading: boolean;
  
  // View functions  
  viewPdf: (pdfUrl: string, fileName?: string) => Promise<void>;
  isViewing: boolean;
  
  // Cache management
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  
  // State
  lastUploadResult: PdfUploadResult | null;
  lastViewResult: PdfViewResult | null;
}

export const useMobilePdf = (): UseMobilePdfReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [lastUploadResult, setLastUploadResult] = useState<PdfUploadResult | null>(null);
  const [lastViewResult, setLastViewResult] = useState<PdfViewResult | null>(null);
  const { toast } = useToast();

  // 📤 Upload PDF with mobile optimization
  const uploadPdf = useCallback(async (options?: MobilePdfOptions): Promise<PdfUploadResult> => {
    setIsUploading(true);
    
    try {
      const result = await mobilePdfHandler.uploadPdf(options);
      setLastUploadResult(result);
      
      if (result.success) {
        toast({
          title: "PDF uploaded successfully",
          description: `File: ${result.fileName} (${Math.round((result.fileSize || 0) / 1024)}KB)`,
        });
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
      
      return result;
      
    } catch (error) {
      const errorResult: PdfUploadResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
      
      setLastUploadResult(errorResult);
      
      toast({
        title: "Upload error",
        description: errorResult.error,
        variant: "destructive",
      });
      
      return errorResult;
      
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  // 👁️ View PDF with mobile optimization
  const viewPdf = useCallback(async (pdfUrl: string, fileName: string = 'document.pdf'): Promise<void> => {
    setIsViewing(true);
    
    try {
      const result = await mobilePdfHandler.viewPdf(pdfUrl, fileName);
      setLastViewResult(result);
      
      if (result.success) {
        toast({
          title: "PDF opened",
          description: "Document is now available for viewing",
        });
      } else {
        toast({
          title: "Failed to open PDF",
          description: result.error || "Could not open the document",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      const errorResult: PdfViewResult = {
        success: false,
        error: error instanceof Error ? error.message : 'View failed'
      };
      
      setLastViewResult(errorResult);
      
      toast({
        title: "PDF viewing error",
        description: errorResult.error,
        variant: "destructive",
      });
      
    } finally {
      setIsViewing(false);
    }
  }, [toast]);

  // 🧹 Clear PDF cache
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await mobilePdfHandler.clearCache();
      
      toast({
        title: "Cache cleared",
        description: "All cached PDF files have been removed",
      });
      
    } catch (error) {
      toast({
        title: "Cache clearing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast]);

  // 📊 Get cache size
  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      return await mobilePdfHandler.getCacheSize();
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }, []);

  return {
    // Upload functions
    uploadPdf,
    isUploading,
    
    // View functions
    viewPdf,
    isViewing,
    
    // Cache management
    clearCache,
    getCacheSize,
    
    // State
    lastUploadResult,
    lastViewResult,
  };
};