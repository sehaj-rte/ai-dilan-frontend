import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { fetchBotDetails } from '@/store/slices/meetingSlice';
import { Bot } from '@/store/slices/meetingSlice';

// Helper to get bot ID - prioritize bot_id (Recall.ai ID) over id (database ID)
const getBotId = (bot: Bot): string => bot.bot_id || bot.id || '';


/**
 * Custom hook to poll bot status at regular intervals
 * Automatically stops polling when bot is done or failed
 */
export const useBotPolling = (bots: Bot[], enabled: boolean = true, intervalMs: number = 5000) => {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const botsRef = useRef<Bot[]>(bots);

  // Update bots ref whenever bots change
  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled) {
      return;
    }

    const pollBots = () => {
      const currentBots = botsRef.current;
      
      if (!currentBots || currentBots.length === 0) {
        return;
      }

      // Filter out undefined/null bots and bots without required fields
      const validBots = currentBots.filter(bot => bot && getBotId(bot) && bot.status);
      
      if (validBots.length === 0) return;
      
      validBots.forEach((bot) => {
        // Only poll active bots (not completed or failed)
        const shouldPoll = bot.status === 'ready' 
          || bot.status === 'joining_call' 
          || bot.status === 'in_call'
          || bot.status === 'in_waiting_room'
          || bot.status === 'in_call_not_recording'
          || bot.status === 'in_call_recording'
          || bot.status === 'call_ended'
          || bot.status === 'recording_done';
        
        // Check if bot is done/analysis_done but missing transcript data
        const isDoneButMissingTranscript = (
          bot.status === 'done' || bot.status === 'analysis_done'
        ) && (!bot.transcript || bot.transcript.length === 0);
        
        // Don't poll fatal bots, but continue polling done bots until they have transcript
        const isFatalOrFullyComplete = bot.status === 'fatal' || 
          ((bot.status === 'done' || bot.status === 'analysis_done') && bot.transcript && bot.transcript.length > 0);

        if ((shouldPoll || isDoneButMissingTranscript) && !isFatalOrFullyComplete) {
          const botId = getBotId(bot);
          console.log(`Polling bot: ${botId.slice(0, 8)}... (status: ${bot.status}, has transcript: ${!!(bot.transcript && bot.transcript.length > 0)})`);
          dispatch(fetchBotDetails(botId));
        }
      });
    };

    // Initial poll after 5 seconds to give Recall.ai time to create the bot
    const initialTimeout = setTimeout(pollBots, 5000);

    // Set up interval for continuous polling
    intervalRef.current = setInterval(pollBots, intervalMs);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, dispatch]);

  // Manual refresh function
  const refreshAll = () => {
    bots.filter(bot => bot && getBotId(bot)).forEach((bot) => {
      dispatch(fetchBotDetails(getBotId(bot)));
    });
  };

  return { refreshAll };
};
