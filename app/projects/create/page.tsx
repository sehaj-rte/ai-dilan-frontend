'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter an avatar name');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Create avatar with minimal data - backend will use defaults for voice
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        system_prompt: `You are ${formData.name.trim()}, a helpful AI assistant.`,
        first_message: null,
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
        avatar_base64: null,
        selected_files: []
      };

      console.log('Creating avatar with payload:', payload);

      const response = await fetchWithAuth(`${API_URL}/experts/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Avatar created successfully:', result);
        const avatarId = result.expert?.id;
        setCreatedAvatarId(avatarId);
        setShowSuccessDialog(true);
        
        // Redirect to the avatar page after 2 seconds
        setTimeout(() => {
          router.push(`/project/${avatarId}`);
        }, 2000);
      } else {
        console.error('Error creating avatar:', result);
        setError(result.error || 'Failed to create avatar. Please try again.');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Back Button */}
        <Link href="/projects" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Link>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Create Avatar
            </CardTitle>
            <CardDescription className="text-gray-600">
              Give your AI avatar a name and description to get started.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Avatar Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your AI avatar's name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              {/* Agent Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what your AI avatar will do (optional)"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full resize-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={!formData.name.trim() || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Avatar...
                    </>
                  ) : (
                    'Create Avatar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            After creating your agent, you'll be taken to the knowledge base where you can upload documents, add YouTube videos, and other content to train your agent.
          </p>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Avatar Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your AI avatar "{formData.name}" has been created with ElevenLabs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 text-center">
                ✓ Avatar created on ElevenLabs platform
              </p>
              <p className="text-sm text-green-800 text-center mt-2">
                ✓ Voice agent configured with default voice
              </p>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Redirecting to your avatar...
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                if (createdAvatarId) {
                  router.push(`/project/${createdAvatarId}`);
                }
              }}
              className="w-full"
            >
              Go to Avatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}