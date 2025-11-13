'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createBot } from '@/store/slices/meetingSlice';
import { Video, Loader2, AlertCircle } from 'lucide-react';

interface CreateBotFormProps {
  userId?: string;
  agentId?: string;
}

const CreateBotForm: React.FC<CreateBotFormProps> = ({ userId, agentId }) => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dispatch = useAppDispatch();

  const validateUrl = (url: string): boolean => {
    // Basic URL validation for meeting platforms
    const patterns = [
      /zoom\.us\/j\//,
      /meet\.google\.com/,
      /teams\.microsoft\.com/,
      /webex\.com/,
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingUrl(e.target.value);
    setValidationError(''); // Clear validation error when typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!meetingUrl.trim()) {
      setValidationError('Please enter a meeting URL');
      return;
    }

    if (!validateUrl(meetingUrl)) {
      setValidationError('Please enter a valid meeting URL (Zoom, Google Meet, Teams, or Webex)');
      return;
    }

    setIsCreating(true);
    try {
      const result = await dispatch(createBot({ meetingUrl, userId, agentId }));
      
      // Only clear input if bot was created successfully
      if (result.type === 'meeting/createBot/fulfilled') {
        setMeetingUrl('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Video className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Create Meeting Bot</h2>
          <p className="text-sm text-gray-500">Start recording a meeting with Recall AI</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="meetingUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Meeting URL
          </label>
          <input
            id="meetingUrl"
            type="text"
            value={meetingUrl}
            onChange={handleInputChange}
            placeholder="https://zoom.us/j/123456789 or meet.google.com/abc-defg-hij"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isCreating}
          />
          <p className="mt-2 text-xs text-gray-500">
            Supported platforms: Zoom, Google Meet, Microsoft Teams, Webex
          </p>
        </div>

        {validationError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating || !meetingUrl.trim()}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creating Bot...
            </>
          ) : (
            <>
              <Video className="h-5 w-5 mr-2" />
              Create Bot
            </>
          )}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Enter your meeting URL</li>
            <li>The bot will join and record the meeting</li>
            <li>Get transcript and recording when done</li>
          </ol>
        </div>
        
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">📊 Auto Status Tracking:</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Status updates automatically every 5 seconds</li>
            <li>• Watch your bot: Ready → Joining → In Call → Done</li>
            <li>• Click on any bot to see detailed status</li>
            <li>• Toggle auto-refresh ON/OFF anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateBotForm;
