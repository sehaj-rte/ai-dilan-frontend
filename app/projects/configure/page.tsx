'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Settings, User, Mic, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ConfigureProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    // Get project data from URL params if available
    const projectParam = searchParams.get('project');
    if (projectParam) {
      try {
        const data = JSON.parse(decodeURIComponent(projectParam));
        setProjectData(data);
      } catch (error) {
        console.error('Error parsing project data:', error);
      }
    }
  }, [searchParams]);

  const handleContinueToConfiguration = () => {
    setIsLoading(true);
    
    // Navigate to the existing agent creation/configuration interface
    if (projectData) {
      const projectDataParam = encodeURIComponent(JSON.stringify(projectData));
      router.push(`/dashboard/create-expert?project=${projectDataParam}`);
    } else {
      router.push('/dashboard/create-expert');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Back Button */}
        <Link href="/projects" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Link>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Configure Your AI Avatar
            </CardTitle>
            <CardDescription className="text-gray-600">
              {projectData ? `Set up "${projectData.name}" with advanced features` : 'Configure your AI avatar with advanced features'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {projectData && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Project Details</h3>
                <p className="text-blue-800"><strong>Name:</strong> {projectData.name}</p>
                {projectData.description && (
                  <p className="text-blue-800 mt-1"><strong>Description:</strong> {projectData.description}</p>
                )}
              </div>
            )}

            {/* Configuration Options Preview */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Basic Information</h4>
                    <p className="text-sm text-gray-600">Set name, description, and personality</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Mic className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Voice Settings</h4>
                    <p className="text-sm text-gray-600">Choose from premium voice library</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Knowledge Base</h4>
                    <p className="text-sm text-gray-600">Upload documents and training data</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Advanced Settings</h4>
                    <p className="text-sm text-gray-600">Fine-tune behavior and responses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-4">
              <Button
                onClick={handleContinueToConfiguration}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading Configuration...
                  </>
                ) : (
                  'Continue to Configuration'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            You'll be taken to the comprehensive configuration interface where you can set up voice, knowledge base, and all other avatar settings.
          </p>
        </div>
      </div>
    </div>
  );
}