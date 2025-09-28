// Mobile-Optimized PDF Handler for FocusLock
// Uses Capacitor Filesystem + Camera for better mobile experience

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface MobilePdfOptions {
  quality?: number; // 0-100 for compression
  allowCamera?: boolean; // Allow document scanning
  offlineCache?: boolean; // Cache for offline access
}

export interface PdfUploadResult {
  success: boolean;
  fileData?: string; // Base64 encoded
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface PdfViewResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

// Mobile PDF Handler Class
export class MobilePdfHandler {
  private static instance: MobilePdfHandler;
  public isNativePlatform: boolean;

  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform();
  }

  static getInstance(): MobilePdfHandler {
    if (!MobilePdfHandler.instance) {
      MobilePdfHandler.instance = new MobilePdfHandler();
    }
    return MobilePdfHandler.instance;
  }

  // 📷 MOBILE-OPTIMIZED PDF UPLOAD
  async uploadPdf(options: MobilePdfOptions = {}): Promise<PdfUploadResult> {
    const {
      quality = 80,
      allowCamera = true,
      offlineCache = true
    } = options;

    if (!this.isNativePlatform) {
      return this.fallbackWebUpload();
    }

    try {
      // Show mobile-native action sheet
      const source = await this.showUploadOptions(allowCamera);
      
      let fileData: string;
      let fileName: string;

      if (source === 'camera') {
        // 📸 Document scanning with camera
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          quality: quality,
          allowEditing: true, // Let user crop/adjust
          promptLabelHeader: 'Scan Document',
          promptLabelPhoto: 'Take Photo',
          promptLabelPicture: 'Choose from Gallery'
        });

        fileData = photo.base64String!;
        fileName = `scanned-doc-${Date.now()}.jpg`; // Will convert to PDF on backend
        
      } else {
        // 📁 File picker for existing PDFs
        const file = await this.openFilePicker();
        if (!file) {
          return { success: false, error: 'No file selected' };
        }
        
        fileData = file.data;
        fileName = file.name;
      }

      // 💾 Optional: Cache locally for offline access
      if (offlineCache) {
        await this.cacheFileLocally(fileName, fileData);
      }

      // 📊 Compress if needed
      const compressedData = await this.compressForMobile(fileData, quality);

      return {
        success: true,
        fileData: compressedData,
        fileName: fileName,
        fileSize: this.getBase64Size(compressedData)
      };

    } catch (error) {
      console.error('Mobile PDF upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  // 📱 MOBILE-OPTIMIZED PDF VIEWING  
  async viewPdf(pdfUrl: string, fileName: string = 'document.pdf'): Promise<PdfViewResult> {
    if (!this.isNativePlatform) {
      return this.fallbackWebView(pdfUrl);
    }

    try {
      // 1. Download PDF to local storage
      const localPath = await this.downloadAndCachePdf(pdfUrl, fileName);
      
      // 2. Open with native PDF viewer
      await this.openWithNativeViewer(localPath);
      
      return {
        success: true,
        localPath: localPath
      };

    } catch (error) {
      console.error('Mobile PDF viewing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'View failed'
      };
    }
  }

  // 💾 Download and cache PDF for offline access
  private async downloadAndCachePdf(pdfUrl: string, fileName: string): Promise<string> {
    try {
      // Check if already cached
      const cachePath = `pdfs/${fileName}`;
      
      try {
        const cached = await Filesystem.stat({
          path: cachePath,
          directory: Directory.Data
        });
        
        if (cached.size > 0) {
          console.log('📱 Using cached PDF:', cachePath);
          return cachePath;
        }
      } catch {
        // File doesn't exist, need to download
      }

      // Download PDF from server
      console.log('📱 Downloading PDF for mobile:', pdfUrl);
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const base64Data = await this.blobToBase64(blob);

      // Save to local storage
      await Filesystem.writeFile({
        path: cachePath,
        data: base64Data,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      console.log('✅ PDF cached for offline access:', cachePath);
      return cachePath;

    } catch (error) {
      console.error('❌ PDF download failed:', error);
      throw error;
    }
  }

  // 🎯 Open PDF with native mobile viewer
  private async openWithNativeViewer(localPath: string): Promise<void> {
    try {
      // Get the full URI for the local file
      const fileUri = await Filesystem.getUri({
        directory: Directory.Data,
        path: localPath
      });

      // Open with system PDF viewer (Android/iOS native)
      if (Capacitor.getPlatform() === 'android') {
        // Android: Use Intent to open PDF
        await this.openWithAndroidIntent(fileUri.uri);
      } else if (Capacitor.getPlatform() === 'ios') {
        // iOS: Use Document Interaction Controller
        await this.openWithiOSDocumentController(fileUri.uri);
      }

    } catch (error) {
      console.error('❌ Native PDF viewer failed:', error);
      throw error;
    }
  }

  // 📋 Show mobile-native upload options
  private async showUploadOptions(allowCamera: boolean): Promise<'camera' | 'file'> {
    // This would be implemented with native action sheet
    // For now, return 'file' as default (use allowCamera for future implementation)
    console.log('📱 Upload options available:', allowCamera ? 'camera + file' : 'file only');
    return 'file';
  }

  // 📁 Open mobile file picker
  private async openFilePicker(): Promise<{ data: string; name: string } | null> {
    // This would be implemented with native file picker
    // For now, return null
    return null;
  }

  // 🗜️ Compress file for mobile data savings
  private async compressForMobile(data: string, quality: number): Promise<string> {
    // Implement compression logic here based on quality parameter
    // For now, return original data (quality will be used in future implementation)
    console.log('📱 Compressing with quality:', quality);
    return data;
  }

  // 💾 Cache file locally for offline access
  private async cacheFileLocally(fileName: string, data: string): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: `uploads/${fileName}`,
        data: data,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      
      console.log('📱 File cached locally:', fileName);
    } catch (error) {
      console.error('❌ Local caching failed:', error);
    }
  }

  // 🌐 Fallback for web browsers
  private async fallbackWebUpload(): Promise<PdfUploadResult> {
    return {
      success: false,
      error: 'Use standard file input on web browsers'
    };
  }

  // 🌐 Fallback for web PDF viewing
  private async fallbackWebView(pdfUrl: string): Promise<PdfViewResult> {
    // Don't navigate same tab - this breaks the app flow!
    // Return false so caller uses existing popup logic
    console.log('🌐 Web browser detected - use standard popup approach instead for:', pdfUrl);
    
    return {
      success: false,
      error: 'Use standard popup approach for web browsers'
    };
  }

  // 🔧 Helper: Convert blob to base64
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 📊 Helper: Calculate base64 size
  private getBase64Size(base64: string): number {
    return Math.round((base64.length * 3) / 4);
  }

  // 🤖 Android-specific PDF opening
  private async openWithAndroidIntent(fileUri: string): Promise<void> {
    // Would implement Android Intent to open PDF
    console.log('📱 Opening PDF with Android Intent:', fileUri);
  }

  // 🍎 iOS-specific PDF opening  
  private async openWithiOSDocumentController(fileUri: string): Promise<void> {
    // Would implement iOS Document Interaction Controller
    console.log('📱 Opening PDF with iOS Document Controller:', fileUri);
  }

  // 🧹 Clear cached PDFs (for storage management)
  async clearCache(): Promise<void> {
    try {
      await Filesystem.rmdir({
        path: 'pdfs',
        directory: Directory.Data,
        recursive: true
      });
      
      console.log('🧹 PDF cache cleared');
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
    }
  }

  // 📊 Get cache size
  async getCacheSize(): Promise<number> {
    try {
      const files = await Filesystem.readdir({
        path: 'pdfs',
        directory: Directory.Data
      });
      
      let totalSize = 0;
      for (const file of files.files) {
        const stat = await Filesystem.stat({
          path: `pdfs/${file.name}`,
          directory: Directory.Data
        });
        totalSize += stat.size;
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const mobilePdfHandler = MobilePdfHandler.getInstance();