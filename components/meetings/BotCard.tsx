'use client';

import React, { useState } from 'react';
import { Bot } from '@/store/slices/meetingSlice';
import TranscriptModal from './TranscriptModal';
import FolderDropdown from './FolderDropdown';

// Helper to get bot ID - prioritize bot_id (Recall.ai ID) over id (database ID)
const getBotId = (bot: Bot): string => bot.bot_id || bot.id || 'unknown';

// Helper to format meeting URL
const formatMeetingUrl = (meeting_url: string | { meeting_id: string; platform: string }): string => {
  if (typeof meeting_url === 'string') {
    return meeting_url;
  }
  // If it's an object, construct a readable string
  return `${meeting_url.platform}: ${meeting_url.meeting_id}`;
};
import {
  Video,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  ExternalLink,
  BookPlus,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

interface BotCardProps {
  bot: Bot;
  onSelect: (bot: Bot) => void;
  onRefresh: (botId: string) => void;
  onRefreshAll: () => void;
}

const BotCard: React.FC<BotCardProps> = ({ bot, onSelect, onRefresh, onRefreshAll }) => {
  const params = useParams();
  const projectId = params.id as string;
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isAddingToKB, setIsAddingToKB] = useState(false);
  const [kbSuccess, setKbSuccess] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('Meeting');
  const [hasBeenAdded, setHasBeenAdded] = useState(false);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'joining_call':
        return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'in_call':
        return <Video className="h-5 w-5 text-green-600" />;
      case 'done':
      case 'analysis_done':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fatal':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'joining_call':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_call':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'done':
      case 'analysis_done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'fatal':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'joining_call':
        return 'Joining...';
      case 'in_call':
        return 'In Call';
      case 'done':
        return 'Completed';
      case 'analysis_done':
        return 'Analysis Done';
      case 'fatal':
        return 'Failed';
      default:
        return status;
    }
  };

  const handleFolderSelection = (folderId: string | null, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  const handleAddToKnowledgeBase = async () => {
    try {
      setIsAddingToKB(true);
      setKbError(null);
      setKbSuccess(false);

      // Use the enhanced API with folder support
      const result = await knowledgeBaseApi.processMeetings(
        [getBotId(bot)], // Meeting ID (bot_id)
        projectId,       // Agent ID
        selectedFolderId || undefined, // Folder ID (if selected)
        selectedFolderId ? undefined : selectedFolderName // Auto-folder name (if using default)
      );

      if (result.success) {
        setKbSuccess(true);
        setHasBeenAdded(true);
        
        // Refresh all bots to get the latest data
        onRefreshAll();
        
        // Also refresh after a short delay to ensure backend has processed
        setTimeout(() => {
          onRefreshAll();
        }, 1000);
        
        // Reset success state after showing it
        setTimeout(() => setKbSuccess(false), 3000);
      } else {
        setKbError(result.error || 'Failed to add to knowledge base');
        setTimeout(() => setKbError(null), 5000);
      }
    } catch (error: any) {
      console.error('Error adding to knowledge base:', error);
      setKbError(error.message || 'Failed to add to knowledge base');
      setTimeout(() => setKbError(null), 5000);
    } finally {
      setIsAddingToKB(false);
    }
  };

  const hasTranscript = bot.transcript && bot.transcript.length > 0;
  const isActive = bot.status === 'in_call' || bot.status === 'joining_call' || 
                   bot.status === 'in_call_recording' || bot.status === 'in_waiting_room';
  const isDone = bot.status === 'done';
  
  // Prioritize database URLs (permanent) over recordings array (temporary signed URLs)
  const videoUrl = bot.video_url || 
    (bot.recordings && bot.recordings.length > 0 ? bot.recordings[0]?.media_shortcuts?.video_mixed?.data?.download_url : null);
  const transcriptUrl = bot.transcript_url || 
    (bot.recordings && bot.recordings.length > 0 ? bot.recordings[0]?.media_shortcuts?.transcript?.data?.download_url : null);
  const hasDownloads = !!(videoUrl || transcriptUrl);

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="flex items-start space-x-3 flex-1 cursor-pointer"
          onClick={() => onSelect(bot)}
        >
          <div className="p-2 bg-gray-100 rounded-lg">
            {getStatusIcon(bot.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                Bot {getBotId(bot).slice(0, 8)}
              </h3>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                  bot.status
                )}`}
              >
                {getStatusText(bot.status)}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {formatMeetingUrl(bot.meeting_url)}
            </p>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh(getBotId(bot));
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Transcript Status */}
      {hasTranscript && (
        <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
          <FileText className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Transcript Available</span>
        </div>
      )}

      {/* Status Changes - Show last 3 for better context */}
      {bot.status_changes && bot.status_changes.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Status History</h4>
          <div className="space-y-1.5">
            {bot.status_changes.slice(-3).reverse().map((change, idx) => (
              <div key={`${change.code}-${idx}`} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    change.code === 'in_call' ? 'bg-green-100 text-green-700' :
                    change.code === 'joining_call' ? 'bg-yellow-100 text-yellow-700' :
                    change.code === 'ready' ? 'bg-blue-100 text-blue-700' :
                    change.code === 'done' ? 'bg-gray-100 text-gray-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {change.code.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600 truncate">{change.message}</span>
                </div>
                {change.created_at && (
                  <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                    {new Date(change.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {kbSuccess && (
        <div className="mb-3 flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Added to Knowledge Base successfully!</span>
        </div>
      )}
      {kbError && (
        <div className="mb-3 flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{kbError}</span>
        </div>
      )}

      {/* Action Buttons */}
      {isDone && (videoUrl || hasTranscript) && (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Video className="h-4 w-4" />
                <span>Download Video</span>
              </a>
            )}
            {hasTranscript && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTranscriptModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                <span>Transcript</span>
              </button>
            )}
          </div>
          {hasTranscript && (
            <div className="space-y-2">
              
              {bot.is_processed ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Already in Knowledge Base</span>
                </div>
              ) : (
                <>
                  {/* Folder Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Select Folder:</label>
                    <FolderDropdown
                      onSelectFolder={handleFolderSelection}
                      projectId={projectId}
                      disabled={isAddingToKB || kbSuccess}
                    />
                  </div>
                  
                  {/* Add Button */}
                  <button
                    onClick={handleAddToKnowledgeBase}
                    disabled={isAddingToKB || kbSuccess}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isAddingToKB ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adding to Knowledge Base...</span>
                      </>
                    ) : kbSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Added Successfully</span>
                      </>
                    ) : (
                      <>
                        <BookPlus className="h-4 w-4" />
                        <span>Add to Knowledge Base</span>
                      </>
                    )}
                  </button>
                </>
              )}
              
              {kbError && (
                <div className="text-xs text-red-600 mt-1">
                  {kbError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        transcript={bot.transcript || []}
        botId={getBotId(bot)}
      />


      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {bot.created_at ? (
            formatDistanceToNow(new Date(bot.created_at), { addSuffix: true })
          ) : (
            'Just now'
          )}
        </span>
        
        {isActive && (
          <div className="flex items-center space-x-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotCard;
