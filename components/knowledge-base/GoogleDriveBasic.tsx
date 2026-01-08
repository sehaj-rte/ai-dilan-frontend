"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HardDrive, ExternalLink, Link, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { API_URL } from "@/lib/config";

interface GoogleDriveBasicProps {
  onUploadComplete?: () => void;
  selectedFolderId: string;
  agentId?: string;
}

const GoogleDriveBasic: React.FC<GoogleDriveBasicProps> = ({
  onUploadComplete,
  selectedFolderId,
  agentId,
}) => {
  const [driveUrl, setDriveUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");

  const extractFileIdFromUrl = (url: string): string | null => {
    // Handle different Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,  // /file/d/FILE_ID
      /id=([a-zA-Z0-9-_]+)/,          // ?id=FILE_ID
      /\/d\/([a-zA-Z0-9-_]+)/,        // /d/FILE_ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const handleUrlSubmit = async () => {
    if (!driveUrl.trim()) {
      setErrorMessage("Please enter a Google Drive URL");
      return;
    }

    if (!fileName.trim()) {
      setErrorMessage("Please enter a file name");
      return;
    }

    const fileId = extractFileIdFromUrl(driveUrl);
    if (!fileId) {
      setErrorMessage("Invalid Google Drive URL. Please make sure it's a valid Google Drive file link.");
      return;
    }

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
          file_id: fileId,
          file_name: fileName,
          mime_type: 'application/octet-stream', // Generic type since we don't know
          web_view_link: driveUrl,
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
        
        // Reset form after success
        setTimeout(() => {
          setDriveUrl("");
          setFileName("");
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

  return (
    <div className="space-y-4">
      {/* Google Drive Manual Upload */}
      <Card className="p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Add from Google Drive
          </h3>
          <p className="text-gray-600 mb-4">
            Share a Google Drive file link to add it to your knowledge base
          </p>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <h4 className="font-medium text-blue-900 mb-2">📋 How to get a Google Drive link:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Open your file in Google Drive</li>
              <li>2. Click "Share" button</li>
              <li>3. Change permissions to "Anyone with the link can view"</li>
              <li>4. Copy the link and paste it below</li>
            </ol>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Google Drive URL
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                File Name
              </label>
              <Input
                type="text"
                placeholder="Enter a name for this file"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <p className="text-sm text-green-700">File uploaded successfully!</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleUrlSubmit}
              disabled={uploadStatus === 'uploading' || !driveUrl.trim() || !fileName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Add from Google Drive
                </>
              )}
            </Button>
          </div>

          {/* Quick Access */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://drive.google.com', '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open Google Drive
            </Button>
          </div>
        </div>
      </Card>

      {/* Help Section */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-2">💡 Supported File Types</h4>
        <p className="text-sm text-gray-600 mb-2">
          You can add any file from Google Drive including:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Documents (PDF, DOCX, TXT)</li>
          <li>• Google Docs, Sheets, Slides</li>
          <li>• Images (JPG, PNG, GIF)</li>
          <li>• Audio files (MP3, WAV)</li>
          <li>• And many more...</li>
        </ul>
      </Card>
    </div>
  );
};

export default GoogleDriveBasic;