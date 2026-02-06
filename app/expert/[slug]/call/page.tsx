"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  User,
  LogIn,
  LogOut,
  MessageSquare,
  Languages,
} from "lucide-react";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { RootState } from "@/store/store";
import { logout, loadUserFromStorage } from "@/store/slices/authSlice";
import { usePlanLimitations } from "@/hooks/usePlanLimitations";
import { UsageStatusBar } from "@/components/usage/UsageStatusBar";
import { LimitReachedModal } from "@/components/usage/LimitReachedModal";
import { useExpert } from "@/contexts/ExpertContext";
import { LanguageSelector } from "@/components/ui/LanguageSelector";


interface Expert {
  id: string;
  name: string;
  headline: string;
  description: string;
  avatar_url: string;
  elevenlabs_agent_id: string;
}

interface Publication {
  id: string;
  slug: string;
  display_name: string;
  is_published: boolean;
  primary_color: string;
  secondary_color: string;
  theme: string;
  banner_url?: string | null;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
];

const ClientCallPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const slug = params.slug as string;

  // Use Expert context
  const { setExpertData } = useExpert();

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [expert, setExpert] = useState<Expert | null>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [usageTrackingInterval, setUsageTrackingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [lastTrackedMinute, setLastTrackedMinute] = useState(0);
  const [showLowTimeWarning, setShowLowTimeWarning] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [paymentSessionValid, setPaymentSessionValid] = useState<
    boolean | null
  >(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Plan limitations state
  const [showLimitReachedModal, setShowLimitReachedModal] = useState(false);

  // Plan limitations hook
  const {
    usage,
    limitStatus,
    currentPlan,
    subscription,
    loading: planLoading,
    error: planError,
    refreshUsage,
    trackUsage,
    checkCanSendMessage,
    checkCanMakeCall,
    getRemainingUsage,
  } = usePlanLimitations({
    expertId: expert?.id || "",
    enabled: isAuthenticated && !!expert?.id,
  });

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url as any;
    const match = s3Url.match(
      /https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/,
    );
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`;
    }
    return s3Url;
  };

  const { state, startConversation, endConversation } = useVoiceConversation({
    expertId: expert?.id || "",
    userId: user?.id,
    language: selectedLanguage,
    onError: (error) => {
      setError(error);
    },
    onStatusChange: (status) => {
      console.log("Voice status changed:", status);
    },
  });

  // Load user from storage on mount
  useEffect(() => {
    console.log("🔄 Loading user from storage...");
    dispatch(loadUserFromStorage());
    // Give a small delay to ensure Redux state is updated
    setTimeout(() => {
      setAuthLoaded(true);
      console.log("✅ Auth state loaded");
    }, 100);
  }, [dispatch]);

  // Load saved language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem("preferred_language");
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    fetchExpertData();
  }, [slug]);

  // Check for payment session ID and validate it
  useEffect(() => {
    if (!authLoaded) return; // Wait for auth to load first

    const sessionIdParam = searchParams.get("session_id");
    if (sessionIdParam) {
      setPaymentSessionId(sessionIdParam);
      validatePaymentSession(sessionIdParam);
    } else {
      // If no session ID, check if user needs to pay
      checkPaymentRequirement();
    }
  }, [searchParams, isAuthenticated, authLoaded]);

  const validatePaymentSession = async (sessionId: string) => {
    if (!isAuthenticated) {
      setPaymentSessionValid(false);
      return;
    }

    // Check if user is super_admin - bypass all payment checks
    if (user?.role === "super_admin") {
      console.log("👑 Super admin detected, bypassing payment validation");
      setPaymentSessionValid(true);
      return;
    }

    // Check if user is the expert owner - bypass payment checks
    if (expert?.id) {
      try {
        const token = localStorage.getItem("dilan_ai_token");
        const response = await fetch(
          `${API_URL}/experts/check-ownership/${expert.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();

        if (data.success && data.is_owner) {
          console.log("👤 Expert owner detected, bypassing payment validation");
          setPaymentSessionValid(true);
          return;
        }
      } catch (error) {
        console.error("❌ Error checking expert ownership:", error);
      }
    }

    try {
      const token = localStorage.getItem("dilan_ai_token"); // Fix token key
      let databaseSessionId = sessionId;

      // Check if this is a Stripe checkout session ID (starts with 'cs_')
      if (sessionId.startsWith("cs_")) {
        console.log(
          "🔄 Converting Stripe session ID to database session ID...",
        );

        // Convert Stripe session ID to database session ID
        const conversionResponse = await fetch(
          `${API_URL}/payments/stripe-session/${sessionId}/database-session`,
        );
        const conversionData = await conversionResponse.json();

        if (conversionData.success) {
          databaseSessionId = conversionData.database_session_id;
          console.log(
            "✅ Converted to database session ID:",
            databaseSessionId,
          );

          // Update URL to use database session ID
          const newUrl = `${window.location.pathname}?session_id=${databaseSessionId}`;
          window.history.replaceState({}, "", newUrl);
        } else {
          console.error(
            "❌ Failed to convert Stripe session ID:",
            conversionData,
          );
          setPaymentSessionValid(false);
          router.push(`/expert/${slug}`);
          return;
        }
      }

      // Validate the database session
      const response = await fetch(
        `${API_URL}/payments/session/${databaseSessionId}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (data.success && data.session.payment_status === "succeeded") {
        setPaymentSessionValid(true);
        setPaymentSessionId(databaseSessionId); // Update state with database session ID
      } else {
        setPaymentSessionValid(false);
        // Redirect back to expert page for payment
        router.push(`/expert/${slug}`);
      }
    } catch (error) {
      console.error("Error validating payment session:", error);
      setPaymentSessionValid(false);
      router.push(`/expert/${slug}`);
    }
  };

  const checkPaymentRequirement = () => {
    // Check if user is super_admin - bypass all payment checks
    if (user?.role === "super_admin") {
      console.log("👑 Super admin detected, bypassing payment requirement");
      setPaymentSessionValid(true);
      return;
    }

    // Check if user is the expert owner - bypass payment checks
    if (isAuthenticated && expert?.id) {
      const token = localStorage.getItem("dilan_ai_token");
      fetch(`${API_URL}/experts/check-ownership/${expert.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.is_owner) {
            console.log(
              "👤 Expert owner detected, bypassing payment requirement",
            );
            setPaymentSessionValid(true);
          } else {
            // Regular payment requirement check
            if (isAuthenticated && !paymentSessionId) {
              // For now, allow free access - in production you might want to redirect to payment
              setPaymentSessionValid(true);
            }
          }
        })
        .catch((error) => {
          console.error("❌ Error checking expert ownership:", error);
          // Fallback to regular payment requirement check
          if (isAuthenticated && !paymentSessionId) {
            setPaymentSessionValid(true);
          }
        });
    } else if (isAuthenticated && !paymentSessionId) {
      // For now, allow free access - in production you might want to redirect to payment
      setPaymentSessionValid(true);
    } else if (!isAuthenticated) {
      // Redirect to login
      router.push(`/expert/${slug}`);
    }
  };

  const fetchExpertData = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/publishing/public/expert/${slug}`,
      );
      const data = await response.json();

      if (data.success) {
        setExpert({
          ...data.expert,
          avatar_url: data.expert?.avatar_url
            ? convertS3UrlToProxy(data.expert.avatar_url)
            : null,
        });
        setPublication(data.publication);

        // Update expert context for footer
        setExpertData({
          name: data.expert.name,
          displayName: data.publication?.display_name,
          primaryColor: data.publication?.primary_color,
          secondaryColor: data.publication?.secondary_color,
        });
      } else {
        setError("Expert not found or not published");
      }
    } catch (error) {
      console.error("Error fetching expert data:", error);
      setError("Failed to load expert page");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async () => {
    if (!expert) return;

    console.log(`🔍 Pre-call checks:`);
    console.log(`   isAuthenticated: ${isAuthenticated}`);
    console.log(`   planLoading: ${planLoading}`);
    console.log(`   expert.id: ${expert.id}`);
    console.log(`   selectedLanguage: ${selectedLanguage}`);

    // CRITICAL: Block calls until usage data is fully loaded
    if (planLoading) {
      console.log(`🚫 Call blocked - usage data still loading`);
      setError("Loading usage data... Please wait.");
      return;
    }

    // Get current usage status
    const remainingUsage = getRemainingUsage();
    console.log(`   remainingUsage:`, remainingUsage);
    console.log(`   limitStatus:`, limitStatus);

    // Check if user can make calls - ONLY after data is loaded
    if (isAuthenticated) {
      const canMakeCall = checkCanMakeCall(1);
      console.log(`   checkCanMakeCall(1): ${canMakeCall}`);

      if (!canMakeCall) {
        console.log(`🚫 Call blocked - showing limit modal`);
        setShowLimitReachedModal(true);
        return;
      }

      // Additional check for overuse cases
      if (remainingUsage.minutes !== null && remainingUsage.minutes <= 0) {
        console.log(`🚫 Call blocked - no minutes remaining (${remainingUsage.minutes})`);
        setShowLimitReachedModal(true);
        return;
      }
    }

    try {
      // Check for microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Your browser does not support microphone access. Please use a modern browser.",
        );
        return;
      }

      // Show language configuration message
      if (selectedLanguage !== 'en') {
        const languageName = LANGUAGES.find(lang => lang.code === selectedLanguage)?.name;
        console.log(`🌍 Configuring conversation for ${languageName}...`);
        setError(`Configuring conversation for ${languageName}...`);

        // Clear the message after a short delay
        setTimeout(() => setError(null), 2000);
      }

      console.log(`📞 Starting call - checks passed`);
      await startConversation();

      // Reset tracking state
      setCallDuration(0);
      setLastTrackedMinute(0);
      setShowLowTimeWarning(false);

      // Start timer for UI display
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);

      // Start real-time usage tracking (every 30 seconds instead of 60)
      const usageInterval = setInterval(() => {
        trackRealTimeUsage();
      }, 30000); // Track every 30 seconds for better accuracy
      setUsageTrackingInterval(usageInterval);

      console.log(`📞 Call started - timer and real-time tracking running`);
    } catch (error) {
      console.error("Failed to start voice conversation:", error);
      if (error instanceof Error) {
        if (error.message.includes("Permission denied")) {
          setError(
            "Microphone access denied. Please allow microphone access and try again.",
          );
        } else if (error.message.includes("NotFoundError")) {
          setError(
            "No microphone found. Please connect a microphone and try again.",
          );
        } else {
          setError(error.message);
        }
      }
    }
  };

  const handleEndCall = async () => {
    try {
      await endConversation();

      // Stop all timers first
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      if (usageTrackingInterval) {
        clearInterval(usageTrackingInterval);
        setUsageTrackingInterval(null);
      }

      // Calculate total minutes used (round up partial minutes for billing)
      const totalMinutes = Math.ceil(callDuration / 60);

      console.log(`📞 Call ended: ${formatCallDurationWithText(callDuration)} (${callDuration} seconds) -> billing ${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`);

      // Track final usage - only track remaining minutes not already tracked
      if (isAuthenticated && expert?.id && totalMinutes > lastTrackedMinute) {
        const remainingMinutes = totalMinutes - lastTrackedMinute;
        console.log(`📞 Tracking final ${remainingMinutes} minutes for call (total: ${totalMinutes}, already tracked: ${lastTrackedMinute})`);

        trackUsage({
          expert_id: expert.id,
          event_type: "minutes_used",
          quantity: remainingMinutes,
        }).catch((err) =>
          console.error("Failed to track final call minutes:", err),
        );

        // Refresh usage data after tracking
        setTimeout(() => {
          refreshUsage().catch((err) =>
            console.error("Failed to refresh usage after call:", err),
          );
        }, 1000); // Small delay to ensure backend processing completes
      }

      // Reset state
      setShowLowTimeWarning(false);
      setLastTrackedMinute(0);
    } catch (error) {
      console.error("Failed to end voice conversation:", error);
    }
  };

  const handleBack = () => {
    router.push(`/expert/${slug}`);
  };

  const handleGoToChat = () => {
    router.push(`/expert/${slug}/chat`);
  };

  const handleLogout = () => {
    dispatch(logout());
  };



  const formatCallDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCallDurationWithText = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Real-time usage tracking function
  const trackRealTimeUsage = async () => {
    if (!isAuthenticated || !expert?.id || callDuration === 0) return;

    const currentMinutes = Math.ceil(callDuration / 60);

    // Only track if we've crossed into a new minute
    if (currentMinutes > lastTrackedMinute) {
      const minutesToTrack = currentMinutes - lastTrackedMinute;

      console.log(`📊 Real-time tracking: ${minutesToTrack} minute(s) (total: ${currentMinutes}, last tracked: ${lastTrackedMinute})`);

      try {
        await trackUsage({
          expert_id: expert.id,
          event_type: "minutes_used",
          quantity: minutesToTrack,
        });

        setLastTrackedMinute(currentMinutes);

        // Refresh usage data to get updated limits
        await refreshUsage();

        // Check if user is running low on time (1 minute remaining)
        const remainingUsage = getRemainingUsage();
        console.log(`📊 After tracking - remaining minutes: ${remainingUsage.minutes}`);

        if (remainingUsage.minutes !== null && remainingUsage.minutes <= 1 && remainingUsage.minutes > 0) {
          if (!showLowTimeWarning) {
            setShowLowTimeWarning(true);
            console.log(`⚠️ Low time warning: ${remainingUsage.minutes} minute(s) remaining`);
          }
        }

        // If no minutes remaining, end the call gracefully
        if (remainingUsage.minutes !== null && remainingUsage.minutes <= 0) {
          console.log(`🚫 No minutes remaining - ending call gracefully`);
          await handleEndCall();
          setShowLimitReachedModal(true);
        }

      } catch (error) {
        console.error("Failed to track real-time usage:", error);
      }
    }
  };

  // Check usage every 10 seconds during calls (more frequent checking)
  useEffect(() => {
    if (state.isConnected && callDuration > 0) {
      const checkInterval = setInterval(() => {
        // Check remaining time every 10 seconds
        const remainingUsage = getRemainingUsage();
        console.log(`🔍 Usage check: ${remainingUsage.minutes} minutes remaining`);

        // Show warning when 1 minute left
        if (remainingUsage.minutes !== null && remainingUsage.minutes <= 1 && remainingUsage.minutes > 0) {
          if (!showLowTimeWarning) {
            setShowLowTimeWarning(true);
            console.log(`⚠️ Low time warning triggered: ${remainingUsage.minutes} minute(s) remaining`);
          }
        }

        // End call when 0 minutes
        if (remainingUsage.minutes !== null && remainingUsage.minutes <= 0) {
          console.log(`🚫 No minutes remaining - ending call immediately`);
          handleEndCall();
          setShowLimitReachedModal(true);
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(checkInterval);
    }
  }, [state.isConnected, callDuration, showLowTimeWarning, getRemainingUsage, handleEndCall]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (usageTrackingInterval) {
        clearInterval(usageTrackingInterval);
      }
    };
  }, [timerInterval, usageTrackingInterval]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading expert...
          </h2>
          <p className="text-gray-500">
            Please wait while we establish the connection
          </p>
        </div>
      </div>
    );
  }

  if (error && !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Expert Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "The expert you are looking for is not available."}
          </p>
          <Button onClick={() => router.push("/experts")}>
            Browse All Experts
          </Button>
        </div>
      </div>
    );
  }

  // Show loading screen while validating payment
  if (paymentSessionValid === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating access...</p>
        </div>
      </div>
    );
  }

  // Show payment required screen if payment session is invalid
  if (paymentSessionValid === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please complete payment to access this call
          </p>
          <Button onClick={() => router.push(`/expert/${slug}`)}>
            Go to Payment
          </Button>
        </div>
      </div>
    );
  }

  // Apply theme colors
  const primaryColor = publication?.primary_color || "#3B82F6";
  const secondaryColor = publication?.secondary_color || "#1E40AF";

  return (
    <div
      className="h-full bg-white overflow-y-auto"
      style={{
        backgroundImage: publication?.banner_url
          ? `url(${convertS3UrlToProxy(publication.banner_url)})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay for better text readability */}
      {publication?.banner_url && (
        <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none"></div>
      )}
      <div className="relative">
        {/* Header */}
        <div
          className={`${publication?.banner_url ? "bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-lg" : "border-b border-gray-200"}`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                <button
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-900 flex-shrink-0"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {expert?.avatar_url ? (
                    <img
                      src={expert.avatar_url}
                      alt={expert.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : null}
                  <span className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                    {expert?.name}
                  </span>
                </div>
              </div>

              {/* User Profile / Login */}
              <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
                {/* Chat Button */}
                <Button
                  onClick={handleGoToChat}
                  size="sm"
                  className="hidden sm:flex items-center justify-center w-9 h-9 bg-black hover:bg-gray-800 text-white border-0 shadow-sm mr-2 rounded-full"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>

                {/* Mobile Chat Button */}
                <Button
                  onClick={handleGoToChat}
                  size="sm"
                  className="sm:hidden flex items-center justify-center w-8 h-8 bg-black hover:bg-gray-800 text-white border-0 shadow-sm mr-1 rounded-full"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
                {isAuthenticated && user ? (
                  <div className="flex items-center space-x-1 sm:space-x-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {/* Mobile: Show only avatar */}
                    <div className="sm:hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                          className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                          alt={user.username}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    {/* Desktop: Show full profile */}
                    <div className="hidden sm:block">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          alt={user.username}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 hidden sm:flex"
                      style={{
                        borderColor: primaryColor,
                        color: primaryColor,
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                    {/* Mobile logout - icon only */}
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="sm:hidden w-8 h-8 p-0 text-gray-600 hover:text-gray-900"
                      style={{
                        borderColor: primaryColor,
                        color: primaryColor,
                      }}
                    >
                      <LogOut className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => router.push("/auth/login")}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    style={{
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Status Bar - only show for authenticated users with plan limitations */}
        {isAuthenticated && currentPlan && !limitStatus.isUnlimited && (
          <div
            className="px-4 py-2"
            style={{
              background: publication?.banner_url
                ? "rgba(249, 250, 251, 0.8)"
                : `linear-gradient(135deg, rgba(249, 250, 251, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)`,
              backdropFilter: "blur(10px)",
              borderBottom: `1px solid ${primaryColor}15`,
            }}
          >
            <div className="container mx-auto">
              <UsageStatusBar
                limitStatus={limitStatus}
                currentPlan={currentPlan}
                loading={planLoading}
                compact={true}
                expertSlug={slug}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div
            className={`max-w-2xl mx-auto text-center ${publication?.banner_url ? "bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-8" : ""}`}
          >
            {/* Call Timer at Top */}
            {state.isConnected && (
              <div className="mb-12">
                <div className="inline-flex flex-col items-center space-y-2">
                  <div className="inline-flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="text-2xl font-mono font-bold text-gray-800">
                      {formatCallDuration(callDuration)}
                    </span>
                  </div>
                  {/* Low Time Warning */}
                  {showLowTimeWarning && (
                    <div className="mt-2 px-3 py-1 bg-orange-100 border border-orange-300 rounded-full">
                      <span className="text-xs font-medium text-orange-800">
                        ⚠️ Low on time - call will end soon
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expert Avatar - Large with thin ring */}
            <div className="mb-8 relative inline-flex items-center justify-center">
              <style jsx>{`
                @keyframes rotate {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(360deg);
                  }
                }
                .rotating-ring {
                  animation: rotate 2s linear infinite;
                }
                @keyframes pulse-glow {
                  0%,
                  100% {
                    opacity: 0.3;
                    transform: scale(1);
                  }
                  50% {
                    opacity: 0.6;
                    transform: scale(1.05);
                  }
                }
                .pulse-glow {
                  animation: pulse-glow 2s ease-in-out infinite;
                }
                @keyframes vibrate-ripple {
                  0% {
                    transform: scale(1);
                    opacity: 0.6;
                  }
                  25% {
                    transform: scale(1.08);
                    opacity: 0.45;
                  }
                  50% {
                    transform: scale(1.16);
                    opacity: 0.3;
                  }
                  75% {
                    transform: scale(1.24);
                    opacity: 0.15;
                  }
                  100% {
                    transform: scale(1.32);
                    opacity: 0;
                  }
                }
                .vibrate-ripple {
                  animation: vibrate-ripple 1.5s ease-out infinite;
                }
              `}</style>

              {/* Thin rotating ring when thinking/listening */}
              {state.isConnected && !state.isSpeaking && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <svg
                    className="w-60 h-60 rotating-ring"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="#FF6B35"
                      strokeWidth="1.5"
                      strokeDasharray="75 225"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                  </svg>
                </div>
              )}

              {/* Vibrating ripple rings when AI is talking */}
              {state.isConnected && state.isSpeaking && (
                <>
                  {/* Ripple 1 */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple">
                    <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                  </div>

                  {/* Ripple 2 */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                  </div>

                  {/* Ripple 3 */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple"
                    style={{ animationDelay: "0.6s" }}
                  >
                    <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                  </div>

                  {/* Outer pulsing glow */}
                  <div className="absolute inset-0 flex items-center justify-center pulse-glow pointer-events-none">
                    <div className="w-72 h-72 rounded-full bg-orange-400 blur-2xl opacity-20"></div>
                  </div>

                  {/* Middle pulsing glow */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pulse-glow pointer-events-none"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="w-64 h-64 rounded-full bg-orange-400 blur-xl opacity-25"></div>
                  </div>
                </>
              )}

              {expert?.avatar_url ? (
                <img
                  src={expert.avatar_url}
                  alt={expert.name}
                  className="w-48 h-48 rounded-full object-cover shadow-2xl relative z-10"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <div className="w-48 h-48 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-6xl font-bold shadow-2xl relative z-10">
                  {expert?.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Expert Name */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {expert?.name}
            </h1>



            {/* Status Text */}
            {state.isConnected && (
              <div className="mb-8">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#FF6B35" }}
                >
                  {state.isSpeaking
                    ? "Talking"
                    : state.isListening
                      ? "Thinking"
                      : "Connected"}
                  {state.isSpeaking && " 🔊"}
                  {!state.isSpeaking && state.isListening && " 💭"}
                </span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                className={`mb-6 rounded-lg p-4 ${publication?.banner_url ? "bg-red-100/80 border border-red-300/60 backdrop-blur-sm" : "bg-red-50 border border-red-200"}`}
              >
                <p
                  className={`text-sm ${publication?.banner_url ? "text-red-800" : "text-red-700"}`}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Language Selector - User Specific */}
            {!state.isConnected && (
              <div className="mb-8 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                  <Languages className="h-4 w-4" />
                  Select your conversation language
                </p>
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(lang) => {
                    setSelectedLanguage(lang);
                    localStorage.setItem("preferred_language", lang);
                  }}
                  className="w-full max-w-xs shadow-sm bg-white/50 backdrop-blur-sm"
                  disabled={state.isConnecting}
                />
              </div>
            )}

            {/* Call Button */}
            <div className="mb-6 mt-4">
              {!state.isConnected ? (
                <Button
                  onClick={handleStartCall}
                  disabled={state.isConnecting || !expert || planLoading}
                  className="bg-black hover:bg-gray-800 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : planLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Loading usage data...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Start a call
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleEndCall}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    End Call
                  </Button>

                  {/* Microphone Button with Ripple Effect */}
                  <div className="mt-8 flex justify-center">
                    <div className="relative inline-flex items-center justify-center">
                      <style jsx>{`
                        @keyframes ripple {
                          0% {
                            transform: scale(1);
                            opacity: 0.6;
                          }
                          50% {
                            transform: scale(1.3);
                            opacity: 0.3;
                          }
                          100% {
                            transform: scale(1.6);
                            opacity: 0;
                          }
                        }
                        .ripple-effect {
                          animation: ripple 1.5s ease-out infinite;
                        }
                      `}</style>

                      {/* Ripple rings when user is listening/talking */}
                      {state.isListening && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-gray-400 ripple-effect"></div>
                          <div
                            className="absolute inset-0 rounded-full bg-gray-400 ripple-effect"
                            style={{ animationDelay: "0.5s" }}
                          ></div>
                          <div
                            className="absolute inset-0 rounded-full bg-gray-400 ripple-effect"
                            style={{ animationDelay: "1s" }}
                          ></div>
                        </>
                      )}

                      {/* Microphone button */}
                      <button
                        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${state.isListening
                          ? "bg-gray-700 scale-110"
                          : "bg-gray-200 hover:bg-gray-300"
                          }`}
                      >
                        <svg
                          className={`w-6 h-6 ${state.isListening ? "text-white" : "text-gray-700"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>


            {/* Browser Compatibility Notice - Same fixed width */}
            <div >
              <div className="inline-flex items-center px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium shadow-sm">
                <svg
                  className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0"
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
                <span className="whitespace-nowrap">Best experience with Chrome or Safari</span>
              </div>
            </div>
          </div>
        </div>

        {/* Limit Reached Modal */}
        <LimitReachedModal
          isOpen={showLimitReachedModal}
          onClose={() => setShowLimitReachedModal(false)}
          limitStatus={limitStatus}
          currentPlan={currentPlan}
          featureType="call"
          expertSlug={slug}
          subscription={subscription}
        />
      </div>
    </div>
  );
};

export default ClientCallPage;
