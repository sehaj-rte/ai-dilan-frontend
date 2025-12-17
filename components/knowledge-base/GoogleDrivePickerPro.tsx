"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HardDrive, Loader2, CheckCircle, AlertCircle, FileText, Users } from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { API_URL } from "@/lib/config";

interface GoogleDrivePickerProProps {
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
    onGoogleApiLoad: () => void;
  }
}

const GoogleDrivePickerPro: React.FC<GoogleDrivePickerProProps> = ({
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
  const [initializationStep, setInitializationStep] = useState<string>("Loading...");

  // Google API configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  const initializeGoogleAPI = useCallback(async () => {
    try {
      // Check credentials
      if (!CLIENT_ID || !API_KEY || CLIENT_ID.includes('your-') || API_KEY.includes('your-')) {
        setErrorMessage('Google Drive API credentials not configured. Please check your environment variables.');
        return;
      }

      setInitializationStep("Loading Google API scripts...");

      // Load Google API script
      if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js');
      }

      setInitializationStep("Initializing Google client...");

      // Wait for gapi to be available
      let attempts = 0;
      while (!window.gapi && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.gapi) {
        throw new Error('Google API failed to load');
      }

      // Load required modules
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject
        });
      });

      setInitializationStep("Configuring authentication...");

      // Initialize the client
      await window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [DISCOVERY_DOC],
        scope: SCOPES
      });

      setInitializationStep("Loading Google Picker...");

      // Load Picker API
      await loadScript('https://apis.google.com/js/api.js?onload=onGoogleApiLoad');

      // Set up the callback for when picker loads
      window.onGoogleApiLoad = () => {
        // Picker should be available now
        let pickerAttempts = 0;
        const checkPicker = () => {
          if (window.google?.picker) {
            setApiReady(true);
            setInitializationStep("");
            setErrorMessage("");
            console.log('Google Drive Picker initialized successfully');
          } else if (pickerAttempts < 50) {
            pickerAttempts++;
            setTimeout(checkPicker, 100);
          } else {
            setErrorMessage('Google Picker failed to load after multiple attempts');
          }
        };
        checkPicker();
      };

      // If picker is already available, call the callback
      if (window.google?.picker) {
        window.onGoogleApiLoad();
      }

    } catch (error: any) {
      console.error('Google API initialization error:', error);
      setErrorMessage(`Failed to initialize Google Drive: ${error.message}`);
      setInitializationStep("");
    }
  }, [CLIENT_ID, API_KEY]);

  useEffect(() => {
    initializeGoogleAPI();
  }, [initializeGoogleAPI]);

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  const handleGoogleDriveAuth = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!apiReady || !window.gapi || !window.google?.picker) {
        setErrorMessage('Google Drive API not ready. Please refresh the page and try again.');
        return;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance) {
        setErrorMessage('Google authentication not initialized');
        return;
      }

      // Check if user is signed in
      if (!authInstance.isSignedIn.get()) {
        try {
          await authInstance.signIn({
            prompt: 'select_account'
          });
        } catch (authError: any) {
          if (authError.error === 'popup_blocked_by_browser') {
            setErrorMessage('Popup blocked. Please allow popups for this site and try again.');
          } else if (authError.error === 'access_denied') {
            setErrorMessage('Access denied. Please grant permission to access Google Drive.');
          } else {
            setErrorMessage(`Authentication failed: ${authError.error || 'Unknown error'}`);
          }
          return;
        }
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
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = authInstance.currentUser.get();
      const authResponse = user.getAuthResponse();

      if (!authResponse.access_token) {
        setErrorMessage('No access token available. Please try signing in again.');
        return;
      }

      // Create picker with multiple file selection
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .addView(window.google.picker.ViewId.DOCS_VIDEOS)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(API_KEY)
        .setCallback(handlePickerResult)
        .setTitle('Select files from Google Drive')
        .build();

      picker.setVisible(true);
    } catch (error: any) {
      console.error('Picker error:', error);
      setErrorMessage(`Failed to open Google Drive picker: ${error.message}`);
    }
  };

  const handlePickerResult = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const files: GoogleDriveFile[] = data.docs.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.url,
        size: file.sizeBytes ? parseInt(file.sizeBytes) : undefined,
      }));

      setSelectedFiles(files);
      
      if (onFileSelected) {
        onFileSelected(files);
      }

      // Upload all files to backend
      await uploadFilesToBackend(files);
    } else if (data.action === window.google.picker.Action.CANCEL) {
      console.log('User cancelled picker');
    }
  };

  const uploadFilesToBackend = async (files: GoogleDriveFile[]) => {
    try {
      setUploadStatus('uploading');
      setErrorMessage("");

      let successCount = 0;
      let errorCount = 0;

      // Upload files one by one
      for (const file of files) {
        try {
          const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload-from-drive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_id: file.id,
              file_name: file.name,
              mime_type: file.mimeType,
              web_view_link: file.webViewLink,
              folder_id: selectedFolderId,
              agent_id: agentId,
            }),
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to upload ${file.name}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error uploading ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        setUploadStatus('success');
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setUploadStatus('error');
        setErrorMessage(`Failed to upload ${errorCount} file(s)`);
      }

      if (errorCount > 0 && successCount > 0) {
        setErrorMessage(`${successCount} file(s) uploaded successfully, ${errorCount} failed`);
      }

      // Reset after delay
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadStatus('idle');
        if (errorCount === 0) {
          setErrorMessage("");
        }
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Failed to upload files from Google Drive');
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
      {/* Google Drive Picker */}
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

          {/* Initialization Status */}
          {initializationStep && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                <p className="text-sm text-blue-700">{initializationStep}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
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
            onClick={handleGoogleDriveAuth}
            disabled={isLoading || uploadStatus === 'uploading' || !apiReady}
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
                Uploading {selectedFiles.length} file(s)...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Select from Google Drive
              </>
            )}
          </Button>

          {/* Features */}
          {apiReady && (
            <div className="mt-4 text-xs text-gray-500">
              ✓ Multiple file selection • ✓ All file types • ✓ Secure authentication
            </div>
          )}
        </div>
      </Card>

      {/* Selected Files Display */}
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

export default GoogleDrivePickerPro;