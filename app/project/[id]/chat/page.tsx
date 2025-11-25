"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import { MessageCircle, Phone, User } from "lucide-react";

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

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url;

    const match = s3Url.match(
      /https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/,
    );
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`;
    }
    return s3Url;
  };

  const fetchExpertAndPublication = async () => {
    try {
      setIsLoading(true);
      setCheckingPublication(true);

      // Fetch expert data
      const expertResponse = await fetchWithAuth(
        `${API_URL}/experts/${expertId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const expertData = await expertResponse.json();

      if (!expertData.success || !expertData.expert) {
        console.error("Failed to fetch expert:", expertData.error);
        router.push("/projects");
        return;
      }

      const expertWithProxyUrl = {
        ...expertData.expert,
        avatar_url: expertData.expert.avatar_url
          ? convertS3UrlToProxy(expertData.expert.avatar_url)
          : null,
      };
      setExpert(expertWithProxyUrl);

      // Check if expert has a publication
      try {
        console.log("🔍 Checking publication for expert:", expertId);
        const pubResponse = await fetchWithAuth(
          `${API_URL}/publishing/experts/${expertId}/publication`,
          {
            headers: getAuthHeaders(),
          },
        );
        console.log("📡 Publication response status:", pubResponse.status);

        const pubData = await pubResponse.json();
        console.log("📦 Publication data:", pubData);

        if (pubData.success && pubData.publication) {
          console.log("✅ Publication found:", pubData.publication);
          setPublication(pubData.publication);
        } else {
          console.log("⚠️ No publication in response:", pubData);
        }
      } catch (pubError) {
        console.error("❌ Publication check error:", pubError);
        // Not an error - expert just hasn't published yet
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

  if (isLoading || checkingPublication) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading expert...</span>
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
          <div className="mb-6">
            {expert.avatar_url ? (
              <div className="relative">
                <img
                  src={expert.avatar_url}
                  alt={expert.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback =
                      e.currentTarget.parentElement?.querySelector(
                        ".avatar-fallback",
                      ) as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="avatar-fallback w-32 h-32 rounded-full mx-auto hidden items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg">
                  {expert.name.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg">
                {expert.name.charAt(0)}
              </div>
            )}
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
          <div className="flex justify-center gap-3 mb-12">
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
