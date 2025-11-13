'use client';

import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, FolderPlus } from 'lucide-react';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';

interface Folder {
  id: string;
  name: string;
  file_count: number;
}

interface FolderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string | null, folderName: string) => void;
  projectId: string;
}

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  projectId
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch folders when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchFolders();
    }
  }, [isOpen, projectId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/knowledge-base/folders?agent_id=${projectId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      if (data.success) {
        setFolders(data.folders || []);
      } else {
        setError(data.error || 'Failed to load folders');
      }
    } catch (err: any) {
      console.error('Error fetching folders:', err);
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/knowledge-base/folders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newFolderName.trim(),
          agent_id: projectId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();
      if (data.success) {
        // Select the newly created folder
        onSelectFolder(data.folder.id, data.folder.name);
        onClose();
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (err: any) {
      console.error('Error creating folder:', err);
      setError(err.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectFolder = (folder: Folder) => {
    onSelectFolder(folder.id, folder.name);
    onClose();
  };

  const handleSelectMeetingFolder = () => {
    // Use null folderId to trigger auto-creation of "Meeting" folder
    onSelectFolder(null, 'Meeting');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Select Folder for Meeting Transcript
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-96">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Default Meeting Folder Option */}
              <button
                onClick={handleSelectMeetingFolder}
                className="w-full flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left"
              >
                <Folder className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium">Meeting (Default)</div>
                  <div className="text-sm text-purple-600">
                    Auto-create if doesn't exist
                  </div>
                </div>
              </button>

              {/* Existing Folders */}
              {folders.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-700 mt-4 mb-2">
                    Existing Folders
                  </div>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder)}
                      className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Folder className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{folder.name}</div>
                        <div className="text-sm text-gray-500">
                          {folder.file_count} file{folder.file_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Create New Folder */}
              <div className="border-t border-gray-200 pt-3 mt-4">
                {!showCreateNew ? (
                  <button
                    onClick={() => setShowCreateNew(true)}
                    className="w-full flex items-center space-x-3 p-3 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <Plus className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700 font-medium">Create New Folder</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Folder Name
                      </label>
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateFolder();
                          }
                        }}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || creating}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {creating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <FolderPlus className="h-4 w-4" />
                        )}
                        <span>{creating ? 'Creating...' : 'Create'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateNew(false);
                          setNewFolderName('');
                          setError(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderSelectionModal;
