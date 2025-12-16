"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HardDrive, Loader2, CheckCircle, AlertCircle, FileText, Users, ExternalLink } from "lucide-react";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import { API_URL } from "@/lib/config";

interface GoogleDrivePickerFixedProps {
  onFileSelected?: (fileMetadata: GoogleDriveFile[]) => void;
  onUploadComplete?: () => void;
  selectedFolderId: string;
  agentId?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  downloadUrl?: string;
  size?: number;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
    pickerApiLoaded: boolean;
  }
}

const GoogleDrivePickerFixed: React.FC<GoogleDrivePickerFixedProps> = ({
  onFileSelected,
  onUploadComplete,
  selectedFolderId,
  agentId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [apiReady, setApiReady] = useState(false);
  const [initStatus, setInitStatus] = useState<string>("Initializing...");
  const accessTokenRef = useRef<string>("");
  const pickerRef = useRef<any>(null);

  // Google API configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

  useEffect(() => {
    initializeGoogleDrive();
    
    // Add global CSS for picker
    const style = document.createElement('style');
    style.id = 'google-picker-styles';
    style.textContent = `
      .picker-dialog {
        z-index: 999999 !important;
        position: fixed !important;
      }
      .picker-dialog-bg {
        z-index: 999998 !important;
      }
      .picker {
        z-index: 1000000 !important;
      }
      .picker-frame {
        z-index: 1000001 !important;
        pointer-events: auto !important;
      }
      .picker-dialog-content {
        pointer-events: auto !important;
      }
    `;
    
    if (!document.getElementById('google-picker-styles')) {
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup
      const existingStyle = document.getElementById('google-picker-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const initializeGoogleDrive = async () => {
    try {
      if (!CLIENT_ID || !API_KEY) {
        throw new Error('Google API credentials not configured');
      }

      setInitStatus("Loading Google Identity Services...");

      // Load Google Identity Services
      await loadScript('https://accounts.google.com/gsi/client');
      
      setInitStatus("Loading Google APIs...");
      
      // Load Google API
      await loadScript('https://apis.google.com/js/api.js');
      
      // Wait for gapi
      await waitForCondition(() => window.gapi, 'GAPI');
      
      setInitStatus("Loading Picker API...");
      
      // Load Picker
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('picker', {
          callback: () => {
            window.pickerApiLoaded = true;
            resolve();
          },
          onerror: reject
        });
      });

      // Wait for all APIs
      await waitForCondition(() => window.google?.picker && window.google?.accounts, 'Google APIs');

      setApiReady(true);
      setInitStatus("");
      setErrorMessage("");
      console.log('✅ Google Drive API initialized successfully');

    } catch (error: any) {
      console.error('❌ Google Drive initialization failed:', error);
      setErrorMessage(error.message || 'Failed to initialize Google Drive');
      setInitStatus("");
    }
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  };

  const waitForCondition = (condition: () => boolean, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 100);
        } else {
          reject(new Error(`${name} failed to load after ${maxAttempts} attempts`));
        }
      };
      
      check();
    });
  };

  const handleSelectFiles = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!apiReady) {
        throw new Error('Google Drive API not ready');
      }

      // Use Google Identity Services for authentication
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.error) {
            setErrorMessage(`Authentication failed: ${response.error}`);
            setIsLoading(false);
            return;
          }
          
          accessTokenRef.current = response.access_token;
          setTimeout(() => openPicker(), 500); // Small delay to ensure token is set
        },
      });

      tokenClient.requestAccessToken();

    } catch (error: any) {
      console.error('Selection error:', error);
      setErrorMessage(error.message || 'Failed to authenticate with Google Drive');
      setIsLoading(false);
    }
  };

  const openPicker = () => {
    try {
      if (!accessTokenRef.current) {
        throw new Error('No access token available');
      }

      console.log('Opening Google Drive Picker...');

      // Create picker with enhanced settings
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .addView(window.google.picker.ViewId.DOCS_VIDEOS)
        .setOAuthToken(accessTokenRef.current)
        .setDeveloperKey(API_KEY)
        .setCallback(handlePickerCallback)
        .setTitle('Select files from Google Drive')
        .setSize(1051, 650);

      pickerRef.current = pickerBuilder.build();
      
      // Ensure picker is properly displayed
      setTimeout(() => {
        if (pickerRef.current) {
          pickerRef.current.setVisible(true);
          
          // Additional z-index fix
          setTimeout(() => {
            const pickerElements = document.querySelectorAll('.picker-dialog, .picker-dialog-bg, .picker');
            pickerElements.forEach((element, index) => {
              (element as HTMLElement).style.zIndex = `${999999 + index}`;
              (element as HTMLElement).style.pointerEvents = 'auto';
            });
          }, 200);
        }
      }, 100);

      setIsLoading(false);

    } catch (error: any) {
      console.error('Picker error:', error);
      setErrorMessage(`Failed to open Google Drive picker: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handlePickerCallback = async (data: any) => {
    console.log('Picker callback:', data);
    
    if (data.action === window.google.picker.Action.PICKED) {
      const files: GoogleDriveFile[] = data.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        webViewLink: doc.url,
        size: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
      }));

      console.log('Files selected:', files);
      setSelectedFiles(files);
      
      if (onFileSelected) {
        onFileSelected(files);
      }

      await uploadFiles(files);
    } else if (data.action === window.google.picker.Action.CANCEL) {
      console.log('User cancelled picker');
    }
  };

  const uploadFiles = async (files: GoogleDriveFile[]) => {
    try {
      setUploadStatus('uploading');
      setErrorMessage("");

      // Check if user is authenticated
      const token = localStorage.getItem('dilan_ai_token');
      if (!token) {
        setUploadStatus('error');
        setErrorMessage('Please log in to upload files');
        return;
      }

      // Get Google Drive access token for authenticated content extraction
      const googleAccessToken = accessTokenRef.current;
      if (!googleAccessToken) {
        console.warn('⚠️ No Google Drive access token available - will use fallback methods');
      } else {
        console.log(`🔑 Using Google Drive access token: ${googleAccessToken.substring(0, 20)}...`);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          console.log(`🔄 Uploading ${file.name} to backend with access token for content extraction...`);
          
          const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload-from-drive`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              file_id: file.id,
              file_name: file.name,
              mime_type: file.mimeType,
              web_view_link: file.webViewLink,
              folder_id: selectedFolderId,
              agent_id: agentId,
              access_token: googleAccessToken, // Pass Google Drive access token for authenticated content extraction
            }),
          });

          console.log(`📡 Upload response for ${file.name}:`, response.status);

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              successCount++;
              console.log(`✅ Successfully uploaded ${file.name} with real content extraction`);
            } else {
              errorCount++;
              errors.push(`${file.name}: ${result.error || 'Unknown error'}`);
              console.error(`❌ Backend error for ${file.name}:`, result.error);
            }
          } else {
            errorCount++;
            const errorText = await response.text();
            errors.push(`${file.name}: HTTP ${response.status}`);
            console.error(`❌ HTTP error ${response.status} for ${file.name}:`, errorText);
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`${file.name}: ${error.message || 'Network error'}`);
          console.error(`❌ Network error uploading ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        setUploadStatus('success');
        if (onUploadComplete) {
          onUploadComplete();
        }
        
        if (errorCount > 0) {
          setErrorMessage(`${successCount} files uploaded successfully, ${errorCount} failed`);
        }
      } else {
        setUploadStatus('error');
        setErrorMessage(`All uploads failed: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}`);
      }

      // Reset after delay
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadStatus('idle');
        if (errorCount === 0) setErrorMessage("");
      }, 3000);

    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(`Upload failed: ${error.message || 'Unknown error'}`);
      console.error('❌ Upload process failed:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="h-8 w-8 text-blue-600" />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Add from Google Drive
          </h3>
          
          <p className="text-gray-600 mb-4">
            Select multiple files directly from your Google Drive
          </p>

          {/* Status Messages */}
          {initStatus && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                <p className="text-sm text-blue-700">{initStatus}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <p className="text-sm text-green-700">
                  {selectedFiles.length > 1 
                    ? `${selectedFiles.length} files uploaded successfully!`
                    : 'File uploaded successfully!'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Main Button */}
          <Button
            onClick={handleSelectFiles}
            disabled={!apiReady || isLoading || uploadStatus === 'uploading'}
            className="bg-blue-600 hover:bg-blue-700 mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : uploadStatus === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading {selectedFiles.length} file(s)...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Select from Google Drive
              </>
            )}
          </Button>

          {/* Troubleshooting Help */}
          {apiReady && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>✓ Multiple selection • ✓ All file types • ✓ Secure authentication</div>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                💡 <strong>Tip:</strong> If picker opens but you can't click, try refreshing the page or using a different browser
              </div>
            </div>
          )}

          {/* Manual Fallback */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Having trouble with the picker?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://drive.google.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Google Drive Manually
            </Button>
          </div>
        </div>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                {uploadStatus === 'uploading' ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : uploadStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.mimeType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GoogleDrivePickerFixed;