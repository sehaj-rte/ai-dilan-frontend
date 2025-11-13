'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Folder, Plus, FolderPlus, Check } from 'lucide-react';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';

interface Folder {
  id: string;
  name: string;
  file_count: number;
}

interface FolderDropdownProps {
  onSelectFolder: (folderId: string | null, folderName: string) => void;
  projectId: string;
  disabled?: boolean;
}

const FolderDropdown: React.FC<FolderDropdownProps> = ({
  onSelectFolder,
  projectId,
  disabled = false
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('Meeting (Default)');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateNew(false);
        setNewFolderName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch folders when dropdown opens
  useEffect(() => {
    if (isOpen && projectId && folders.length === 0) {
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
        // Add new folder to list
        setFolders(prev => [...prev, data.folder]);
        // Select the newly created folder
        setSelectedFolder(data.folder.name);
        onSelectFolder(data.folder.id, data.folder.name);
        setIsOpen(false);
        setShowCreateNew(false);
        setNewFolderName('');
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
    setSelectedFolder(folder.name);
    onSelectFolder(folder.id, folder.name);
    setIsOpen(false);
  };

  const handleSelectMeetingFolder = () => {
    setSelectedFolder('Meeting (Default)');
    onSelectFolder(null, 'Meeting');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Folder className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 truncate">
            {selectedFolder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="py-1">
              {/* Default Meeting Folder Option */}
              <button
                onClick={handleSelectMeetingFolder}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Folder className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium text-purple-700">Meeting (Default)</div>
                    <div className="text-xs text-purple-600">Auto-create if doesn't exist</div>
                  </div>
                </div>
                {selectedFolder === 'Meeting (Default)' && (
                  <Check className="h-4 w-4 text-purple-600" />
                )}
              </button>

              {/* Existing Folders */}
              {folders.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-t border-gray-100">
                    Existing Folders
                  </div>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{folder.name}</div>
                          <div className="text-xs text-gray-500">
                            {folder.file_count} file{folder.file_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      {selectedFolder === folder.name && (
                        <Check className="h-4 w-4 text-purple-600" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Create New Folder */}
              <div className="border-t border-gray-100 mt-1">
                {!showCreateNew ? (
                  <button
                    onClick={() => setShowCreateNew(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Create New Folder</span>
                  </button>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFolder();
                        }
                      }}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || creating}
                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {creating ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <FolderPlus className="h-3 w-3" />
                        )}
                        <span>{creating ? 'Creating...' : 'Create'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateNew(false);
                          setNewFolderName('');
                          setError(null);
                        }}
                        className="px-2 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
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
      )}
    </div>
  );
};

export default FolderDropdown;
