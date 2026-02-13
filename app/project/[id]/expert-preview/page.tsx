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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useSlugValidation } from "@/hooks/useSlugValidation";
import {
  Globe,
  Lock,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
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
} from "@/components/ui/dialog";


interface Publication {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  description: string;
  cta_text: string | null;
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

const ExpertPreviewManagerPage = () => {
  const params = useParams();
  const projectId = params.id as string;
  const { toasts, removeToast, success, error, warning } = useToast();
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);

  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [expert, setExpert] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Background image upload state
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<
    string | null
  >(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Publish form state
  const [publishForm, setPublishForm] = useState({
    slug: "",
    is_published: false,
    is_private: false,
    banner_url: null as string | null,
    primary_color: "#3B82F6" as string,
    cta_text: "Ask a question by typing or speaking" as string,
  });

  // Preview state
  const [showExpandedPreview, setShowExpandedPreview] = useState(false);

  // Slug validation
  const {
    validateSlug,
    isChecking: isCheckingSlug,
    validationResult,
    getValidationStatus,
    getStatusMessage,
    getStatusColor,
  } = useSlugValidation({ expertId: projectId });

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
    const ctaText = publishForm.cta_text || "Ask a question by typing or speaking";
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
              {ctaText}
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
            AI Persona Preview
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
    const ctaText = publishForm.cta_text || "Ask a question by typing or speaking";
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
              AI Persona Preview
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

                    {/* CTA Text - Compact */}
                    <p
                      className={`text-sm mb-8 ${publication?.banner_url ? "text-gray-600" : "text-gray-500"}`}
                    >
                      {ctaText}
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

  useEffect(() => {
    fetchPublicationData();
    fetchExpertData();
  }, [projectId]);

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
            cta_text: publicationData.publication.cta_text || "Ask a question by typing or speaking",
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
            cta_text: "Ask a question by typing or speaking",
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
        cta_text: publishForm.cta_text,
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
        cta_text: publishForm.cta_text,
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
          <h1 className="text-3xl font-bold text-gray-900"> AI Persona | Publication Settings</h1>
          <p className="text-gray-600 mt-2">
            Control how your expert appears and is published to end users
          </p>
        </div>



        <Card className="shadow-lg">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center text-xl">
                <Globe className="h-5 w-5 mr-2 text-green-600" />
                Publication Settings
              </CardTitle>
              <CardDescription>
                Manage your expert's publication status and appearance
              </CardDescription>
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
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Public URL Slug
                  </h3>
                </div>
                <div className="flex items-center flex-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /persona/
                  </span>
                  <div className="relative flex-1">
                    <Input
                      value={publishForm.slug}
                      onChange={handleSlugChange}
                      placeholder="your-expert-name"
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md pr-10 ${getValidationStatus() === "available"
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

              {/* Visibility Radio Buttons - COMMENTED OUT FOR NOW */}
              {/*
              <div className="pt-6 border-t">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Visibility
                  </h3>
                </div>
                <div className="space-y-3">
                  Public Option
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${!publishForm.is_private
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                      }`}
                    onClick={() =>
                      setPublishForm({ ...publishForm, is_private: false })
                    }
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${!publishForm.is_private
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300"
                          }`}
                      >
                        {!publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Globe
                        className={`h-5 w-5 mr-2 ${!publishForm.is_private
                          ? "text-green-600"
                          : "text-gray-400"
                          }`}
                      />
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-medium ${!publishForm.is_private
                            ? "text-green-900"
                            : "text-gray-900"
                            }`}
                        >
                          Public
                        </h4>
                        <p
                          className={`text-xs ${!publishForm.is_private
                            ? "text-green-700"
                            : "text-gray-500"
                            }`}
                        >
                          Anyone can discover and access your expert
                        </p>
                      </div>
                    </div>
                  </div>

                  Private Option
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${publishForm.is_private
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                      }`}
                    onClick={() =>
                      setPublishForm({ ...publishForm, is_private: true })
                    }
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${publishForm.is_private
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                          }`}
                      >
                        {publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Lock
                        className={`h-5 w-5 mr-2 ${publishForm.is_private
                          ? "text-blue-600"
                          : "text-gray-400"
                          }`}
                      />
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-medium ${publishForm.is_private
                            ? "text-blue-900"
                            : "text-gray-900"
                            }`}
                        >
                          Private
                        </h4>
                        <p
                          className={`text-xs ${publishForm.is_private
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
              */}

              {/* Call-to-Action Text */}
              <div className="pt-6 border-t">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    Call-to-Action Text
                  </h3>
                  <p className="text-sm text-gray-600">
                    Customize the text that appears below your expert name on the public page.
                  </p>
                </div>
                <div className="space-y-4">
                  <Input
                    value={publishForm.cta_text}
                    onChange={(e) => setPublishForm({ ...publishForm, cta_text: e.target.value })}
                    placeholder="Ask a question by typing or speaking"
                    className="w-full"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    This text encourages visitors to interact with your AI expert. Maximum 500 characters.
                  </p>
                </div>
              </div>

              {/* Background Image Upload */}
              <div className="pt-6 border-t">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Wallpaper | Background Image
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload an image for the background of your AI PERSONA this will appear as the wallpaper of its public profile.
                  </p>
                </div>
                <div className="space-y-4">

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
              <div className="pt-6 border-t">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    Button Colour
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose a colour for the chat/type and call/speak buttons that appear on your AI PERSONA
                    <br />
                    NOTE: the colour chosen by the owner, needs to be consistent in BOTH the USER and OWNERS view.
                  </p>
                </div>
                <div className="space-y-4">

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
                          title="Choose button colour"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            Selected Colour
                          </p>
                          <p className="text-gray-600 font-mono text-xs">
                            {publishForm.primary_color}
                          </p>
                        </div>
                      </div>

                      {/* Colour Preview Buttons */}
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

                    {/* Predefined Colour Options */}
                    <div className="space-y-4">
                      {/* Popular Colors */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Popular Colours
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
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${publishForm.primary_color === colorOption.color
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
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${publishForm.primary_color === colorOption.color
                                ? "border-gray-800 scale-110"
                                : "border-gray-300"
                                }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Modern Pastel */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Modern Pastel
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#FEE2E2", name: "Soft Red" },
                            { color: "#FFEDD5", name: "Soft Orange" },
                            { color: "#FEF3C7", name: "Soft Amber" },
                            { color: "#ECFCCB", name: "Soft Lime" },
                            { color: "#D1FAE5", name: "Soft Emerald" },
                            { color: "#D1FAF9", name: "Soft Cyan" },
                            { color: "#DBEAFE", name: "Soft Blue" },
                            { color: "#E0E7FF", name: "Soft Indigo" },
                            { color: "#EDE9FE", name: "Soft Purple" },
                            { color: "#FAE8FF", name: "Soft Fuchsia" },
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
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${publishForm.primary_color === colorOption.color
                                ? "border-gray-800 scale-110"
                                : "border-gray-300"
                                }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Earthy & Warm */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Earthy & Warm
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#451a03", name: "Deep Brown" },
                            { color: "#78350f", name: "Amber Brown" },
                            { color: "#92400e", name: "Terracotta" },
                            { color: "#b45309", name: "Ochre" },
                            { color: "#d97706", name: "Golden" },
                            { color: "#064e3b", name: "Deep Forest" },
                            { color: "#065f46", name: "Emerald Forest" },
                            { color: "#0f766e", name: "Teal Forest" },
                            { color: "#115e59", name: "Deep Teal" },
                            { color: "#134e4a", name: "Midnight Teal" },
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
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${publishForm.primary_color === colorOption.color
                                ? "border-gray-800 scale-110"
                                : "border-gray-300"
                                }`}
                              style={{ backgroundColor: colorOption.color }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Luxury */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Luxury
                        </p>
                        <div className="grid grid-cols-10 gap-2">
                          {[
                            { color: "#D4AF37", name: "Gold" },
                            { color: "#C0C0C0", name: "Silver" },
                            { color: "#B87333", name: "Copper" },
                            { color: "#E5E4E2", name: "Platinum" },
                            { color: "#FFD700", name: "Pure Gold" },
                            { color: "#722F37", name: "Wine" },
                            { color: "#4B0082", name: "Indigo" },
                            { color: "#000080", name: "Navy" },
                            { color: "#1A1A1A", name: "Jet Black" },
                            { color: "#F5F5F5", name: "White Smoke" },
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
                              className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${publishForm.primary_color === colorOption.color
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
                    This colour will be applied to Chat, Call, Billing, and
                    Logout buttons across all expert pages.
                  </p>
                </div>
              </div>

              {/* AI Persona Preview Section */}
              <div className="pt-6 border-t">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    AI Persona Preview
                  </h3>
                  <p className="text-sm text-gray-600">Click “AI PERSONA Preview” to see how your persona will appear to your subscribers.</p>
                </div>
                <CompactPreview />
              </div>

              {/* Save Settings Button */}
              <div className="pt-6 border-t">
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold"
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {publication ? "Republishing..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5 mr-2" />
                      {publication ? "Save Settings" : "Save Settings"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Preview Modal */}
      <ExpandedPreview />
    </DashboardLayout>
  );
};

export default ExpertPreviewManagerPage;