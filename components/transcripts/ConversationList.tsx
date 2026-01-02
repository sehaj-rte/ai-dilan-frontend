'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Clock, 
  Search, 
  RefreshCw,
  Eye,
  Calendar,
  Filter,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConversationTranscript from './ConversationTranscript';

interface Conversation {
  id: string;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  duration?: string;
  message_count?: number;
}

interface ConversationListProps {
  agentId?: string;
  title?: string;
}

export default function ConversationList({ 
  agentId, 
  title = "Conversations" 
}: ConversationListProps) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchConversations = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      if (agentId) {
        params.append('agent_id', agentId);
      }

      const endpoint = agentId 
        ? `/bapi/transcripts/agents/${agentId}/conversations?${params}`
        : `/bapi/transcripts/conversations?${params}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const newConversations = data.conversations || [];
        
        if (reset) {
          setConversations(newConversations);
          setOffset(0);
        } else {
          setConversations(prev => [...prev, ...newConversations]);
        }
        
        setHasMore(data.has_more || false);
        setTotal(data.total || newConversations.length);
      } else {
        throw new Error(data.error || 'Failed to fetch conversations');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);
  }, [agentId]);

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
    fetchConversations(false);
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchConversations(true);
  };

  const handleViewTranscript = (conversationId: string) => {
    setSelectedConversation(conversationId);
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

  const filteredConversations = conversations.filter(conv =>
    !searchTerm || 
    conv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.agent_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedConversation) {
    return (
      <ConversationTranscript 
        conversationId={selectedConversation}
        onClose={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>{title}</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              {total > 0 ? `${total} conversation${total !== 1 ? 's' : ''} found` : 'No conversations found'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations by ID or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading conversations...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Failed to load conversations</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">
              {searchTerm ? 'No conversations match your search' : 'No conversations found'}
            </p>
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
                        {conversation.agent_id && (
                          <span>Agent: {conversation.agent_id}</span>
                        )}
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
            {hasMore && (
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
                      Load More ({conversations.length} of {total})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}