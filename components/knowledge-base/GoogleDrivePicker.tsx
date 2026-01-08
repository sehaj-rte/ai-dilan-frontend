"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HardDrive, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
  }
}

const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  onFileSelected,
  onUploadComplete,
  selectedFolderId,
  agentId,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Google API configuration - these should be in your environment variables
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "your-google-client-id";
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "your-google-api-key";
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = async () => {
    try {
      // Check if we have valid credentials
      if (CLIENT_ID === "your-google-client-id" || API_KEY === "your-google-api-key") {
        setErrorMessage('Google Drive API credentials not configured. Please set up NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY in your environment variables.');
        return;
      }

      // Load Google API script if not already loaded
      if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js');
      }

      // Wait for gapi to be available
      let attempts = 0;
      while (!window.gapi && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.gapi) {
        throw new Error('Google API failed to load');
      }

      // Load the required modules
      await new Promise((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject
        });
      });

      // Wait for client to be available
      attempts = 0;
      while (!window.gapi.client && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.gapi.client) {
        throw new Error('Google Client API failed to load');
      }

      // Initialize the client
      await window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [DISCOVERY_DOC],
        scope: SCOPES
      });

      // Load Picker API separately
      await loadScript('https://apis.google.com/js/api.js?onload=initPicker');

      // Wait for picker to be available
      attempts = 0;
      while (!window.google?.picker && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.google?.picker) {
        throw new Error('Google Picker API failed to load');
      }

      console.log('Google API initialized successfully');
      setErrorMessage(""); // Clear any previous errors
    } catch (error) {
      console.error('Error loading Google API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Failed to load Google Drive API: ${errorMessage}`);
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
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  const authenticateUser = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      // Check if Google API is loaded
      if (!window.gapi || !window.google?.picker) {
        setErrorMessage('Google API not loaded. Please refresh the page and try again.');
        return;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();

      if (!authInstance) {
        setErrorMessage('Google Auth not initialized. Please check your API credentials.');
        return;
      }

      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      openPicker();
    } catch (error) {
      console.error('Authentication failed:', error);
      const err = error as any; // Google API errors have custom structure
      if (err.error === 'popup_blocked_by_browser') {
        setErrorMessage('Popup blocked by browser. Please allow popups for this site and try again.');
      } else if (err.error === 'access_denied') {
        setErrorMessage('Access denied. Please grant permission to access your Google Drive.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Google authentication failed: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openPicker = () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = authInstance.currentUser.get();
      const authResponse = user.getAuthResponse();

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(API_KEY)
        .setCallback(handlePickerCallback)
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
      setErrorMessage('Failed to open Google Drive picker');
    }
  };

  const handlePickerCallback = async (data: any) => {
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

      // Automatically upload the file
      await uploadFileToBackend(fileMetadata);
    }
  };

  const uploadFileToBackend = async (fileMetadata: GoogleDriveFile) => {
    try {
      setUploadStatus('uploading');
      setErrorMessage("");

      // Send file metadata to backend
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

        // Reset after a delay
        setTimeout(() => {
          setSelectedFile(null);
          setUploadStatus('idle');
        }, 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Upload failed');
      }
    } catch (error) {
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

          <Button
            onClick={authenticateUser}
            disabled={isLoading || uploadStatus === 'uploading'}
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

export default GoogleDrivePicker;