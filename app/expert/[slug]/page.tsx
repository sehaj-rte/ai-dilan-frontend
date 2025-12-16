"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useClientAuthFlow } from "@/contexts/ClientAuthFlowContext";
import { notificationService } from "@/lib/notifications";
import AuthModal from "@/components/client/AuthModal";
import PaymentModal from "@/components/client/PaymentModal";
import PrivateExpertPaymentModal from "@/components/client/PrivateExpertPaymentModal";
import BillingButton from "@/components/billing/BillingButton";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import OptimizedImage from "@/components/ui/OptimizedImage";
import {
  MessageCircle,
  Phone,
  Star,
  Clock,
  DollarSign,
  User,
  Award,
  CheckCircle2,
  Play,
  Globe,
  Calendar,
  Eye,
  Send,
  Lock,
  LogIn,
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";

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
  tagline: string;
  description: string;
  is_private: boolean;
  category: string;
  specialty: string;
  pricing_model: string;
  price_per_session: number;
  price_per_minute: number;
  monthly_subscription_price: number;
  free_trial_minutes: number;
  primary_color: string;
  secondary_color: string;
  theme: string;
  view_count: number;
  template_category: string;
  banner_url?: string | null;
  expert_id: string;
}

interface ContentSection {
  id: string;
  section_type: string;
  title: string;
  content: string;
  display_order: number;
  is_visible: boolean;
}

interface Template {
  name: string;
  theme: string;
  color_scheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const ClientExpertPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const slug = params.slug as string;

  // Use ClientAuthFlow context
  const {
    showAuthModal,
    setShowAuthModal,
    showPaymentModal,
    setShowPaymentModal,
    handleChatOrCall,
    handleLogin,
    handleSignup,
    handleForgotPassword,
    handlePaymentSuccess: contextHandlePaymentSuccess,
    currentUser,
    setCurrentUser,
  } = useClientAuthFlow();

  // Derived auth state

  const isAuthenticated = !!currentUser;
  const user = currentUser;
  const isSuperAdmin = user?.role === "super_admin";

  // State to track if we should show signup form initially
  const [showSignupInitially, setShowSignupInitially] = useState(false);

  const [expert, setExpert] = useState<Expert | null>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [selectedSessionType, setSelectedSessionType] = useState<
    "chat" | "call"
  >("chat");
  const [showPrivatePaymentModal, setShowPrivatePaymentModal] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [isExpertOwner, setIsExpertOwner] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
  const [paymentSuccessShown, setPaymentSuccessShown] = useState(false);

  // Cleanup effect to prevent modal from persisting across route changes
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      setShowPaymentSuccess(false);
      setPaymentSuccessMessage('');
      setPaymentSuccessShown(false);
    };
  }, []);

  // Custom payment success handler that doesn't auto-redirect
  const handleCustomPaymentSuccess = (sessionId: string) => {
    setShowPaymentModal(false);
    // Show success modal immediately without auto-redirect
    setPaymentSuccessMessage(`Payment successful! A detailed invoice has been sent to your email address.`);
    setShowPaymentSuccess(true);
    setPaymentSuccessShown(true);

    // Update subscription status in background
    if (expert?.id) {
      checkUserSubscription();
    }
  };

  // Custom private payment success handler
  const handlePrivatePaymentSuccess = (sessionId: string) => {
    setShowPrivatePaymentModal(false);
    // Show success modal immediately without auto-redirect
    setPaymentSuccessMessage(`Payment successful! A detailed invoice has been sent to your email address.`);
    setShowPaymentSuccess(true);
    setPaymentSuccessShown(true);

    // Update subscription status in background
    if (expert?.id) {
      checkUserSubscription();
    }
  };

  const convertS3UrlToProxy = (s3Url: string, thumbnail: boolean = false, size: number = 128): string => {
    if (!s3Url) return s3Url;
    const match = s3Url.match(
      /https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/,
    );
    if (match) {
      if (thumbnail) {
        return `${API_URL}/images/avatar/thumbnail/${match[1]}?size=${size}&quality=90`;
      }
      return `${API_URL}/images/avatar/full/${match[1]}`;
    }
    return s3Url;
  };

  useEffect(() => {
    console.log("slug", slug);
    // Reset payment success state when slug changes
    setPaymentSuccessShown(false);
    setShowPaymentSuccess(false);
    setPaymentSuccessMessage('');
    fetchExpertData();


  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && publication?.is_private && expert?.id) {
      console.log("🔄 Authentication or expert changed, checking subscription");
      checkUserSubscription();
    }
  }, [isAuthenticated, publication?.is_private, expert?.id]);

  // Handle payment success from Stripe redirect
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const sessionId = searchParams.get("session_id");

    if (paymentSuccess === "true" && sessionId) {
      // Check if we've already shown this payment success for this session
      const sessionKey = `payment_success_shown_${sessionId}`;
      const alreadyShown = sessionStorage.getItem(sessionKey);

      if (!alreadyShown) {
        // Show success modal
        setPaymentSuccessMessage(`Payment successful! A detailed invoice has been sent to your email address.`);
        setShowPaymentSuccess(true);
        setPaymentSuccessShown(true);

        // Mark in sessionStorage to prevent future shows
        sessionStorage.setItem(sessionKey, 'true');

        // Clear URL parameters after showing modal
        setTimeout(() => {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }, 2000);

        // Validate session in background if authenticated
        if (isAuthenticated) {
          validatePaymentSession(sessionId);
        }
      }
    }
  }, [searchParams, isAuthenticated]);

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
            ? convertS3UrlToProxy(data.expert.avatar_url, true, 128)
            : null,
        });
        setPublication(data.publication);
        setContentSections(data.content_sections || []);
        setTemplate(data.template);
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

  const validatePaymentSession = async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem("dilan_ai_token");
      let databaseSessionId = sessionId;

      // Check if this is a Stripe checkout session ID (starts with 'cs_')
      if (sessionId.startsWith("cs_")) {
        // Convert Stripe session ID to database session ID
        const conversionResponse = await fetch(
          `${API_URL}/payments/stripe-session/${sessionId}/database-session`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const conversionData = await conversionResponse.json();

        if (conversionData.success) {
          databaseSessionId = conversionData.database_session_id;
        } else {
          console.error("Failed to convert Stripe session ID:", conversionData);
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
        // Payment success - registration notification already includes payment success and voice setup
        try {
          // Registration notification with voice setup is sent during account creation
        } catch (error) {
          // Don't block the user flow if notification fails
          console.warn("Failed to send payment success notification:", error);
        }

        // Show payment success message
        setPaymentSuccessMessage(`Thank you for your payment! A detailed invoice has been sent to ${currentUser?.email || 'your email address'}.`);
        setShowPaymentSuccess(true);

        // Payment successful, check/update subscription status
        if (expert?.id) {
          checkUserSubscription();
        }
      }
    } catch (error) {
      console.error("Error validating payment session:", error);
    }
  };

  const checkUserSubscription = async () => {
    if (!expert?.id || !isAuthenticated) {
      console.log("⏭️ Skipping subscription check:", {
        expertId: expert?.id,
        isAuthenticated,
      });
      return;
    }

    // Check if user is super_admin - automatically has subscription access
    if (user?.role === "super_admin") {
      console.log("👑 Super admin detected, granting subscription access");
      setHasActiveSubscription(true);
      setCheckingSubscription(false);
      return;
    }

    // Check if user is the expert owner - automatically has subscription access
    if (!isExpertOwner) {
      try {
        const ownershipResponse = await fetch(
          `${API_URL}/experts/check-ownership/${expert.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
            },
          },
        );
        const ownershipData = await ownershipResponse.json();

        if (ownershipData.success && ownershipData.is_owner) {
          setIsExpertOwner(true);
          console.log("👤 Expert owner detected, granting subscription access");
          setHasActiveSubscription(true);
          setCheckingSubscription(false);
          return;
        }
      } catch (error) {
        console.error(
          "❌ Error checking expert ownership in subscription check:",
          error,
        );
      }
    } else {
      console.log("👤 Expert owner (cached), granting subscription access");
      setHasActiveSubscription(true);
      setCheckingSubscription(false);
      return;
    }

    console.log("🔄 Starting subscription check for expert:", expert.id);

    try {
      setCheckingSubscription(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/check-expert/${expert.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
          },
        },
      );
      const data = await response.json();

      console.log("📊 Subscription check response:", data);

      if (data.success) {
        setHasActiveSubscription(data.has_subscription);
        console.log("✅ Subscription status updated:", data.has_subscription);

        // If subscription was just activated, close payment modal but don't auto-redirect
        if (
          data.has_subscription &&
          (showPrivatePaymentModal ||
            searchParams.get("payment_success") === "true")
        ) {
          console.log("🎉 Subscription activated");
          // Close payment modal if open
          if (showPrivatePaymentModal) {
            setShowPrivatePaymentModal(false);
          }
          // Don't auto-redirect - let user choose via success modal
        }
      }
    } catch (error) {
      console.error("❌ Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleStartChat = () => {
    console.log("💬 Chat button clicked");
    setSelectedSessionType("chat");
    handleSessionStart("chat");
  };

  const handleStartCall = () => {
    console.log("📞 Call button clicked");
    setSelectedSessionType("call");
    handleSessionStart("call");
  };

  const handleSessionStart = async (sessionType: "chat" | "call") => {
    console.log("🚀 handleSessionStart called:", {
      sessionType,
      isPrivate: publication?.is_private,
      isAuthenticated,
      hasActiveSubscription,
      expertId: expert?.id,
      userRole: user?.role,
    });

    // Check if user is super_admin - bypass all payment checks
    if (user?.role === "super_admin") {
      console.log("👑 Super admin detected, bypassing all payment checks");
      if (sessionType === "chat") {
        console.log("➡️ Super admin redirecting to chat page");
        router.push(`/expert/${slug}/chat`);
      } else {
        console.log("➡️ Super admin redirecting to call page");
        router.push(`/expert/${slug}/call`);
      }
      return;
    }

    // Check if user is the expert owner - bypass payment checks
    if (isAuthenticated && expert?.id && !isExpertOwner) {
      try {
        const response = await fetch(
          `${API_URL}/experts/check-ownership/${expert.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
            },
          },
        );
        const data = await response.json();

        if (data.success && data.is_owner) {
          setIsExpertOwner(true);
          console.log("👤 Expert owner detected, bypassing payment checks");
          if (sessionType === "chat") {
            console.log("➡️ Expert owner redirecting to chat page");
            router.push(`/expert/${slug}/chat`);
          } else {
            console.log("➡️ Expert owner redirecting to call page");
            router.push(`/expert/${slug}/call`);
          }
          return;
        }
      } catch (error) {
        console.error("❌ Error checking expert ownership:", error);
      }
    } else if (isExpertOwner) {
      console.log("👤 Expert owner (cached), bypassing payment checks");
      if (sessionType === "chat") {
        console.log("➡️ Expert owner redirecting to chat page");
        router.push(`/expert/${slug}/chat`);
      } else {
        console.log("➡️ Expert owner redirecting to call page");
        router.push(`/expert/${slug}/call`);
      }
      return;
    }

    // If expert is private, check authentication and subscription
    if (publication?.is_private) {
      console.log("🔒 Private publication detected");

      if (!isAuthenticated) {
        console.log("❌ User not authenticated, showing auth modal");
        setShowAuthModal(true);
        return;
      }

      console.log("✅ User authenticated, checking subscription...", {
        hasActiveSubscription,
        checkingSubscription,
      });

      // Always check subscription status for private experts to ensure we have the latest state
      if (!hasActiveSubscription || checkingSubscription) {
        console.log("🔄 Checking subscription status...");
        setCheckingSubscription(true);

        try {
          const response = await fetch(
            `${API_URL}/payments/subscriptions/check-expert/${expert?.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
              },
            },
          );
          const data = await response.json();

          console.log("📊 Subscription check result:", data);

          if (data.success && data.has_subscription) {
            console.log("✅ Active subscription found, proceeding to redirect");
            // User has active subscription, proceed directly
            setHasActiveSubscription(true);
            setCheckingSubscription(false);

            // Add small delay to ensure state updates
            setTimeout(() => {
              if (sessionType === "chat") {
                console.log("🔄 Redirecting to chat...");
                router.push(`/expert/${slug}/chat`);
              } else {
                console.log("🔄 Redirecting to call...");
                router.push(`/expert/${slug}/call`);
              }
            }, 100);
            return;
          } else {
            console.log("❌ No active subscription, showing payment modal");
            // No active subscription, show payment modal
            setCheckingSubscription(false);
            setShowPrivatePaymentModal(true);
            return;
          }
        } catch (error) {
          console.error("❌ Error checking subscription:", error);
          setCheckingSubscription(false);
          // Fallback to showing payment modal
          setShowPrivatePaymentModal(true);
          return;
        }
      } else {
        console.log("✅ Has active subscription, proceeding directly");
      }
    }

    // If public expert or user has subscription, proceed directly
    console.log(
      "🔄 Proceeding to redirect (public expert or has subscription)",
    );
    if (sessionType === "chat") {
      console.log("➡️ Redirecting to chat page");
      router.push(`/expert/${slug}/chat`);
    } else {
      console.log("➡️ Redirecting to call page");
      router.push(`/expert/${slug}/call`);
    }
  };





  // Remove duplicate functions - using the ones defined above

  const getUserToken = () => {
    return localStorage.getItem("dilan_ai_token");
  };

  const handleQuestionSubmit = () => {
    // Redirect to chat page with the question as URL parameter
    if (questionText.trim()) {
      router.push(
        `/expert/${slug}/chat?q=${encodeURIComponent(questionText.trim())}`,
      );
    } else {
      router.push(`/expert/${slug}/chat`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuestionSubmit();
    }
  };

  const getPricingDisplay = () => {
    if (!publication) return "";

    switch (publication.pricing_model) {
      case "per_session":
        return `£${publication.price_per_session}/session`;
      case "per_minute":
        return `£${publication.price_per_minute}/minute`;
      case "subscription":
        return `£${publication.monthly_subscription_price}/month`;
      default:
        return "Contact for pricing";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !expert || !publication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Expert Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "The expert you are looking for is not available."}
          </p>
          <Button onClick={() => router.push("/expert/dashboard")}>
            Browse All Experts
          </Button>
        </div>
      </div>
    );
  }

  // Apply template colors
  const primaryColor = publication.primary_color || "#3B82F6";
  const secondaryColor = publication.secondary_color || "#1E40AF";

  // Remove authentication check - page should be public
  // Authentication only happens when user clicks Chat or Call buttons

  return (
    <div
      className="min-h-screen bg-white pb-16"
      style={{
        backgroundImage: publication?.banner_url
          ? `url(${convertS3UrlToProxy(publication.banner_url, true, 1200)})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay for better text readability */}
      {publication?.banner_url && (
        <div className="absolute inset-0 pointer-events-none"></div>
      )}
      <div className="relative">
        {/* Enhanced Header with backdrop blur */}
        <div
          className={`${publication?.banner_url ? "bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-lg" : "border-b border-gray-200"}`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1
                  className={`text-xl font-bold ${publication?.banner_url ? "text-gray-900" : "text-gray-900"}`}
                >
                  {publication?.display_name || expert?.name || "Expert"}
                </h1>
              </div>



              {/* User Info & Actions */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.email}
                    </p>
                  </div>



                  {/* Billing Button - Hide for super_admins */}
                  {user.role !== "super_admin" && (
                    <BillingButton
                      userToken={
                        typeof window !== "undefined"
                          ? localStorage.getItem("dilan_ai_token") || undefined
                          : ""
                      }
                      variant="outline"
                      size="sm"
                      expertSlug={slug} // Pass the expert slug
                      primaryColor={primaryColor}
                    />
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear context state
                      setCurrentUser(null);
                      // Clear Redux state
                      dispatch(logout());
                      // Clear localStorage
                      localStorage.removeItem("dilan_ai_token");
                      localStorage.removeItem("dilan_ai_user");
                      // Redirect
                      router.push(`/expert/${slug}`);
                    }}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSignupInitially(false);
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="container mx-auto px-4 py-16">
        <div
          className={`max-w-2xl mx-auto text-center ${publication?.banner_url ? "bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-8" : ""}`}
        >
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
          <h1
            className={`text-3xl font-bold mb-2 ${publication?.banner_url ? "text-gray-900" : "text-gray-900"}`}
          >
            {expert.name}
          </h1>

          {/* Headline/Slug */}
          {expert.headline && (
            <p
              className={`text-sm mb-8 ${publication?.banner_url ? "text-gray-600" : "text-gray-500"}`}
            >
              /{expert.headline}/
            </p>
          )}

          {/* CTA Buttons and Browser Notice - Horizontally Aligned */}
          <div className="flex flex-col items-center gap-4 mb-6">
            {/* CTA Buttons - Increased gap to align with browser notice width */}
            <div className="flex justify-center gap-16">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2"
                style={{ borderColor: primaryColor, color: primaryColor }}
                onClick={handleStartChat}
                disabled={checkingSubscription}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Chat
              </Button>
              <Button
                size="lg"
                className="text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                style={{ backgroundColor: primaryColor }}
                onClick={handleStartCall}
                disabled={checkingSubscription}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            </div>

            {/* Browser Compatibility Notice - Aligned with button spacing */}
            <div
              className="border rounded-full px-4 py-2 shadow-sm"
              style={{
                borderColor: primaryColor + '40',
                backgroundColor: primaryColor + '10',
                color: primaryColor
              }}
            >
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-medium">
                  Best experience with Chrome or Safari
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div
            className={`pt-4 ${publication?.banner_url ? "border-t border-gray-300/50" : "border-t border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold flex items-center ${publication?.banner_url ? "text-gray-900" : "text-gray-900"}`}
              >
                <span className="mr-2">≡</span>
                Description
              </h2>
            </div>
            <div
              className={`text-left leading-relaxed space-y-4 ${publication?.banner_url ? "text-gray-800" : "text-gray-700"}`}
            >
              {(() => {
                const description =
                  publication?.description ||
                  expert?.description ||
                  "No description available.";
                const charLimit = 200;
                const shouldTruncate = description.length > charLimit;

                return (
                  <>
                    <p>
                      {shouldTruncate && !showFullDescription
                        ? `${description.substring(0, charLimit)}...`
                        : description}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() =>
                          setShowFullDescription(!showFullDescription)
                        }
                        className={`text-sm font-medium transition-colors ${publication?.banner_url
                            ? "text-gray-600 hover:text-gray-900 bg-gray-100/50 hover:bg-gray-200/50 px-3 py-1 rounded-full"
                            : "text-gray-500 hover:text-gray-700"
                          }`}
                      >
                        {showFullDescription ? "View less ~" : "View more ~"}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                {paymentSuccessMessage || "Payment successful! A detailed invoice has been sent to your email address."}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4 mb-4">
                <Shield className="w-4 h-4" />
                <span>Secure and encrypted</span>
              </div>
              <Button
                onClick={() => {
                  console.log("🔍 Continue button clicked");
                  setShowPaymentSuccess(false);
                  setPaymentSuccessMessage('');
                }}
                className="text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Backup Dialog Modal */}
      <Dialog 
        open={showPaymentSuccess} 
        onOpenChange={(open) => {
          setShowPaymentSuccess(open);
          if (!open) {
            setPaymentSuccessMessage('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful! 
            </h2>
            <p className="text-gray-600 mb-4">
              {paymentSuccessMessage || "Payment successful! A detailed invoice has been sent to your email address."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
              <Shield className="w-4 h-4" />
              <span>Secure and encrypted</span>
            </div>
            <Button
              onClick={() => {
                setShowPaymentSuccess(false);
                setPaymentSuccessMessage('');
              }}
              className="mt-4 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setShowSignupInitially(false);
        }}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onForgotPassword={handleForgotPassword}
        sessionType={selectedSessionType}
        expertName={publication?.display_name || expert?.name}
        showSignupInitially={showSignupInitially}
        onRequestSubscription={() => setShowPrivatePaymentModal(true)}
        canSubscribe={Boolean(publication?.is_private)}
      />

      {/* Payment Modal - Hide for super_admins and expert owners */}
      {publication && user?.role !== "super_admin" && !isExpertOwner && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          publication={publication}
          sessionType={selectedSessionType}
          onPaymentSuccess={handleCustomPaymentSuccess}
          userToken={
            typeof window !== "undefined"
              ? localStorage.getItem("dilan_ai_token") || undefined
              : undefined
          }
        />
      )}

      {/* Private Expert Payment Modal - Hide for super_admins and expert owners */}
      {publication?.is_private && !isSuperAdmin && !isExpertOwner && (
        <PrivateExpertPaymentModal
          isOpen={showPrivatePaymentModal}
          onClose={() => setShowPrivatePaymentModal(false)}
          publication={publication}
          sessionType={selectedSessionType}
          onPaymentSuccess={handlePrivatePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ClientExpertPage;
