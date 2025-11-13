'use client';

import React from 'react';
import { X, User, Clock, FileText } from 'lucide-react';

interface TranscriptWord {
  text: string;
  start_timestamp: {
    relative: number;
    absolute: string;
  };
  end_timestamp: {
    relative: number;
    absolute: string;
  };
}

interface TranscriptParticipant {
  id: number;
  name: string;
  is_host: boolean;
  platform: string;
  email?: string;
}

interface TranscriptSegment {
  participant: TranscriptParticipant;
  words: TranscriptWord[];
}

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptSegment[];
  botId: string;
}

const TranscriptModal: React.FC<TranscriptModalProps> = ({ isOpen, onClose, transcript, botId }) => {
  if (!isOpen) return null;

  // Format seconds to MM:SS
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Combine words into sentences for better readability
  const getFullText = (words: TranscriptWord[]): string => {
    return words.map(w => w.text).join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true"></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Meeting Transcript</h3>
                <p className="text-sm text-gray-600 mt-1">Bot ID: {botId.slice(0, 8)}...</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            {!transcript || transcript.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No transcript available</p>
                <p className="text-gray-400 text-sm mt-2">
                  The meeting was too short or no speech was detected
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {transcript.map((segment, idx) => {
                  const startTime = segment.words[0]?.start_timestamp?.relative || 0;
                  const fullText = getFullText(segment.words);

                  return (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      {/* Participant info */}
                      <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${segment.participant.is_host ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <User className={`h-5 w-5 ${segment.participant.is_host ? 'text-blue-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">
                                {segment.participant.name || 'Unknown Participant'}
                              </h4>
                              {segment.participant.is_host && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                  Host
                                </span>
                              )}
                            </div>
                            {segment.participant.email && (
                              <p className="text-xs text-gray-500 mt-0.5">{segment.participant.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-mono">{formatTimestamp(startTime)}</span>
                        </div>
                      </div>

                      {/* Transcript text */}
                      <div className="text-gray-800 leading-relaxed">
                        <p className="text-base">{fullText}</p>
                      </div>

                      {/* Word timestamps (collapsed for cleaner view) */}
                      {segment.words.length > 1 && (
                        <details className="mt-3">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View word-by-word timestamps ({segment.words.length} words)
                          </summary>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {segment.words.map((word, widx) => (
                              <span
                                key={widx}
                                className="inline-flex items-center px-2 py-1 bg-gray-50 rounded text-xs"
                                title={`${formatTimestamp(word.start_timestamp.relative)} - ${formatTimestamp(word.end_timestamp.relative)}`}
                              >
                                <span className="text-gray-700">{word.text}</span>
                                <span className="text-gray-400 ml-1.5 font-mono text-[10px]">
                                  {formatTimestamp(word.start_timestamp.relative)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptModal;
