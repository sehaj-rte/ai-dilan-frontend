'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// import { Alert, AlertDescription } from '../../ui/alert';
import { 
  MessageSquare, 
  Clock, 
  Search, 
  RefreshCw,
  Eye,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  Hash,
  AlertCircle,
  Mic,
  User
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConversationTranscript from './ConversationTranscript';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/config';

interface Conversation {
  id: string;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  duration?: string;
  message_count?: number;
}

interface ExpertTranscriptData {
  expert_id: string;
  expert_name: string;
  agent_id?: string;
  conversations: Conversation[];
  total: number;
  has_more: boolean;
  message?: string;
}

interface ExpertTranscriptManagerProps {
  expertId: string;
  expertName?: string;
}

export default function ExpertTranscriptManager({ 
  expertId, 
  expertName 
}: ExpertTranscriptManagerProps) {
  const { showToast } = useToast();
  const [transcriptData, setTranscriptData] = useState<ExpertTranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const fetchTranscripts = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      console.log('🔍 Fetching transcripts for expert:', expertId);
      console.log('🔗 API URL:', `${API_URL}/transcripts/expert/${expertId}/conversations?${params}`);

      const response = await fetchWithAuth(
        `${API_URL}/transcripts/expert/${expertId}/conversations?${params}`,
        {
          headers: getAuthHeaders(),
        }
      );

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Failed to fetch transcripts: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Response data:', data);

      if (data.success) {
        console.log('✅ Success! Conversations:', data.conversations?.length || 0);
        if (reset) {
          setTranscriptData(data);
          setOffset(0);
        } else {
          setTranscriptData(prev => prev ? {
            ...data,
            conversations: [...prev.conversations, ...data.conversations]
          } : data);
        }
      } else {
        console.error('❌ API returned error:', data.error);
        throw new Error(data.error || 'Failed to fetch transcripts');
      }
    } catch (err) {
      console.error('💥 Error fetching transcripts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('Failed to load transcripts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expertId) {
      console.log('🚀 ExpertTranscriptManager mounted for expert:', expertId);
      fetchTranscripts(true);
    }
  }, [expertId]);

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
    fetchTranscripts(false);
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchTranscripts(true);
  };

  const handleViewTranscript = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleExportAll = async () => {
    try {
      if (!transcriptData?.conversations.length) {
        showToast('No conversations to export', 'error');
        return;
      }

      // Create a summary export
      const exportData = {
        expert_name: transcriptData.expert_name,
        expert_id: transcriptData.expert_id,
        agent_id: transcriptData.agent_id,
        total_conversations: transcriptData.total,
        exported_at: new Date().toISOString(),
        conversations: transcriptData.conversations.map(conv => ({
          id: conv.id,
          created_at: conv.created_at,
          status: conv.status,
          duration: conv.duration,
          message_count: conv.message_count
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcriptData.expert_name}-conversations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Conversation list exported', 'success');
    } catch (err) {
      showToast('Failed to export conversations', 'error');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'active':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredConversations = transcriptData?.conversations.filter(conv =>
    !searchTerm || 
    conv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.agent_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (selectedConversation) {
    return (
      <ConversationTranscript 
        conversationId={selectedConversation}
        onClose={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Voice Transcripts</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                {transcriptData ? (
                  <>
                    {transcriptData.total > 0 
                      ? `${transcriptData.total} conversation${transcriptData.total !== 1 ? 's' : ''} found for ${transcriptData.expert_name}`
                      : `No conversations found for ${transcriptData.expert_name}`
                    }
                  </>
                ) : (
                  `Loading conversations for ${expertName || 'expert'}...`
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {(transcriptData?.conversations?.length || 0) > 0 && (
                <Button onClick={handleExportAll} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export List
                </Button>
              )}
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Expert Info */}
          {transcriptData && (
            <div className="flex items-center space-x-4 pt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{transcriptData.expert_name}</span>
              </div>
              {transcriptData.agent_id && (
                <div className="flex items-center space-x-1">
                  <Mic className="h-3 w-3" />
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    {transcriptData.agent_id}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="flex items-center space-x-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations by ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {loading && !transcriptData ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading conversations...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : !transcriptData?.agent_id ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-blue-800">
                {transcriptData?.message || 'This expert is not configured with ElevenLabs yet. Voice transcripts will be available once the expert is set up.'}
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">
                {searchTerm ? 'No conversations match your search' : 'No conversations found yet'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-gray-500 mt-1">
                  Conversations will appear here once users start chatting with your expert
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {conversation.id}
                          </code>
                          {conversation.status && (
                            <Badge variant={getStatusBadgeVariant(conversation.status)}>
                              {conversation.status}
                            </Badge>
                          )}
                          {conversation.duration && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {conversation.duration}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {conversation.created_at && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatTimestamp(conversation.created_at)}</span>
                            </div>
                          )}
                          {conversation.message_count && (
                            <span>{conversation.message_count} messages</span>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleViewTranscript(conversation.id)}
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Transcript
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More Button */}
              {transcriptData?.has_more && (
                <div className="text-center pt-4">
                  <Button 
                    onClick={handleLoadMore} 
                    variant="outline" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More ({filteredConversations.length} of {transcriptData.total})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}