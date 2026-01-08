"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HardDrive, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { API_URL } from "@/lib/config";

interface GoogleDrivePickerProps {
  onFileSelected?: (fileMetadata: GoogleDriveFile) => void;
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
    initGoogleDrive: () => void;
  }
}

const GoogleDrivePickerSimple: React.FC<GoogleDrivePickerProps> = ({
  onFileSelected,
  onUploadComplete,
  selectedFolderId,
  agentId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [apiReady, setApiReady] = useState(false);

  // Google API configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "your-google-client-id";
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "your-google-api-key";

  useEffect(() => {
    initializeGoogleAPI();
  }, []);

  const initializeGoogleAPI = () => {
    // Check if we have valid credentials
    if (CLIENT_ID === "your-google-client-id" || API_KEY === "your-google-api-key") {
      setErrorMessage('Google Drive API credentials not configured. Please check your environment variables.');
      return;
    }

    // Set up global initialization function
    window.initGoogleDrive = () => {
      if (window.gapi) {
        // First load the client module
        window.gapi.load('client', {
          callback: () => {
            // Then initialize the client
            window.gapi.client.init({
              apiKey: API_KEY,
              clientId: CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/drive.readonly'
            }).then(() => {
              // After client is initialized, load auth2 and picker
              window.gapi.load('auth2:picker', {
                callback: () => {
                  setApiReady(true);
                  setErrorMessage("");
                  console.log('Google Drive API initialized successfully');
                },
                onerror: () => {
                  setErrorMessage('Failed to load auth2 and picker modules');
                }
              });
            }).catch((error: any) => {
              console.error('Failed to initialize Google API:', error);
              setErrorMessage(`Failed to initialize Google API: ${error.message}`);
            });
          },
          onerror: () => {
            setErrorMessage('Failed to load Google client module');
          }
        });
      }
    };

    // Load Google API scripts
    if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js?onload=initGoogleDrive';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setErrorMessage('Failed to load Google API script');
      };
      document.head.appendChild(script);
    } else if (window.gapi) {
      window.initGoogleDrive();
    }
  };

  const handleGoogleDriveAuth = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!apiReady || !window.gapi) {
        setErrorMessage('Google API not ready. Please refresh the page and try again.');
        return;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance) {
        setErrorMessage('Google Auth not initialized');
        return;
      }

      // Sign in if not already signed in
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      // Open the picker
      openGooglePicker();

    } catch (error: any) {
      console.error('Authentication error:', error);
      setErrorMessage(`Authentication failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openGooglePicker = () => {
    try {
      if (!window.google?.picker) {
        setErrorMessage('Google Picker not available. Please refresh the page.');
        return;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = authInstance.currentUser.get();
      const authResponse = user.getAuthResponse();

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(API_KEY)
        .setCallback(handlePickerResult)
        .build();

      picker.setVisible(true);
    } catch (error: any) {
      console.error('Picker error:', error);
      setErrorMessage(`Failed to open picker: ${error.message}`);
    }
  };

  const handlePickerResult = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const file = data.docs[0];
      const fileMetadata: GoogleDriveFile = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.url,
        size: file.sizeBytes ? parseInt(file.sizeBytes) : undefined,
      };

      setSelectedFile(fileMetadata);
      
      if (onFileSelected) {
        onFileSelected(fileMetadata);
      }

      // Upload to backend
      await uploadToBackend(fileMetadata);
    }
  };

  const uploadToBackend = async (fileMetadata: GoogleDriveFile) => {
    try {
      setUploadStatus('uploading');
      setErrorMessage("");

      const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload-from-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileMetadata.id,
          file_name: fileMetadata.name,
          mime_type: fileMetadata.mimeType,
          web_view_link: fileMetadata.webViewLink,
          folder_id: selectedFolderId,
          agent_id: agentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        if (onUploadComplete) {
          onUploadComplete();
        }
        
        setTimeout(() => {
          setSelectedFile(null);
          setUploadStatus('idle');
        }, 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Failed to upload file from Google Drive');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Google Drive Button */}
      <Card className="p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Add from Google Drive
          </h3>
          <p className="text-gray-600 mb-4">
            Select files directly from your Google Drive
          </p>
          
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {!apiReady && !errorMessage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                <p className="text-sm text-blue-700">Loading Google Drive API...</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleGoogleDriveAuth}
            disabled={isLoading || uploadStatus === 'uploading' || !apiReady}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Select from Google Drive
              </>
            )}
          </Button>

          {/* Manual fallback */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Having trouble? You can also share files manually:
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://drive.google.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Google Drive
            </Button>
          </div>
        </div>
      </Card>

      {/* Selected File Display */}
      {selectedFile && (
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            {uploadStatus === 'uploading' ? (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
            ) : uploadStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            ) : (
              <HardDrive className="h-5 w-5 text-blue-500 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {uploadStatus === 'uploading' 
                  ? 'Uploading from Google Drive...'
                  : uploadStatus === 'success'
                  ? 'Successfully uploaded!'
                  : uploadStatus === 'error'
                  ? 'Upload failed'
                  : `${formatFileSize(selectedFile.size)} • ${selectedFile.mimeType}`
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GoogleDrivePickerSimple;