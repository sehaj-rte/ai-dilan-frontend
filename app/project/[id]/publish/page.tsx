"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useSlugValidation } from "@/hooks/useSlugValidation";
import {
  Globe,
  Lock,
  Eye,
  CheckCircle,
  Radio,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Plus,
  X,
  ImageIcon,
  Upload,
  Trash2,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import OptimizedImage from "@/components/ui/OptimizedImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
interface Publication {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  description: string;
  is_published: boolean;
  is_private: boolean;
  pricing_model: string;
  price_per_session: number;
  price_per_minute: number;
  monthly_subscription_price: number;
  free_trial_minutes: number;
  banner_url: string | null;
  primary_color: string | null;
}

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

const PublishManagerPage = () => {
  const params = useParams();
  const projectId = params.id as string;
  const { toasts, removeToast, success, error, warning, info } = useToast();
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);

  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingTrial, setIsUpdatingTrial] = useState(false);
  const [expert, setExpert] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Local state for trial configuration to enable immediate UI updates
  const [localTrialConfig, setLocalTrialConfig] = useState({
    coupon: "",
    message_limit: 0,
    minute_limit: 0
  });

  // Background image upload state
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<
    string | null
  >(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Publish form state
  const [publishForm, setPublishForm] = useState({
    slug: "",
    is_published: false,
    is_private: false, // Requires authentication
    banner_url: null as string | null,
    primary_color: "#3B82F6" as string,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    planId: "",
    planName: "",
  });

  // Preview state
  const [showExpandedPreview, setShowExpandedPreview] = useState(false);

  function ConfirmDeleteDialog({
    open,
    onClose,
    onConfirm,
    title = "Confirm Deletion",
    description = "Are you sure you want to delete this item?",
    loading = false,
  }: ConfirmDeleteDialogProps) {
    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Slug validation
  const {
    validateSlug,
    isChecking: isCheckingSlug,
    validationResult,
    getValidationStatus,
    getStatusMessage,
    getStatusColor,
  } = useSlugValidation({ expertId: projectId });

  // Pricing plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState({
    name: "",
    price: "",
    messageLimit: "", // New field for message limit
    minuteLimit: "", // New field for minute limit
    billingInterval: "month", // New field for billing interval
    billingIntervalCount: 1, // New field for billing interval count
    freeTrialEnabled: false, // New field for trial toggle
    trialCoupon: "", // New field for trial coupon
    trialMessageLimit: "", // New field for trial message limit
    trialMinuteLimit: "", // New field for trial minute limit
  });

  // Helper function to convert S3 URL to proxy URL
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

  // Compact Preview Component
  const CompactPreview = () => {
    const displayName = expert?.name || publishForm.slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) || "Your Expert";
    const tagline = "Ask a question by typing or speaking - answers are evidence-led";
    const avatarUrl = expert?.avatar_url ? convertS3UrlToProxy(expert.avatar_url) : null;
    const bannerUrl = publishForm.banner_url ? convertS3UrlToProxy(publishForm.banner_url) : null;
    const primaryColor = publishForm.primary_color || "#3B82F6";

    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <OptimizedImage
            src={avatarUrl}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover shadow-sm"
            fallbackClassName="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-sm"
            fallbackIcon={<User className="w-6 h-6 text-gray-600" />}
          />
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {tagline}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {/* Mini buttons */}
              <div 
                className="px-2 py-1 rounded-full text-xs font-medium border"
                style={{ borderColor: primaryColor + '60', color: primaryColor }}
              >
                Type
              </div>
              <div 
                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Speak
              </div>
              {bannerUrl && (
                <div className="w-4 h-4 rounded border border-gray-300 overflow-hidden">
                  <img src={bannerUrl} alt="Background" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <div className="flex flex-col items-center text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExpandedPreview(true)}
            className="flex items-center gap-2 text-xs mb-1"
          >
            <Eye className="h-3 w-3" />
            Expert Preview
          </Button>
          <p className="text-xs text-gray-500">
            How your expert will appear to end users
          </p>
        </div>
      </div>
    );
  };

  // Full Preview Component (Modal)
  const ExpandedPreview = () => {
    const displayName = expert?.name || publishForm.slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) || "Your Expert";
    const tagline = "Ask a question by typing or speaking - answers are evidence-led";
    const headline = expert?.headline || "No headline available.";
    const avatarUrl = expert?.avatar_url ? convertS3UrlToProxy(expert.avatar_url) : null;
    const bannerUrl = publishForm.banner_url ? convertS3UrlToProxy(publishForm.banner_url) : null;
    const primaryColor = publishForm.primary_color || "#3B82F6";

    return (
      <Dialog open={showExpandedPreview} onOpenChange={setShowExpandedPreview}>
        <DialogContent className="max-w-4xl h-[85vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-4 w-4" />
              Expert Preview
            </DialogTitle>
            <DialogDescription className="text-sm">
              Full page preview - exactly how your expert will appear to end users
            </DialogDescription>
          </DialogHeader>
          
          {/* Compact Full Page Preview - No scrollbar */}
          <div className="h-full">
            <div 
              className="h-full bg-white relative"
              style={{
                backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                height: "calc(85vh - 80px)",
              }}
            >
              {/* Overlay for better text readability */}
              {bannerUrl && (
                <div className="absolute inset-0 pointer-events-none"></div>
              )}
              
              <div className="relative h-full flex flex-col">
                {/* Compact Header */}
                <div
                  className={`${bannerUrl ? "bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-lg" : "border-b border-gray-200"} flex-shrink-0`}
                >
                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <h1
                        className={`text-lg font-bold ${bannerUrl ? "text-gray-900" : "text-gray-900"}`}
                      >
                        {displayName}
                      </h1>
                      
                      {/* Compact user info */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">user@example.com</span>
                        <button
                          className="px-2 py-1 text-xs border rounded"
                          style={{
                            borderColor: primaryColor,
                            color: primaryColor,
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content - Flex grow to fill space */}
                <div className="flex-1 flex items-center justify-center px-4 py-6">
                  <div
                    className={`w-full max-w-lg text-center ${bannerUrl ? "bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6" : "p-6"}`}
                  >
                    {/* Expert Avatar - Optimized size */}
                    <div className="mb-4 flex justify-center">
                      <OptimizedImage
                        src={avatarUrl}
                        alt={displayName}
                        className="w-24 h-24 rounded-full object-cover shadow-lg"
                        fallbackClassName="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-lg"
                        fallbackIcon={
                          <span className="text-gray-600 text-2xl font-bold">
                            {displayName.charAt(0)}
                          </span>
                        }
                      />
                    </div>

                    {/* Expert Name - Optimized size */}
                    <h1
                      className={`text-2xl font-bold mb-1 ${bannerUrl ? "text-gray-900" : "text-gray-900"}`}
                    >
                      {displayName}
                    </h1>

                    {/* Tagline - Compact */}
                    <p
                      className={`text-sm mb-6 ${bannerUrl ? "text-gray-600" : "text-gray-500"}`}
                    >
                      {tagline}
                    </p>

                    {/* CTA Buttons - Compact but full-featured */}
                    <div className="flex flex-col items-center gap-3 mb-4">
                      {/* CTA Buttons - Optimized size */}
                      <div className="flex justify-center gap-3">
                        <button
                          className="px-6 py-2.5 rounded-full font-semibold shadow-lg border-2 transition-all duration-200 transform hover:scale-105"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2 inline" />
                          Type
                        </button>
                        <button
                          className="text-white px-6 py-2.5 rounded-full font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Phone className="h-4 w-4 mr-2 inline" />
                          Speak
                        </button>
                      </div>

                      {/* Browser Notice - Compact */}
                      <div
                        className="border rounded-full px-3 py-1.5 shadow-sm"
                        style={{
                          borderColor: primaryColor + '40',
                          backgroundColor: primaryColor + '10',
                          color: primaryColor
                        }}
                      >
                        <div className="flex items-center space-x-1.5">
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          <p className="text-xs font-medium">
                            Best experience with Chrome or Safari
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Description Section - Compact */}
                    <div
                      className={`pt-3 ${bannerUrl ? "border-t border-gray-300/50" : "border-t border-gray-200"}`}
                    >
                      <div className="flex items-center mb-2">
                        <h2
                          className={`text-sm font-semibold flex items-center ${bannerUrl ? "text-gray-900" : "text-gray-900"}`}
                        >
                          <span className="mr-2">≡</span>
                          Description
                        </h2>
                      </div>
                      <div
                        className={`text-left leading-relaxed ${bannerUrl ? "text-gray-800" : "text-gray-700"}`}
                      >
                        <p className="text-sm">
                          {headline.length > 150 ? `${headline.substring(0, 150)}...` : headline}
                        </p>
                        {headline.length > 150 && (
                          <button
                            className={`text-sm font-medium transition-colors mt-1 ${bannerUrl
                                ? "text-gray-600 hover:text-gray-900"
                                : "text-gray-500 hover:text-gray-700"
                              }`}
                          >
                            View more ~
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Helper function to generate trial coupon code
  const generateTrialCoupon = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };



  useEffect(() => {
    fetchPublicationData();
    fetchExpertData();
    fetchPlans();
  }, [projectId]);

  // Sync local trial config with expert data
  useEffect(() => {
    if (expert) {
      setLocalTrialConfig({
        coupon: expert.free_trial_coupon || "",
        message_limit: expert.trial_message_limit || 0,
        minute_limit: expert.trial_minute_limit || 0
      });
    }
  }, [expert]);

  // Validate slug when form slug changes
  useEffect(() => {
    if (publishForm.slug && publishForm.slug.length >= 2) {
      validateSlug(publishForm.slug);
    }
  }, [publishForm.slug, validateSlug]);

  const fetchExpertData = async () => {
    try {
      const expertResponse = await fetchWithAuth(
        `${API_URL}/experts/${projectId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const expertData = await expertResponse.json();

      if (expertData.success && expertData.expert) {
        setExpert(expertData.expert);
      }
    } catch (error) {
      console.error("Error fetching expert data:", error);
    }
  };

  const fetchPublicationData = async () => {
    try {
      setLoading(true);

      // Fetch publication data using the correct endpoint
      const publicationResponse = await fetchWithAuth(
        `${API_URL}/publishing/experts/${projectId}/publication`,
        {
          headers: getAuthHeaders(),
        },
      );
      const publicationData = await publicationResponse.json();

      if (publicationData.success) {
        if (publicationData.publication) {
          setPublication(publicationData.publication);
          setPublishForm({
            slug: publicationData.publication.slug || "",
            is_published: publicationData.publication.is_published || false,
            is_private: publicationData.publication.is_private || false,
            banner_url: publicationData.publication.banner_url || null,
            primary_color:
              publicationData.publication.primary_color || "#3B82F6",
          });

          // Set background image preview if banner_url exists
          if (publicationData.publication.banner_url) {
            const proxyUrl = convertS3UrlToProxy(
              publicationData.publication.banner_url,
            );
            setBackgroundImagePreview(proxyUrl);
          }
        } else {
          // No publication exists yet
          setPublication(null);
          setPublishForm({
            slug: "",
            is_published: false,
            is_private: false,
            banner_url: null,
            primary_color: "#3B82F6",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching publication data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (published: boolean) => {
    try {
      setIsPublishing(true);

      if (published && !publication) {
        // Need to create publication first
        await createPublication();
        return;
      }

      const endpoint = published
        ? `${API_URL}/publishing/experts/${projectId}/publish`
        : `${API_URL}/publishing/experts/${projectId}/unpublish`;

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setPublishForm({ ...publishForm, is_published: published });
        success(
          `Expert ${published ? "published" : "unpublished"} successfully!`,
        );
        if (published && data.public_url) {
          console.log(`Expert is now live at: ${data.public_url}`);
        }
        fetchPublicationData(); // Refresh data
      } else {
        error(
          `Failed to ${published ? "publish" : "unpublish"} expert: ` +
            (data.detail || data.error),
        );
        // Reset toggle if failed
        setPublishForm({ ...publishForm, is_published: !published });
      }
    } catch (err) {
      console.error("Error toggling publish status:", err);
      error("Error updating publish status. Please try again.");
      // Reset toggle if failed
      setPublishForm({
        ...publishForm,
        is_published: !publishForm.is_published,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const createPublication = async () => {
    try {
      if (!publishForm.slug) {
        warning("Please enter a slug first");
        return;
      }

      // Check slug availability before creating
      if (getValidationStatus() === "unavailable") {
        error("Slug is not available. Please choose a different one.");
        return;
      }

      if (getValidationStatus() === "invalid") {
        error("Slug is invalid. Please fix the validation errors.");
        return;
      }

      if (getValidationStatus() === "checking") {
        warning("Please wait for slug validation to complete");
        return;
      }

      // Use expert data for display_name, tagline, and description, fallback to defaults
      const displayName =
        expert?.name ||
        publishForm.slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      const tagline = expert?.headline || "AI Expert Assistant";
      const description =
        expert?.description || "Professional AI assistant ready to help you.";

      // Create a basic publication with expert data
      const publicationData = {
        display_name: displayName,
        slug: publishForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        tagline: tagline,
        description: description,
        is_private: publishForm.is_private,
        banner_url: publishForm.banner_url,
        primary_color: publishForm.primary_color,
        category: "business",
        specialty: "consultant",
        template_category: "business",
        theme: "professional",
        pricing_model: "subscription",
        price_per_session: null,
        price_per_minute: null,
        monthly_subscription_price: 149.0,
        free_trial_minutes: 5,
      };

      console.log("Creating publication with data:", publicationData);

      const response = await fetchWithAuth(
        `${API_URL}/publishing/experts/${projectId}/publication`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(publicationData),
        },
      );

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        success("Publication created successfully!");

        // Auto-publish after creation
        const publishResponse = await fetchWithAuth(
          `${API_URL}/publishing/experts/${projectId}/publish`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          },
        );

        const publishData = await publishResponse.json();

        if (publishData.success) {
          success("Expert published successfully!");
        } else {
          error(
            "Publication created but failed to publish: " +
              (publishData.detail || publishData.error),
          );
        }

        fetchPublicationData();
      } else {
        const errorMsg = data.detail || data.error || "Unknown error";
        console.error("Publication creation error:", data);
        error("Failed to create publication: " + errorMsg);
      }
    } catch (err: any) {
      console.error("Error creating publication:", err);
      const errorMsg =
        err.response?.data?.detail || err.message || "Please try again";
      error("Error creating publication: " + errorMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRepublish = async () => {
    try {
      setIsPublishing(true);

      // If no publication exists, create one first
      if (!publication) {
        await createPublication();
        return;
      }

      // Check slug availability if slug has changed
      if (publishForm.slug !== publication.slug) {
        if (getValidationStatus() === "unavailable") {
          error("Slug is not available. Please choose a different one.");
          return;
        }

        if (getValidationStatus() === "invalid") {
          error("Slug is invalid. Please fix the validation errors.");
          return;
        }

        if (getValidationStatus() === "checking") {
          warning("Please wait for slug validation to complete");
          return;
        }
      }

      // Update publication with latest expert data
      const updateData: any = {
        display_name: expert?.name,
        tagline: expert?.headline,
        description: expert?.description,
        is_private: publishForm.is_private,
        banner_url: publishForm.banner_url,
        primary_color: publishForm.primary_color,
      };

      // Include slug if changed
      if (publishForm.slug && publishForm.slug !== publication.slug) {
        updateData.slug = publishForm.slug;
      }

      const response = await fetchWithAuth(
        `${API_URL}/publishing/experts/${projectId}/publication`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();

      if (data.success) {
        success("Publication updated successfully!");
        fetchPublicationData();
      } else {
        error("Failed to update publication: " + (data.detail || data.error));
      }
    } catch (err) {
      console.error("Error republishing:", err);
      error("Error republishing. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishChange = (field: string, value: any) => {
    setPublishForm({ ...publishForm, [field]: value });

    // Trigger slug validation when slug changes
    if (field === "slug" && value) {
      validateSlug(value);
    }
  };

  // Clean slug input to only allow valid characters
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow only lowercase letters, numbers, and hyphens
    const cleanedValue = rawValue
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-");
    handlePublishChange("slug", cleanedValue);
  };

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);

      // Debug: Check current user and token
      const token = localStorage.getItem("dilan_ai_token");
      const user = localStorage.getItem("dilan_ai_user");
      console.log(
        "🔍 Debug - Current token:",
        token ? token.substring(0, 20) + "..." : "No token",
      );
      console.log(
        "🔍 Debug - Current user:",
        user ? JSON.parse(user) : "No user",
      );
      console.log("🔍 Debug - Expert ID:", projectId);

      const response = await fetchWithAuth(
        `${API_URL}/plans/experts/${projectId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      console.log("🔍 Debug - Response status:", response.status);

      const data = await response.json();
      console.log("🔍 Debug - Response data:", data);

      if (data.success) {
        setPlans(data.plans || []);
      } else {
        error("Failed to fetch plans: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      error("Error fetching plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!createPlanForm.name || !createPlanForm.price) {
      warning("Please fill in all required fields");
      return;
    }

    const price = parseFloat(createPlanForm.price);
    if (isNaN(price) || price <= 0) {
      warning("Please enter a valid price");
      return;
    }

    // Validate message limit if provided
    let messageLimit = null;
    if (createPlanForm.messageLimit) {
      messageLimit = parseInt(createPlanForm.messageLimit);
      if (isNaN(messageLimit) || messageLimit <= 0) {
        warning(
          "Please enter a valid message limit or leave empty for unlimited",
        );
        return;
      }
    }

    // Validate minute limit if provided
    let minuteLimit = null;
    if (createPlanForm.minuteLimit) {
      minuteLimit = parseInt(createPlanForm.minuteLimit);
      if (isNaN(minuteLimit) || minuteLimit <= 0) {
        warning(
          "Please enter a valid minute limit or leave empty for unlimited",
        );
        return;
      }
    }

    // Validate trial configuration if enabled
    if (createPlanForm.freeTrialEnabled) {
      if (!createPlanForm.trialCoupon.trim()) {
        warning("Trial coupon code is required when trial is enabled");
        return;
      }

      if (!createPlanForm.trialMessageLimit || !createPlanForm.trialMinuteLimit) {
        warning("Trial message and minute limits are required when trial is enabled");
        return;
      }

      const trialMessageLimit = parseInt(createPlanForm.trialMessageLimit);
      const trialMinuteLimit = parseInt(createPlanForm.trialMinuteLimit);

      if (isNaN(trialMessageLimit) || trialMessageLimit <= 0) {
        warning("Please enter a valid trial message limit");
        return;
      }

      if (isNaN(trialMinuteLimit) || trialMinuteLimit <= 0) {
        warning("Please enter a valid trial minute limit");
        return;
      }
    }

    try {
      setIsCreatingPlan(true);

      const planData: any = {
        name: createPlanForm.name,
        price: price,
        currency: "GBP",
        billing_interval: createPlanForm.billingInterval,
        billing_interval_count: createPlanForm.billingIntervalCount,
      };

      // Add optional fields if provided
      if (messageLimit !== null) {
        planData.message_limit = messageLimit;
      }

      if (minuteLimit !== null) {
        planData.minute_limit = minuteLimit;
      }

      // Add trial configuration if enabled
      if (createPlanForm.freeTrialEnabled) {
        planData.free_trial_enabled = true;
        planData.trial_message_limit = parseInt(createPlanForm.trialMessageLimit);
        planData.trial_minute_limit = parseInt(createPlanForm.trialMinuteLimit);
      }

      const response = await fetchWithAuth(
        `${API_URL}/plans/experts/${projectId}`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(planData),
        },
      );

      const data = await response.json();

      if (data.success) {
        success(`Plan "${createPlanForm.name}" created successfully!`);
        setCreatePlanForm({
          name: "",
          price: "",
          messageLimit: "",
          minuteLimit: "",
          billingInterval: "month",
          billingIntervalCount: 1,
          freeTrialEnabled: false,
          trialCoupon: "",
          trialMessageLimit: "",
          trialMinuteLimit: "",
        });
        setShowCreatePlan(false);
        fetchPlans(); // Refresh plans list
      } else {
        error(`Failed to create plan: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error creating plan:", err);
      error("Error creating plan. Please try again.");
    } finally {
      setIsCreatingPlan(false);
    }
  };
  const openDeleteModal = (planId: string, planName: string) => {
    setDeleteModal({ open: true, planId, planName });
  };

  const handleDeletePlan = async () => {
    setLoading(true);
    const { planId, planName } = deleteModal;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/plans/experts/${projectId}/${planId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();

      if (data.success) {
        success(`Plan "${planName}" deleted successfully!`);
        fetchPlans();
      } else {
        error(`Failed to delete plan: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error deleting plan:", err);
      error("Error deleting plan. Please try again.");
    } finally {
      setLoading(false);
      setDeleteModal({ open: false, planId: "", planName: "" });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      success("URL copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      error("Failed to copy URL");
    }
  };

  // Background image upload handlers
  const handleBackgroundImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        error("Image must be smaller than 5MB");
        e.target.value = "";
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        error("Please select a valid image file");
        e.target.value = "";
        return;
      }

      try {
        setIsUploadingBackground(true);

        // Create FormData for upload
        const formData = new FormData();
        formData.append("file", file);

        // Upload to S3
        const uploadResponse = await fetch(
          `${API_URL}/openai-chat/upload/chat-file`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadResult = await uploadResponse.json();

        if (uploadResult.success && uploadResult.url) {
          setPublishForm((prev) => ({
            ...prev,
            banner_url: uploadResult.url,
          }));
          // Convert S3 URL to proxy URL for preview
          const proxyUrl = convertS3UrlToProxy(uploadResult.url);
          setBackgroundImagePreview(proxyUrl);
          success("Background image uploaded successfully!");
        } else {
          throw new Error(uploadResult.error || "Upload failed");
        }
      } catch (err) {
        console.error("Background upload error:", err);
        error("Failed to upload background image");
        e.target.value = "";
      } finally {
        setIsUploadingBackground(false);
      }
    }
  };

  const removeBackgroundImage = () => {
    setPublishForm((prev) => ({
      ...prev,
      banner_url: null,
    }));
    setBackgroundImagePreview(null);
    if (backgroundImageInputRef.current) {
      backgroundImageInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Publish Manager</h1>
          <p className="text-gray-600 mt-2">
            Control how your expert is published and visible to end users
          </p>
        </div>

        {/* Compact Preview Section */}
        <div className="mb-6">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Expert Preview
            </h3>
            <p className="text-sm text-gray-600">Click Expert preview to see how your expert will appear</p>
          </div>
          <CompactPreview />
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  <Globe className="h-5 w-5 mr-2 text-green-600" />
                  Publication Settings
                </CardTitle>
                <CardDescription>
                  Manage your expert's publication status and visibility
                </CardDescription>
              </div>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={handleRepublish}
                disabled={
                  !publishForm.slug ||
                  isPublishing ||
                  isCheckingSlug ||
                  getValidationStatus() === "unavailable" ||
                  getValidationStatus() === "invalid"
                }
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {publication ? "Republishing..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    {publication ? "Save Settings" : "Save Settings"}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Display name, headline, and description
                  are automatically synced from your Profile Settings. Update
                  them in the Profile Settings page.
                </p>
              </div>

              {/* Slug */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Public URL Slug *
                </Label>
                <div className="flex items-center flex-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /persona/
                  </span>
                  <div className="relative flex-1">
                    <Input
                      value={publishForm.slug}
                      onChange={handleSlugChange}
                      placeholder="your-expert-name"
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md pr-10 ${
                        getValidationStatus() === "available"
                          ? "border-green-500 focus:border-green-500"
                          : getValidationStatus() === "unavailable"
                            ? "border-red-500 focus:border-red-500"
                            : getValidationStatus() === "invalid"
                              ? "border-orange-500 focus:border-orange-500"
                              : getValidationStatus() === "error"
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-300"
                      }`}
                      required
                    />
                    {/* Status Icon */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {isCheckingSlug && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {!isCheckingSlug &&
                        getValidationStatus() === "available" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      {!isCheckingSlug &&
                        getValidationStatus() === "invalid" && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      {!isCheckingSlug &&
                        (getValidationStatus() === "unavailable" ||
                          getValidationStatus() === "error") && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                {publishForm.slug && (
                  <div
                    className={`text-xs mt-1 flex items-center ${getStatusColor()}`}
                  >
                    {getStatusMessage()}
                  </div>
                )}

                {/* URL Preview */}
                <div className="text-xs text-gray-500 mt-1">
                  {publishForm.slug && getValidationStatus() === "available" ? (
                    <div className="flex items-center gap-2">
                      <span>✅ Your public URL:</span>
                      <span className="text-blue-600 font-medium">
                        {typeof window !== "undefined"
                          ? window.location.origin
                          : "http://localhost:3000"}
                        /expert/{validationResult?.slug || publishForm.slug}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/expert/${validationResult?.slug || publishForm.slug}`,
                          )
                        }
                        className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 transition-colors"
                        title="Copy URL to clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  ) : publishForm.slug ? (
                    <div className="flex items-center gap-2">
                      <span>Preview URL:</span>
                      <span className="text-gray-400">
                        {typeof window !== "undefined"
                          ? window.location.origin
                          : "http://localhost:3000"}
                        /expert/{publishForm.slug}
                      </span>
                    </div>
                  ) : (
                    <span>
                      Enter a unique slug for your expert (only lowercase
                      letters, numbers, and hyphens)
                    </span>
                  )}
                </div>
              </div>

              {/* Visibility Radio Buttons */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Visibility
                </Label>
                <div className="space-y-3">
                  {/* Public Option */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      !publishForm.is_private
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                    onClick={() =>
                      setPublishForm({ ...publishForm, is_private: false })
                    }
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                          !publishForm.is_private
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300"
                        }`}
                      >
                        {!publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Globe
                        className={`h-5 w-5 mr-2 ${
                          !publishForm.is_private
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      />
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-medium ${
                            !publishForm.is_private
                              ? "text-green-900"
                              : "text-gray-900"
                          }`}
                        >
                          Public
                        </h4>
                        <p
                          className={`text-xs ${
                            !publishForm.is_private
                              ? "text-green-700"
                              : "text-gray-500"
                          }`}
                        >
                          Anyone can discover and access your expert
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Private Option */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      publishForm.is_private
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() =>
                      setPublishForm({ ...publishForm, is_private: true })
                    }
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                          publishForm.is_private
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Lock
                        className={`h-5 w-5 mr-2 ${
                          publishForm.is_private
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      />
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-medium ${
                            publishForm.is_private
                              ? "text-blue-900"
                              : "text-gray-900"
                          }`}
                        >
                          Private
                        </h4>
                        <p
                          className={`text-xs ${
                            publishForm.is_private
                              ? "text-blue-700"
                              : "text-gray-500"
                          }`}
                        >
                          Users must sign in to access this expert
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Image Upload */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Background Image
                </Label>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload a background image that will appear on your expert's
                    public profile and chat pages.
                  </p>

                  {backgroundImagePreview ? (
                    <div className="relative">
                      <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={backgroundImagePreview}
                          alt="Background preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeBackgroundImage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                          No background image uploaded
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={backgroundImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageSelect}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => backgroundImageInputRef.current?.click()}
                      disabled={isUploadingBackground}
                      className="flex items-center gap-2"
                    >
                      {isUploadingBackground ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isUploadingBackground ? "Uploading..." : "Upload Image"}
                    </Button>

                    {backgroundImagePreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={removeBackgroundImage}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Recommended: 1920x1080px or larger. Max file size: 5MB.
                    Supported formats: JPG, PNG, WebP
                  </p>
                </div>
              </div>

              {/* Button Color Picker */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Button Color
                </Label>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Choose a color for the Chat, Call, Billing, and other action
                    buttons on your expert pages.
                  </p>

                  <div className="space-y-4">
                    {/* Custom Color Picker */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={publishForm.primary_color}
                          onChange={(e) =>
                            setPublishForm((prev) => ({
                              ...prev,
                              primary_color: e.target.value,
                            }))
                          }
                          className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                          title="Choose button color"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            Selected Color
                          </p>
                          <p className="text-gray-600 font-mono text-xs">
                            {publishForm.primary_color}
                          </p>
                        </div>
                      </div>

                      {/* Color Preview Buttons */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-2"
                          style={{
                            borderColor: publishForm.primary_color,
                            color: publishForm.primary_color,
                          }}
                        >
                          Chat
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-2"
                          style={{
                            borderColor: publishForm.primary_color,
                            color: publishForm.primary_color,
                          }}
                        >
                          Call
                        </Button>
                      </div>
                    </div>

                    {/* Predefined Color Options */}
                    <div className="space-y-4">
                      {/* Popular Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Popular Colors
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#3B82F6", name: "Blue" },
                            { color: "#EF4444", name: "Red" },
                            { color: "#10B981", name: "Green" },
                            { color: "#F59E0B", name: "Orange" },
                            { color: "#8B5CF6", name: "Purple" },
                            { color: "#EC4899", name: "Pink" },
                            { color: "#06B6D4", name: "Cyan" },
                            { color: "#84CC16", name: "Lime" },
                            { color: "#6366F1", name: "Indigo" },
                            { color: "#F97316", name: "Amber" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Professional Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Professional
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#1E40AF", name: "Navy Blue" },
                            { color: "#B91C1C", name: "Deep Red" },
                            { color: "#059669", name: "Forest Green" },
                            { color: "#D97706", name: "Dark Orange" },
                            { color: "#7C3AED", name: "Deep Purple" },
                            { color: "#BE185D", name: "Dark Pink" },
                            { color: "#0E7490", name: "Dark Cyan" },
                            { color: "#374151", name: "Charcoal" },
                            { color: "#1F2937", name: "Dark Gray" },
                            { color: "#111827", name: "Near Black" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Vibrant Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Vibrant
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#60A5FA", name: "Sky Blue" },
                            { color: "#F87171", name: "Light Red" },
                            { color: "#34D399", name: "Mint Green" },
                            { color: "#FBBF24", name: "Yellow" },
                            { color: "#A78BFA", name: "Light Purple" },
                            { color: "#F472B6", name: "Light Pink" },
                            { color: "#22D3EE", name: "Light Cyan" },
                            { color: "#A3E635", name: "Light Lime" },
                            { color: "#818CF8", name: "Light Indigo" },
                            { color: "#FB923C", name: "Light Orange" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Pastel Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Pastel
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#BFDBFE", name: "Pastel Blue" },
                            { color: "#FECACA", name: "Pastel Red" },
                            { color: "#BBF7D0", name: "Pastel Green" },
                            { color: "#FEF3C7", name: "Pastel Yellow" },
                            { color: "#E0E7FF", name: "Pastel Purple" },
                            { color: "#FCE7F3", name: "Pastel Pink" },
                            { color: "#CFFAFE", name: "Pastel Cyan" },
                            { color: "#ECFDF5", name: "Pastel Mint" },
                            { color: "#E5E7EB", name: "Pastel Gray" },
                            { color: "#FEF7FF", name: "Pastel Lavender" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Neon Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Neon
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#00BFFF", name: "Neon Blue" },
                            { color: "#FF1493", name: "Neon Pink" },
                            { color: "#00FF7F", name: "Neon Green" },
                            { color: "#FFD700", name: "Neon Gold" },
                            { color: "#9932CC", name: "Neon Purple" },
                            { color: "#FF4500", name: "Neon Orange" },
                            { color: "#00FFFF", name: "Neon Cyan" },
                            { color: "#ADFF2F", name: "Neon Lime" },
                            { color: "#FF69B4", name: "Neon Hot Pink" },
                            { color: "#DC143C", name: "Neon Crimson" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Earth Tones */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Earth Tones
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#8B4513", name: "Saddle Brown" },
                            { color: "#A0522D", name: "Sienna" },
                            { color: "#CD853F", name: "Peru" },
                            { color: "#D2691E", name: "Chocolate" },
                            { color: "#B8860B", name: "Dark Goldenrod" },
                            { color: "#228B22", name: "Forest Green" },
                            { color: "#556B2F", name: "Dark Olive" },
                            { color: "#8FBC8F", name: "Dark Sea Green" },
                            { color: "#2F4F4F", name: "Dark Slate Gray" },
                            { color: "#708090", name: "Slate Gray" },
                          ].map((colorOption) => (
                            <button
                              key={colorOption.color}
                              type="button"
                              onClick={() =>
                                setPublishForm((prev) => ({
                                  ...prev,
                                  primary_color: colorOption.color,
                                }))
                              }
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                                publishForm.primary_color === colorOption.color
                                  ? "border-gray-800 scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    This color will be applied to Chat, Call, Billing, and
                    Logout buttons across all expert pages.
                  </p>
                </div>
              </div>

              {/* Free Trial Configuration */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Free Trial
                </Label>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Offer a 7-day free trial to attract new users. Users can access your expert with limited usage during the trial period.
                  </p>

                  {/* Trial Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Enable Free Trial
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow users to try your expert for free with usage limits
                      </p>

                    </div>
                    <div className="flex items-center gap-2">
                      {isUpdatingTrial && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      <Switch
                        checked={expert?.free_trial_enabled || false}
                        disabled={isUpdatingTrial}
                        onCheckedChange={(enabled) => {
                          // Update UI immediately for better UX
                          setExpert({ ...expert, free_trial_enabled: enabled });
                          
                          // Make API call in background
                          (async () => {
                            try {
                              setIsUpdatingTrial(true);
                              
                              const response = await fetchWithAuth(
                                `${API_URL}/experts/${projectId}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    ...getAuthHeaders(),
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    free_trial_enabled: enabled,
                                    trial_message_limit: enabled ? 10 : null,
                                    trial_minute_limit: enabled ? 5 : null,
                                  }),
                                }
                              );

                              const data = await response.json();
                              
                              if (data.success) {
                                setExpert({ 
                                  ...expert, 
                                  ...data.expert
                                });
                                success(enabled ? "Free trial enabled!" : "Free trial disabled!");
                                // Refresh expert data to ensure consistency
                                await fetchExpertData();
                              } else {
                                // Revert UI change on error
                                setExpert({ ...expert, free_trial_enabled: !enabled });
                                error("Failed to update trial settings: " + (data.error || data.detail || "Unknown error"));
                              }
                            } catch (err) {
                              console.error("Error updating trial settings:", err);
                              // Revert UI change on error
                              setExpert({ ...expert, free_trial_enabled: !enabled });
                              error("Error updating trial settings");
                            } finally {
                              setIsUpdatingTrial(false);
                            }
                          })();
                        }}
                      />
                    </div>
                  </div>

                  {/* Trial Configuration - Only show when enabled */}
                  {expert?.free_trial_enabled && (
                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900">
                        Trial Configuration
                      </h4>
                      
                      {/* Trial Coupon Code */}
                      <div>
                        <Label className="block text-xs font-medium text-blue-800 mb-1">
                          Trial Coupon Code
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={localTrialConfig.coupon}
                            onChange={(e) => {
                              setLocalTrialConfig(prev => ({ ...prev, coupon: e.target.value.toUpperCase() }));
                            }}
                            className="bg-white text-sm font-mono"
                            placeholder="Enter coupon code (e.g., TRIAL123)"
                            maxLength={20}
                            disabled={isUpdatingTrial}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!localTrialConfig.coupon) {
                                const newCoupon = generateTrialCoupon();
                                setLocalTrialConfig(prev => ({ ...prev, coupon: newCoupon }));
                              }
                            }}
                            className="shrink-0"
                            disabled={isUpdatingTrial}
                          >
                            Generate
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(localTrialConfig.coupon)}
                            className="shrink-0"
                            disabled={!localTrialConfig.coupon}
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          Users enter this code during subscription to get 7-day free trial
                        </p>
                      </div>

                      {/* Trial Limits */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="block text-xs font-medium text-blue-800 mb-1">
                              Message Limit
                            </Label>
                            <Input
                              type="number"
                              value={localTrialConfig.message_limit || ""}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setLocalTrialConfig(prev => ({ ...prev, message_limit: value }));
                              }}
                              className="bg-white text-sm"
                              placeholder="10"
                              min="1"
                              disabled={isUpdatingTrial}
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              Max messages during trial
                            </p>
                          </div>

                          <div>
                            <Label className="block text-xs font-medium text-blue-800 mb-1">
                              Voice Minutes Limit
                            </Label>
                            <Input
                              type="number"
                              value={localTrialConfig.minute_limit || ""}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setLocalTrialConfig(prev => ({ ...prev, minute_limit: value }));
                              }}
                              className="bg-white text-sm"
                              placeholder="5"
                              min="1"
                              disabled={isUpdatingTrial}
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              Max voice call minutes during trial
                            </p>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            onClick={async () => {
                              // Validate coupon code
                              if (!localTrialConfig.coupon.trim()) {
                                error("Please enter a coupon code or click Generate");
                                return;
                              }

                              if (localTrialConfig.message_limit <= 0 || localTrialConfig.minute_limit <= 0) {
                                error("Please enter valid limits greater than 0");
                                return;
                              }

                              try {
                                setIsUpdatingTrial(true);
                                const response = await fetchWithAuth(
                                  `${API_URL}/experts/${projectId}`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      ...getAuthHeaders(),
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      free_trial_coupon: localTrialConfig.coupon.trim().toUpperCase(),
                                      trial_message_limit: localTrialConfig.message_limit,
                                      trial_minute_limit: localTrialConfig.minute_limit,
                                    }),
                                  }
                                );

                                const data = await response.json();
                                if (data.success) {
                                  setExpert({ 
                                    ...expert, 
                                    free_trial_coupon: localTrialConfig.coupon.trim().toUpperCase(),
                                    trial_message_limit: localTrialConfig.message_limit,
                                    trial_minute_limit: localTrialConfig.minute_limit
                                  });
                                  success("Trial configuration saved successfully!");
                                } else {
                                  error("Failed to save trial configuration: " + (data.error || "Unknown error"));
                                }
                              } catch (err) {
                                console.error("Error saving trial configuration:", err);
                                error("Error saving trial configuration");
                              } finally {
                                setIsUpdatingTrial(false);
                              }
                            }}
                            disabled={isUpdatingTrial || !localTrialConfig.coupon.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isUpdatingTrial ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              "Save Trial Configuration"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Trial Info */}
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>How it works:</strong> Users enter the coupon code during subscription signup to get 7 days of free access with the limits above. After the trial ends or limits are reached, they'll be prompted to upgrade to a paid plan.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Plans Management - Only show when Private is selected */}
              {publishForm.is_private && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="block text-sm font-medium text-gray-700">
                      Pricing Plans
                    </Label>
                    <Button
                      type="button"
                      onClick={() => setShowCreatePlan(true)}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-sm px-4 py-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Plan
                    </Button>
                  </div>

                  {isLoadingPlans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-500 mb-2">
                        No pricing plans created yet
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {plans.map((plan: any) => (
                        <div
                          key={plan.id}
                          className="p-4 border-2 rounded-lg border-gray-200 hover:border-blue-300 transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h6 className="font-bold text-gray-900 flex items-center">
                                  {plan.name}
                                  <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                                </h6>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    openDeleteModal(plan.id, plan.name)
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Delete
                                </Button>
                              </div>
                              <div className="mt-2">
                                <p className="text-2xl font-bold text-gray-900">
                                  £{plan.price}
                                  <span className="text-sm font-normal text-gray-600">
                                    /{plan.billing_interval}
                                  </span>
                                </p>
                                {/* Display message and minute limits if they exist */}
                                {(plan.message_limit || plan.minute_limit) && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    {plan.message_limit && (
                                      <div>
                                        Messages: {plan.message_limit} per
                                        billing period
                                      </div>
                                    )}
                                    {plan.minute_limit && (
                                      <div>
                                        Voice Minutes: {plan.minute_limit} per
                                        billing period
                                      </div>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  Currency: {plan.currency} • Created:{" "}
                                  {new Date(
                                    plan.created_at,
                                  ).toLocaleDateString()}
                                </p>
                                {plan.stripe_product_id && (
                                  <div className="text-xs text-green-600 font-medium mt-1">
                                    ✓ Stripe Ready (Product:{" "}
                                    {plan.stripe_product_id.substring(0, 12)}
                                    ...)
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create Plan Modal */}
                  {showCreatePlan && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Create New Plan
                          </h3>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCreatePlan(false);
                              setCreatePlanForm({
                                name: "",
                                price: "",
                                messageLimit: "",
                                minuteLimit: "",
                                billingInterval: "month",
                                billingIntervalCount: 1,
                                freeTrialEnabled: false,
                                trialCoupon: "",
                                trialMessageLimit: "",
                                trialMinuteLimit: "",
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            ×
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Plan Name
                            </Label>
                            <Input
                              value={createPlanForm.name}
                              onChange={(e) =>
                                setCreatePlanForm({
                                  ...createPlanForm,
                                  name: e.target.value,
                                })
                              }
                              placeholder="e.g., Basic Plan, Premium Access"
                              className="w-full"
                            />
                          </div>

                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Total Price (GBP)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                £
                              </span>
                              <Input
                                type="number"
                                min="1"
                                step="0.01"
                                value={createPlanForm.price}
                                onChange={(e) =>
                                  setCreatePlanForm({
                                    ...createPlanForm,
                                    price: e.target.value,
                                  })
                                }
                                placeholder="120.00"
                                className="w-full pl-8"
                              />
                            </div>
                          </div>

                          {/* Billing Interval Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="block text-sm font-medium text-gray-700 mb-2">
                                Billing Interval
                              </Label>
                              <select
                                value={createPlanForm.billingInterval}
                                onChange={(e) =>
                                  setCreatePlanForm({
                                    ...createPlanForm,
                                    billingInterval: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                              </select>
                            </div>
                            <div>
                              <Label className="block text-sm font-medium text-gray-700 mb-2">
                                Billing Period
                              </Label>
                              <select
                                value={createPlanForm.billingIntervalCount}
                                onChange={(e) =>
                                  setCreatePlanForm({
                                    ...createPlanForm,
                                    billingIntervalCount: parseInt(e.target.value),
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={1}>1 {createPlanForm.billingInterval}</option>
                                <option value={2}>2 {createPlanForm.billingInterval}s</option>
                                <option value={3}>3 {createPlanForm.billingInterval}s</option>
                                <option value={6}>6 {createPlanForm.billingInterval}s</option>
                                <option value={12}>12 {createPlanForm.billingInterval}s</option>
                              </select>
                            </div>
                          </div>

                          {/* Pricing Preview */}
                          {createPlanForm.price && createPlanForm.billingIntervalCount > 1 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h4 className="font-medium text-blue-900 mb-1">Pricing Preview</h4>
                              <div className="text-sm text-blue-800">
                                <p><strong>Display to customers:</strong> £{(parseFloat(createPlanForm.price) / createPlanForm.billingIntervalCount).toFixed(2)}/month</p>
                                <p><strong>Actual billing:</strong> £{createPlanForm.price} every {createPlanForm.billingIntervalCount} {createPlanForm.billingInterval}{createPlanForm.billingIntervalCount > 1 ? 's' : ''}</p>
                              </div>
                            </div>
                          )}

                          {/* Message Limit Field */}
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Message Limit (optional)
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={createPlanForm.messageLimit}
                              onChange={(e) =>
                                setCreatePlanForm({
                                  ...createPlanForm,
                                  messageLimit: e.target.value,
                                })
                              }
                              placeholder="e.g., 100 (leave empty for unlimited)"
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Number of messages user can interact with AI per
                              billing period
                            </p>
                          </div>

                          {/* Minute Limit Field */}
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Voice Call Minutes (optional)
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={createPlanForm.minuteLimit}
                              onChange={(e) =>
                                setCreatePlanForm({
                                  ...createPlanForm,
                                  minuteLimit: e.target.value,
                                })
                              }
                              placeholder="e.g., 60 (leave empty for unlimited)"
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Number of voice call minutes user can use per
                              billing period
                            </p>
                          </div>



                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-800">
                              💡 This will create a Stripe product with the same
                              name for subscription billing.
                            </p>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <Button
                              type="button"
                              onClick={() => {
                                setShowCreatePlan(false);
                                setCreatePlanForm({
                                  name: "",
                                  price: "",
                                  messageLimit: "",
                                  minuteLimit: "",
                                  billingInterval: "month",
                                  billingIntervalCount: 1,
                                  freeTrialEnabled: false,
                                  trialCoupon: "",
                                  trialMessageLimit: "",
                                  trialMinuteLimit: "",
                                });
                              }}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreatePlan}
                              disabled={
                                isCreatingPlan ||
                                !createPlanForm.name ||
                                !createPlanForm.price ||
                                (createPlanForm.freeTrialEnabled && (
                                  !createPlanForm.trialCoupon ||
                                  !createPlanForm.trialMessageLimit ||
                                  !createPlanForm.trialMinuteLimit
                                ))
                              }
                              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                            >
                              {isCreatingPlan ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Creating...
                                </>
                              ) : (
                                "Create Plan"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Plan Confirmation Modal */}
                  <ConfirmDeleteDialog
                    open={deleteModal.open}
                    onClose={() =>
                      setDeleteModal({ open: false, planId: "", planName: "" })
                    }
                    onConfirm={handleDeletePlan}
                    title="Delete Plan"
                    description={`Are you sure you want to delete the plan "${deleteModal.planName}"? This action cannot be undone.`}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Preview Modal */}
      <ExpandedPreview />
    </DashboardLayout>
  );
};

export default PublishManagerPage;
