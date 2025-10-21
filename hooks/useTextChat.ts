import { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation } from '@elevenlabs/client';

interface TextChatMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface UseTextChatProps {
  expertId: string;
  onMessage?: (message: TextChatMessage) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void;
}

interface UseTextChatReturn {
  messages: TextChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  startTextChat: () => Promise<void>;
  endTextChat: () => Promise<void>;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

export const useTextChat = ({
  expertId,
  onMessage,
  onError,
  onStatusChange
}: UseTextChatProps): UseTextChatReturn => {
  const [messages, setMessages] = useState<TextChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const conversationRef = useRef<any>(null);
  const messageIdCounter = useRef(0);

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  };

  const addMessage = useCallback((type: 'user' | 'agent', text: string) => {
    const message: TextChatMessage = {
      id: generateMessageId(),
      type,
      text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    onMessage?.(message);
  }, [onMessage]);

  const handleStatusChange = useCallback((status: 'disconnected' | 'connecting' | 'connected') => {
    setIsConnected(status === 'connected');
    setIsConnecting(status === 'connecting');
    onStatusChange?.(status);
  }, [onStatusChange]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsConnected(false);
    setIsConnecting(false);
    onError?.(errorMessage);
  }, [onError]);

  const startTextChat = useCallback(async () => {
    if (conversationRef.current || isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      handleStatusChange('connecting');

      // Get signed URL from backend for secure authentication
      const response = await fetch(`/api/conversation/signed-url/${expertId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get signed URL');
      }

      const signedUrl = data.signed_url;

      // Start text-only conversation using ElevenLabs SDK
      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: {
          conversation: {
            textOnly: true, // Enable text-only mode
          },
        },
        onConnect: () => {
          console.log('🔗 Text chat connected');
          handleStatusChange('connected');
        },
        onDisconnect: () => {
          console.log('🔌 Text chat disconnected');
          handleStatusChange('disconnected');
          conversationRef.current = null;
        },
        onMessage: (message: any) => {
          console.log('📨 Received message:', message);
          
          // Handle different message types
          if (message.type === 'agent_response') {
            // Agent's response to user
            addMessage('agent', message.text || message.message || '');
          } else if (message.type === 'user_transcript') {
            // User's message (for confirmation/display)
            // Note: We already add user messages when sending, so this might be redundant
            console.log('👤 User transcript:', message.text);
          }
        },
        onError: (error: any) => {
          console.error('❌ Text chat error:', error);
          handleError(error.message || 'Text chat connection error');
        },
        onStatusChange: (statusObj: any) => {
          const status = statusObj?.status || statusObj;
          console.log('📊 Status change:', status)
          if (status === 'connected') {
            handleStatusChange('connected');
          } else if (status === 'connecting') {
            handleStatusChange('connecting');
          } else {
            handleStatusChange('disconnected');
          }
        },
      });

      conversationRef.current = conversation;
      console.log('✅ Text chat session started');

    } catch (error: any) {
      console.error('❌ Failed to start text chat:', error);
      handleError(error.message || 'Failed to start text chat');
    }
  }, [expertId, isConnecting, handleStatusChange, handleError, addMessage]);

  const endTextChat = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
        console.log('🛑 Text chat session ended');
      } catch (error: any) {
        console.error('❌ Error ending text chat:', error);
      } finally {
        conversationRef.current = null;
        handleStatusChange('disconnected');
      }
    }
  }, [handleStatusChange]);

  const sendMessage = useCallback((text: string) => {
    if (!conversationRef.current || !isConnected || !text.trim()) {
      console.warn('⚠️ Cannot send message: not connected or empty text');
      return;
    }

    try {
      // Add user message to UI immediately
      addMessage('user', text.trim());
      
      // Send message to ElevenLabs agent
      conversationRef.current.sendUserMessage({
        text: text.trim()
      });
      
      console.log('📤 Message sent:', text.trim());
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      handleError(error.message || 'Failed to send message');
    }
  }, [isConnected, addMessage, handleError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error);
      }
    };
  }, []);

  return {
    messages,
    isConnected,
    isConnecting,
    error,
    startTextChat,
    endTextChat,
    sendMessage,
    clearMessages,
  };
};
