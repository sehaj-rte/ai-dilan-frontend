"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HardDrive, Loader2, CheckCircle, AlertCircle, FileText, Users } from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { API_URL } from "@/lib/config";

interface GoogleDrivePickerRobustProps {
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
    gapi: any;
    google: any;
    gapiLoaded: boolean;
    pickerLoaded: boolean;
  }
}

const GoogleDrivePickerRobust: React.FC<GoogleDrivePickerRobustProps> = ({
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
  const initAttempted = useRef(false);

  // Google API configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

  useEffect(() => {
    if (!initAttempted.current) {
      initAttempted.current = true;
      initializeGoogleDrive();
    }
  }, []);

  const initializeGoogleDrive = async () => {
    try {
      // Validate credentials
      if (!CLIENT_ID || !API_KEY) {
        throw new Error('Google API credentials not configured');
      }

      setInitStatus("Loading Google APIs...");

      // Load GAPI script
      await loadGoogleScript('https://apis.google.com/js/api.js');
      
      // Wait for gapi to be available
      await waitForGapi();
      
      setInitStatus("Initializing client...");

      // Load client and auth2
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: () => resolve(),
          onerror: () => reject(new Error('Failed to load client:auth2'))
        });
      });

      // Initialize the client
      await window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      setInitStatus("Loading Picker API...");

      // Load Picker API
      await loadGoogleScript('https://apis.google.com/js/api.js?onload=initPicker');
      
      // Wait for picker to be available
      await waitForPicker();

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

  const loadGoogleScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src*="${src.split('?')[0]}"]`)) {
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

  const waitForGapi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const check = () => {
        if (window.gapi) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 100);
        } else {
          reject(new Error('GAPI failed to load'));
        }
      };
      
      check();
    });
  };

  const waitForPicker = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;
      
      const check = () => {
        if (window.google?.picker) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 100);
        } else {
          reject(new Error('Google Picker failed to load'));
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

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      // Check if signed in
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      // Get access token
      const user = authInstance.currentUser.get();
      const authResponse = user.getAuthResponse();

      if (!authResponse.access_token) {
        throw new Error('No access token available');
      }

      // Create and show picker
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .addView(window.google.picker.ViewId.DOCS_VIDEOS)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(API_KEY)
        .setCallback(handlePickerCallback)
        .setTitle('Select files from Google Drive')
        .build();

      picker.setVisible(true);

    } catch (error: any) {
      console.error('Selection error:', error);
      setErrorMessage(error.message || 'Failed to open Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickerCallback = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const files: GoogleDriveFile[] = data.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        webViewLink: doc.url,
        size: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
      }));

      setSelectedFiles(files);
      
      if (onFileSelected) {
        onFileSelected(files);
      }

      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: GoogleDriveFile[]) => {
    try {
      setUploadStatus('uploading');
      setErrorMessage("");

      // Get current access token for authenticated content extraction
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = authInstance.currentUser.get();
      const authResponse = user.getAuthResponse();
      const accessToken = authResponse.access_token;

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          console.log(`🔄 Uploading ${file.name} with access token for content extraction...`);
          
          const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload-from-drive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_id: file.id,
              file_name: file.name,
              mime_type: file.mimeType,
              web_view_link: file.webViewLink,
              folder_id: selectedFolderId,
              agent_id: agentId,
              access_token: accessToken, // Pass access token for authenticated content extraction
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            successCount++;
            console.log(`✅ Successfully uploaded ${file.name}`);
          } else {
            errorCount++;
            errors.push(`${file.name}: ${result.error || 'Unknown error'}`);
            console.error(`❌ Failed to upload ${file.name}:`, result.error);
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`${file.name}: ${error.message || 'Network error'}`);
          console.error(`❌ Upload error for ${file.name}:`, error);
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
                  Files uploaded successfully!
                </p>
              </div>
            </div>
          )}

          {/* Main Button */}
          <Button
            onClick={handleSelectFiles}
            disabled={!apiReady || isLoading || uploadStatus === 'uploading'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : uploadStatus === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Select from Google Drive
              </>
            )}
          </Button>

          {apiReady && (
            <p className="mt-2 text-xs text-gray-500">
              ✓ Multiple selection enabled
            </p>
          )}
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
                <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
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

export default GoogleDrivePickerRobust;