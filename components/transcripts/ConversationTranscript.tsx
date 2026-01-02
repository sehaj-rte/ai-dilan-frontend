'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Temporarily remove ScrollArea import to fix build
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Copy, 
  MessageSquare, 
  Clock, 
  User, 
  Bot,
  RefreshCw,
  FileText,
  Hash
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/config';

interface TranscriptMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface ConversationMetadata {
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  duration?: string;
}

interface ConversationTranscriptProps {
  conversationId: string;
  onClose?: () => void;
}

export default function ConversationTranscript({ 
  conversationId, 
  onClose 
}: ConversationTranscriptProps) {
  const { showToast } = useToast();
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [metadata, setMetadata] = useState<ConversationMetadata>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'json' | 'text' | 'markdown'>('json');

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching transcript for conversation:', conversationId);
      console.log('📄 Format:', format);
      
      // Validate inputs
      if (!conversationId) {
        throw new Error('No conversation ID provided');
      }

      if (!['json', 'text', 'markdown'].includes(format)) {
        throw new Error('Invalid format specified');
      }

      // Check authentication
      console.log('🔐 Using fetchWithAuth for API call');

      // Build request URL with proper encoding
      const url = `${API_URL}/transcripts/conversations/${encodeURIComponent(conversationId)}?format_type=${encodeURIComponent(format)}`;
      console.log('🔗 Request URL:', url);

      // Make API request with timeout using fetchWithAuth
      const response = await fetchWithAuth(url, {
        headers: getAuthHeaders(),
      });
      console.log('📡 Response status:', response.status);

      // Handle different response statuses
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Failed to fetch transcript: ${response.statusText}`);
      }

      // Parse successful response
      const data = await response.json();
      console.log('📋 Response data structure:', {
        success: data.success,
        hasTranscript: !!data.transcript,
        transcriptType: typeof data.transcript,
        transcriptLength: Array.isArray(data.transcript) ? data.transcript.length : 
                         typeof data.transcript === 'string' ? data.transcript.length : 'unknown',
        hasMetadata: !!data.metadata,
      });

      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }

      if (!data.transcript) {
        throw new Error('No transcript data received from server');
      }

      // Process transcript data based on format
      let processedTranscript;
      
      if (format === 'json') {
        if (Array.isArray(data.transcript)) {
          // Map ElevenLabs transcript structure to our expected format
          processedTranscript = data.transcript.map((item: any, index: number) => ({
            role: item.role || 'unknown',
            content: item.message || item.content || 'No message content',
            timestamp: item.time_in_call_secs !== undefined ? `${item.time_in_call_secs}s` : ''
          }));
        } else {
          // If transcript is not an array, try to parse it
          console.warn('⚠️ Expected array for JSON format, got:', typeof data.transcript);
          processedTranscript = [{
            role: 'system',
            content: typeof data.transcript === 'string' ? data.transcript : JSON.stringify(data.transcript),
            timestamp: ''
          }];
        }
      } else {
        // For text/markdown formats
        const content = typeof data.transcript === 'string' ? data.transcript : JSON.stringify(data.transcript);
        processedTranscript = [{
          role: 'system',
          content,
          timestamp: ''
        }];
      }

      // Update state
      setTranscript(processedTranscript);
      setMetadata(data.metadata || {});
      
      console.log('✅ Transcript loaded successfully');
      console.log(`📊 Loaded ${processedTranscript.length} message(s)`);

    } catch (err) {
      console.error('💥 Error fetching transcript:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('Failed to load conversation transcript', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchTranscript();
    }
  }, [conversationId, format]);

  const handleCopyTranscript = async () => {
    try {
      let textToCopy = '';
      
      if (format === 'json') {
        textToCopy = transcript.map(msg => 
          `${msg.role}: ${msg.content}${msg.timestamp ? ` (${msg.timestamp})` : ''}`
        ).join('\n\n');
      } else {
        textToCopy = transcript[0]?.content || '';
      }

      await navigator.clipboard.writeText(textToCopy);
      showToast('Transcript copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy transcript', 'error');
    }
  };

  const handleDownloadTranscript = () => {
    try {
      let content = '';
      let filename = `conversation-${conversationId}.txt`;

      if (format === 'json') {
        content = JSON.stringify({ transcript, metadata }, null, 2);
        filename = `conversation-${conversationId}.json`;
      } else if (format === 'markdown') {
        content = transcript[0]?.content || '';
        filename = `conversation-${conversationId}.md`;
      } else {
        content = transcript[0]?.content || '';
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Transcript downloaded', 'success');
    } catch (err) {
      showToast('Failed to download transcript', 'error');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
      case 'agent':
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'user':
        return 'default';
      case 'assistant':
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading conversation transcript...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-600">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Failed to load transcript</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
            <Button onClick={() => fetchTranscript()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Conversation Transcript</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Hash className="h-3 w-3" />
                <span>{conversationId}</span>
              </div>
              {metadata.created_at && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(metadata.created_at)}</span>
                </div>
              )}
              {metadata.duration && (
                <Badge variant="outline">{metadata.duration}</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Format selector */}
            <div className="flex items-center space-x-1">
              {(['json', 'text', 'markdown'] as const).map((fmt) => (
                <Button
                  key={fmt}
                  variant={format === fmt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
            
            <Button onClick={handleCopyTranscript} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            
            <Button onClick={handleDownloadTranscript} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[600px] w-full overflow-auto">
          {format === 'json' ? (
            <div className="space-y-4">
              {transcript.map((message, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(message.role)} className="flex items-center space-x-1">
                      {getRoleIcon(message.role)}
                      <span className="capitalize">{message.role}</span>
                    </Badge>
                    {message.timestamp && (
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 ml-4">
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                  
                  {index < transcript.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{format.toUpperCase()} Format</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {transcript[0]?.content || 'No content available'}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}