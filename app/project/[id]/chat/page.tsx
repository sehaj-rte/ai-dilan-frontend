"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import { MessageCircle, Phone, User } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";

interface Expert {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  elevenlabs_agent_id: string;
  is_active: boolean;
  text_only: boolean;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: "text" | "voice" | "transcription";
}

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const expertId = params.id as string;

  const [expert, setExpert] = useState<Expert | null>(null);
  const [publication, setPublication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingPublication, setCheckingPublication] = useState(true);
  useEffect(() => {
    if (expertId) {
      fetchExpertAndPublication();
    }
  }, [expertId]);

  const convertS3UrlToProxy = (s3Url: string, thumbnail: boolean = false, size: number = 128): string => {
    if (!s3Url) return s3Url;

    // Since avatars are now public, return direct S3 URLs for better performance
    // No need to proxy through the backend anymore
    return s3Url;
  };

  const fetchExpertAndPublication = async () => {
    try {
      setIsLoading(true);
      setCheckingPublication(true);

      // Parallel fetch for better performance
      const [expertResponse, pubResponse] = await Promise.allSettled([
        fetchWithAuth(`${API_URL}/experts/${expertId}`, {
          headers: getAuthHeaders(),
        }),
        fetchWithAuth(`${API_URL}/publishing/experts/${expertId}/publication`, {
          headers: getAuthHeaders(),
        })
      ]);

      // Handle expert data
      if (expertResponse.status === 'fulfilled') {
        const expertData = await expertResponse.value.json();
        
        if (!expertData.success || !expertData.expert) {
          console.error("Failed to fetch expert:", expertData.error);
          router.push("/projects");
          return;
        }

        const expertWithProxyUrl = {
          ...expertData.expert,
          avatar_url: expertData.expert.avatar_url
            ? convertS3UrlToProxy(expertData.expert.avatar_url, true, 128)
            : null,
        };
        setExpert(expertWithProxyUrl);
      } else {
        console.error("Error fetching expert:", expertResponse.reason);
        router.push("/projects");
        return;
      }

      // Handle publication data (optional)
      if (pubResponse.status === 'fulfilled') {
        try {
          const pubData = await pubResponse.value.json();
          if (pubData.success && pubData.publication) {
            setPublication(pubData.publication);
          }
        } catch (pubError) {
          console.log("Publication not available or error parsing:", pubError);
        }
      }
    } catch (error) {
      console.error("Error fetching expert:", error);
      router.push("/projects");
    } finally {
      setIsLoading(false);
      setCheckingPublication(false);
    }
  };

  const handleStartChat = () => {
    console.log("🖱️ Redirecting to expert chat using ID:", expertId);
    // Redirect to expert chat using expert ID (no publication required)
    router.push(`/persona/${expertId}/chat`);
  };

  const handleStartCall = () => {
    console.log("📋 Redirecting to expert call using ID:", expertId);
    // Redirect to expert call using expert ID (no publication required)
    router.push(`/persona/${expertId}/call`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <span className="text-gray-600 text-lg">Loading expert...</span>
            {checkingPublication && (
              <p className="text-gray-500 text-sm mt-2">Checking publication status...</p>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Expert not found
            </h2>
            <Button onClick={() => router.push("/projects")}>
              Back to Projects
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Expert Avatar */}
          <div className="mb-6 flex justify-center">
            <OptimizedImage
              src={expert.avatar_url}
              alt={expert.name}
              className="w-32 h-32 rounded-full object-cover shadow-lg"
              fallbackClassName="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-lg"
              fallbackIcon={
                <span className="text-gray-600 text-4xl font-bold">
                  {expert.name.charAt(0)}
                </span>
              }
              priority={true}
              placeholder="blur"
            />
          </div>

          {/* Expert Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {expert.name}
          </h1>

          {/* Status */}
          <p className="text-gray-500 text-sm mb-8">
            {expert.is_active ? "Online" : "Offline"}
          </p>

          {/* CTA Buttons */}
          <div className="flex justify-center gap-3 mb-6">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              onClick={handleStartChat}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat
            </Button>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              onClick={handleStartCall}
            >
              <Phone className="h-5 w-5 mr-2" />
              Call
            </Button>
          </div>

          {/* Browser Compatibility Banner */}
          <div className="mb-12">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-sm font-medium shadow-sm">
              <svg 
                className="w-4 h-4 mr-2 text-orange-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
              Best experience with Chrome or Safari
            </div>
          </div>

          {/* Publication Status Badge - Only show if not published */}
          {!publication && (
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                <span className="mr-2">⚠️</span>
                <span>
                  Not published yet - Click Chat/Call to publish first
                </span>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">≡</span>
                Description
              </h2>
            </div>
            <div className="text-left text-gray-700 leading-relaxed space-y-4">
              <p>{expert.description || "No description available."}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatPage;
