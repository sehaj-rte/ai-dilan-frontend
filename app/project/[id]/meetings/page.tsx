'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectBot, fetchUserBots, fetchBotDetails, clearBots } from '@/store/slices/meetingSlice';
import { useBotPolling } from '@/hooks/useBotPolling';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CreateBotForm from '@/components/meetings/CreateBotForm';
import BotCard from '@/components/meetings/BotCard';
import BotDetails from '@/components/meetings/BotDetails';
import { Video, Inbox, RefreshCw } from 'lucide-react';
import { Bot } from '@/store/slices/meetingSlice';

// Helper to get bot ID - prioritize bot_id (Recall.ai ID) over id (database ID)
const getBotId = (bot: Bot): string => bot.bot_id || bot.id || 'unknown';

export default function MeetingsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const dispatch = useAppDispatch();
  const { bots, selectedBot } = useAppSelector((state) => state.meeting);
  const { user } = useAppSelector((state) => state.auth);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch user's bots from database on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserBots({ 
        userId: user.id, 
        agentId: projectId 
      }));
    }
  }, [user?.id, projectId, dispatch]);

  // Auto-poll bot status every 5 seconds
  const { refreshAll } = useBotPolling(bots, autoRefresh, 5000);

  const handleSelectBot = (bot: any) => {
    dispatch(selectBot(bot));
    setShowDetails(true);
  };

  const handleRefreshBot = async (botId: string) => {
    await dispatch(fetchBotDetails(botId));
  };

  const handleRefreshAllBots = async () => {
    if (user?.id) {
      // Clear existing bots first
      dispatch(clearBots());
      // Then fetch fresh data
      await dispatch(fetchUserBots({ 
        userId: user.id, 
        agentId: projectId 
      }));
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    dispatch(selectBot(null));
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Video className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
              <p className="text-gray-600">Record and transcribe your meetings with Recall AI</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Create Bot Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <CreateBotForm userId={user?.id} agentId={projectId} />
            </div>
          </div>

          {/* Right Column - Bots List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Meeting Bots</h2>
                <div className="flex items-center space-x-3">
                  {/* Auto-refresh toggle */}
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                      autoRefresh
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
                  </button>
                  
                  {/* Manual refresh button */}
                  <button
                    onClick={refreshAll}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh all bots"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {bots.length} {bots.length === 1 ? 'bot' : 'bots'}
                  </span>
                </div>
              </div>

              {bots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                    <Inbox className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No meeting bots yet</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first meeting bot to start recording and transcribing meetings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bots.filter(bot => bot && getBotId(bot)).map((bot) => (
                    <BotCard
                      key={getBotId(bot)}
                      bot={bot}
                      onSelect={handleSelectBot}
                      onRefresh={handleRefreshBot}
                      onRefreshAll={handleRefreshAllBots}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bot Details Side Panel */}
      {showDetails && selectedBot && (
        <BotDetails onClose={handleCloseDetails} />
      )}
      </div>
    </DashboardLayout>
  );
}
