'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Bot, fetchTranscript, downloadTranscript } from '@/store/slices/meetingSlice';

// Helper to get bot ID - prioritize bot_id (Recall.ai ID) over id (database ID)
const getBotId = (bot: Bot): string => bot.bot_id || bot.id || 'unknown';

// Helper to format meeting URL for display
const formatMeetingUrl = (meeting_url: string | { meeting_id: string; platform: string }): string => {
  if (typeof meeting_url === 'string') {
    return meeting_url;
  }
  return `${meeting_url.platform}: ${meeting_url.meeting_id}`;
};

// Helper to get actual URL for link (construct URL from platform and meeting_id if needed)
const getMeetingLink = (meeting_url: string | { meeting_id: string; platform: string }): string => {
  if (typeof meeting_url === 'string') {
    return meeting_url;
  }
  // Construct URL based on platform
  switch (meeting_url.platform) {
    case 'google_meet':
      return `https://meet.google.com/${meeting_url.meeting_id}`;
    case 'zoom':
      return `https://zoom.us/j/${meeting_url.meeting_id}`;
    case 'teams':
      return `https://teams.microsoft.com/l/meetup-join/${meeting_url.meeting_id}`;
    default:
      return '#';
  }
};
import {
  X,
  Video,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface BotDetailsProps {
  onClose: () => void;
}

const BotDetails: React.FC<BotDetailsProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { selectedBot, transcript, isTranscriptLoading } = useAppSelector((state) => state.meeting);

  useEffect(() => {
    // Transcript is now stored directly in the bot object as an array
    // No need to fetch separately
  }, [selectedBot, dispatch]);

  if (!selectedBot) {
    return null;
  }

  const handleDownloadTranscript = () => {
    if (selectedBot) {
      dispatch(downloadTranscript(getBotId(selectedBot)));
    }
  };

  const handleRefreshTranscript = () => {
    if (selectedBot) {
      dispatch(fetchTranscript(getBotId(selectedBot)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-blue-600 bg-blue-100';
      case 'joining_call':
        return 'text-yellow-600 bg-yellow-100';
      case 'in_call':
        return 'text-green-600 bg-green-100';
      case 'done':
      case 'analysis_done':
        return 'text-green-600 bg-green-100';
      case 'fatal':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bot Details</h2>
                <p className="text-sm text-gray-500">ID: {selectedBot.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Status:</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedBot.status)}`}>
                  {selectedBot.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm text-gray-900">
                  {selectedBot.created_at ? (
                    format(new Date(selectedBot.created_at), 'PPpp')
                  ) : (
                    'Just now'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Meeting URL */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Meeting URL</h3>
            <div className="flex items-center space-x-2">
              <a
                href={getMeetingLink(selectedBot.meeting_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 truncate flex-1 flex items-center space-x-1"
              >
                <span className="truncate">{formatMeetingUrl(selectedBot.meeting_url)}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Status Changes History */}
          {selectedBot.status_changes && selectedBot.status_changes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity History</h3>
              <div className="space-y-2">
                {selectedBot.status_changes.map((change, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm">
                    <div className="flex-shrink-0 mt-1">
                      {change.code === 'done' || change.code === 'analysis.done' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : change.code === 'fatal' ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">{change.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {change.created_at ? (
                          format(new Date(change.created_at), 'PPpp')
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recording Info */}
          {selectedBot.recording && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recording</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recording ID:</span>
                  <span className="text-sm text-gray-900 font-mono">{selectedBot.recording.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm text-gray-900">{selectedBot.recording.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Section */}
          {selectedBot.transcript && Array.isArray(selectedBot.transcript) && selectedBot.transcript.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Transcript</span>
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    AVAILABLE
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Participants:</span>
                  <span className="text-sm text-gray-900">{selectedBot.transcript.length}</span>
                </div>
              </div>

              {/* Transcript Content */}
              {isTranscriptLoading && (
                <div className="mt-4 flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              )}

              {transcript && !isTranscriptLoading && (
                <div className="mt-4 max-h-96 overflow-y-auto bg-white rounded-lg border border-gray-200 p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(transcript, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotDetails;
