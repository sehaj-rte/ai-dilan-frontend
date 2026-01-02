'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  MessageSquare, 
  RefreshCw, 
  AlertCircle,
  Mic,
  FileText,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ExpertTranscriptManager from '@/components/transcripts/ExpertTranscriptManager';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/config';

interface ExpertData {
  id: string;
  name: string;
  elevenlabs_agent_id?: string;
  text_only?: boolean;
  created_at?: string;
}

export default function VoiceTranscriptsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { showToast, ToastContainer } = useToast();
  
  const [expert, setExpert] = useState<ExpertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpertData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch expert data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.expert) {
        setExpert(data.expert);
      } else {
        throw new Error(data.error || 'Failed to fetch expert data');
      }
    } catch (err) {
      console.error('Error fetching expert data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      showToast('Failed to load expert data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchExpertData();
    }
  }, [projectId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading expert data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
        <div className="mt-4">
          <Button onClick={fetchExpertData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <p className="text-blue-800">Expert not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span>Voice Transcripts</span>
            </h1>
            <p className="text-gray-600">
              View and manage conversation transcripts for {expert.name}
            </p>
          </div>
          
          <Button onClick={fetchExpertData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Expert Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="h-5 w-5" />
              <span>Expert Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Expert Name</p>
                <p className="text-sm font-semibold">{expert.name}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">ElevenLabs Agent ID</p>
                {expert.elevenlabs_agent_id ? (
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {expert.elevenlabs_agent_id}
                  </code>
                ) : (
                  <Badge variant="outline">Not configured</Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Mode</p>
                <Badge variant={expert.text_only ? "secondary" : "default"}>
                  {expert.text_only ? "Text Only" : "Voice + Text"}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Created</p>
                <div className="flex items-center space-x-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  <span>{expert.created_at ? formatDate(expert.created_at) : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcripts Manager */}
      <ExpertTranscriptManager 
        expertId={projectId}
        expertName={expert.name}
      />

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>About Voice Transcripts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">What are Voice Transcripts?</h4>
              <p className="text-gray-600">
                Voice transcripts are records of conversations between users and your AI expert. 
                They include both voice and text interactions, showing the complete conversation flow.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Available Formats</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• <strong>JSON:</strong> Structured format with metadata</li>
                <li>• <strong>Text:</strong> Plain text conversation</li>
                <li>• <strong>Markdown:</strong> Formatted for documentation</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Features</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• View conversation history</li>
                <li>• Export transcripts</li>
                <li>• Search and filter conversations</li>
                <li>• Real-time updates</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Privacy & Security</h4>
              <p className="text-gray-600">
                All transcripts are securely stored and only accessible to you as the expert owner. 
                User privacy is maintained according to our privacy policy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}