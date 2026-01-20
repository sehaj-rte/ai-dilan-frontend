"use client";

import React, { useState, useEffect } from "react";
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
import {
  CheckCircle,
  Loader2,
  Copy,
  Check,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  Gift,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useExpert } from "@/context/ExpertContext";
import CleanPaymentModal from "@/components/payment/CleanPaymentModal";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

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

const PricingSubscriptionManagerPage = () => {
  const params = useParams();
  const projectId = params.id as string;
  const { toasts, removeToast, success, error, warning } = useToast();

  const [loading, setLoading] = useState(true);
  const [isUpdatingTrial, setIsUpdatingTrial] = useState(false);
  const { expert, setExpert } = useExpert();
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Pricing content state
  const [pricingContent, setPricingContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [contentForm, setContentForm] = useState({
    monthly_plan: {
      title: "",
      subtitle: "",
      features: [""],
      perfect_for: [""],
      badge: ""
    },
    three_month_plan: {
      title: "",
      subtitle: "",
      features: [""],
      perfect_for: [""],
      badge: "Most Popular"
    },
    six_month_plan: {
      title: "",
      subtitle: "",
      features: [""],
      perfect_for: [""],
      badge: "Best Value"
    },
    general: {
      subscription_page_title: "",
      subscription_page_description: "",
      base_monthly_price: "40"
    },
    plan_custom_content: {} as Record<string, any>
  });

  // Local state for trial configuration to enable immediate UI updates
  const [localTrialConfig, setLocalTrialConfig] = useState({
    coupon: "",
    message_limit: 0,
    minute_limit: 0
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    planId: "",
    planName: "",
  });

  // Pricing plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState({
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
    contentTitle: "",
    contentSubtitle: "Ideal for those who want full flexibility with no long-term commitment.",
    contentFeatures: [
      `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
      "Explanations to your questions in plain English",
      "Generate expert-style responses",
      "Recommendations based on expert knowledge",
      "Cancel anytime"
    ],
    contentPerfectFor: [
      "No commitment",
      "Cancel anytime",
      "Best for short-term or occasional use"
    ],
    contentBadge: "",
  });

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

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
    const loadAllData = async () => {
      try {
        setLoading(true);
        // Execute fetches in parallel
        // Note: expert data is now provided by DashboardLayout via context
        await Promise.all([
          fetchPlans(false),           // Skip internal loading state
          fetchPricingContent(false)   // Skip internal loading state
        ]);
      } catch (err) {
        console.error("Error loading page data:", err);
        error("Some data failed to load. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadAllData();
    }
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


  const fetchPricingContent = async (shouldSetLoading = true) => {
    try {
      if (shouldSetLoading) setIsLoadingContent(true);
      const response = await fetchWithAuth(
        `${API_URL}/expert-pricing-content/experts/${projectId}?t=${Date.now()}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success && data.content) {
        setPricingContent(data.content);

        // Populate form with existing content
        setContentForm({
          monthly_plan: {
            title: data.content.monthly_plan.title || "",
            subtitle: data.content.monthly_plan.subtitle || "",
            features: data.content.monthly_plan.features || [""],
            perfect_for: data.content.monthly_plan.perfect_for || [""],
            badge: ""
          },
          three_month_plan: {
            title: data.content.three_month_plan.title || "",
            subtitle: data.content.three_month_plan.subtitle || "",
            features: data.content.three_month_plan.features || [""],
            perfect_for: data.content.three_month_plan.perfect_for || [""],
            badge: data.content.three_month_plan.badge || "Most Popular"
          },
          six_month_plan: {
            title: data.content.six_month_plan.title || "",
            subtitle: data.content.six_month_plan.subtitle || "",
            features: data.content.six_month_plan.features || [""],
            perfect_for: data.content.six_month_plan.perfect_for || [""],
            badge: data.content.six_month_plan.badge || "Best Value"
          },
          general: {
            subscription_page_title: data.content.general.subscription_page_title || "",
            subscription_page_description: data.content.general.subscription_page_description || "",
            base_monthly_price: data.content.general.base_monthly_price || "40"
          },
          plan_custom_content: data.content.plan_custom_content || {}
        });
      }
    } catch (error) {
      console.error("Error fetching pricing content:", error);
    } finally {
      if (shouldSetLoading) setIsLoadingContent(false);
    }
  };

  const updatePricingContent = async () => {
    try {
      setIsLoadingContent(true);

      // Clean up empty strings from arrays
      const cleanPlanContent = (plan: any) => ({
        ...plan,
        features: (plan.features || []).filter((f: string) => f.trim()),
        perfect_for: (plan.perfect_for || []).filter((f: string) => f.trim())
      });

      const cleanedForm = {
        ...contentForm,
        monthly_plan: cleanPlanContent(contentForm.monthly_plan),
        three_month_plan: cleanPlanContent(contentForm.three_month_plan),
        six_month_plan: cleanPlanContent(contentForm.six_month_plan),
        plan_custom_content: Object.keys(contentForm.plan_custom_content).reduce((acc, planId) => ({
          ...acc,
          [planId]: cleanPlanContent(contentForm.plan_custom_content[planId])
        }), {})
      };

      const response = await fetchWithAuth(
        `${API_URL}/expert-pricing-content/experts/${projectId}`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedForm),
        },
      );

      const data = await response.json();

      if (data.success) {
        success("Pricing content updated successfully!");
        setPricingContent(data.content);
        setShowContentEditor(false);
      } else {
        error("Failed to update pricing content: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Error updating pricing content:", err);
      error("Error updating pricing content");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const fetchPlans = async (shouldSetLoading = true) => {
    try {
      if (shouldSetLoading) setIsLoadingPlans(true);

      // Debug: Check current user and token
      const token = localStorage.getItem("dilan_ai_token");
      const user = localStorage.getItem("dilan_ai_user");

      const response = await fetchWithAuth(
        `${API_URL}/plans/experts/${projectId}?t=${Date.now()}`,
        {
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();

      if (data.success) {
        setPlans(data.plans || []);
      } else {
        error("Failed to fetch plans: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      error("Error fetching plans");
    } finally {
      if (shouldSetLoading) setIsLoadingPlans(false);
    }
  };

  const handleEditPlan = (plan: any) => {
    // Get custom content for this plan if it exists
    const customContent = pricingContent?.plan_custom_content?.[plan.id] || {};

    setCreatePlanForm({
      name: plan.name,
      price: plan.price.toString(),
      messageLimit: plan.message_limit?.toString() || "",
      minuteLimit: plan.minute_limit?.toString() || "",
      billingInterval: plan.billing_interval,
      billingIntervalCount: plan.billing_interval_count,
      freeTrialEnabled: false,
      trialCoupon: "",
      trialMessageLimit: "",
      trialMinuteLimit: "",
      contentTitle: customContent.title || plan.name,
      contentSubtitle: customContent.subtitle || "Ideal for those who want full flexibility with no long-term commitment.",
      contentFeatures: customContent.features?.length > 0 ? customContent.features : [
        `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
        "Explanations to your questions in plain English",
        "Generate expert-style responses",
        "Recommendations based on expert knowledge",
        "Cancel anytime"
      ],
      contentPerfectFor: customContent.perfect_for?.length > 0 ? customContent.perfect_for : [
        "No commitment",
        "Cancel anytime",
        "Best for short-term or occasional use"
      ],
      contentBadge: customContent.badge || "",
    });

    setIsEditingPlan(true);
    setEditingPlanId(plan.id);
    setShowCreatePlan(true);
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

      const url = isEditingPlan
        ? `${API_URL}/plans/experts/${projectId}/${editingPlanId}`
        : `${API_URL}/plans/experts/${projectId}`;

      const response = await fetchWithAuth(
        url,
        {
          method: isEditingPlan ? "PUT" : "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(planData),
        },
      );

      const data = await response.json();

      if (data.success) {
        success(isEditingPlan ? `Plan "${createPlanForm.name}" updated successfully!` : `Plan "${createPlanForm.name}" created successfully!`);

        // After creating/updating the plan, also save its custom content
        const currentPlanId = isEditingPlan ? editingPlanId : data.plan.id;
        try {
          // Prepare the custom content object with fallbacks to ensure it's never empty
          const fallbackSubtitle = "Ideal for those who want full flexibility with no long-term commitment.";
          const fallbackFeatures = [
            `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
            "Explanations to your questions in plain English",
            "Generate expert-style responses",
            "Recommendations based on expert knowledge",
            "Cancel anytime"
          ];
          const fallbackPerfectFor = [
            "No commitment",
            "Cancel anytime",
            "Best for short-term or occasional use"
          ];

          const planCustomContent = {
            [currentPlanId as string]: {
              title: createPlanForm.contentTitle || createPlanForm.name,
              subtitle: createPlanForm.contentSubtitle || fallbackSubtitle,
              features: createPlanForm.contentFeatures.filter(f => f.trim()).length > 0
                ? createPlanForm.contentFeatures.filter(f => f.trim())
                : fallbackFeatures,
              perfect_for: createPlanForm.contentPerfectFor.filter(f => f.trim()).length > 0
                ? createPlanForm.contentPerfectFor.filter(f => f.trim())
                : fallbackPerfectFor,
              badge: createPlanForm.contentBadge || ""
            }
          };

          // Merge with existing plan_custom_content
          const updatedCustomContent = {
            ...(pricingContent?.plan_custom_content || {}),
            ...planCustomContent
          };

          await fetchWithAuth(
            `${API_URL}/expert-pricing-content/experts/${projectId}`,
            {
              method: "PUT",
              headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                plan_custom_content: updatedCustomContent
              }),
            }
          );
        } catch (contentErr) {
          console.error("Error saving plan custom content:", contentErr);
          // Don't fail the whole operation if just content fails
        }

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
          contentTitle: "",
          contentSubtitle: "Ideal for those who want full flexibility with no long-term commitment.",
          contentFeatures: [
            `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
            "Explanations to your questions in plain English",
            "Generate expert-style responses",
            "Recommendations based on expert knowledge",
            "Cancel anytime"
          ],
          contentPerfectFor: [
            "No commitment",
            "Cancel anytime",
            "Best for short-term or occasional use"
          ],
          contentBadge: "",
        });
        setShowCreatePlan(false);
        setIsEditingPlan(false);
        setEditingPlanId(null);
        await fetchPlans(); // Refresh plans list
        await fetchPricingContent(); // Refresh pricing content to sync the new custom content
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
      success("Coupon code copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      error("Failed to copy coupon code");
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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing & Subscription Manager</h1>
            <p className="text-gray-600 mt-2">
              Manage pricing plans, free trials, and subscription settings for your expert
            </p>
          </div>
          <Button
            onClick={() => setShowPreview(!showPreview)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide Preview" : "Preview Subscription Page"}
          </Button>
        </div>

        {/* Free Trial Configuration */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Gift className="h-5 w-5 mr-2 text-purple-600" />
              Free Trial Configuration
            </CardTitle>
            <CardDescription>
              Offer a 7-day free trial to attract new users with limited usage
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>


        {/* Pricing Plans Management */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                  Pricing Plans
                </CardTitle>
                <CardDescription>
                  Create and manage subscription plans for your expert
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setShowCreatePlan(true)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-sm px-4 py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-gray-500 mb-2">
                  No pricing plans created yet
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Create your first pricing plan to start accepting subscriptions
                </p>
                <Button
                  onClick={() => setShowCreatePlan(true)}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
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
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => handleEditPlan(plan)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              onClick={() =>
                                openDeleteModal(plan.id, plan.name)
                              }
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  Messages: {plan.message_limit} per billing period
                                </div>
                              )}
                              {plan.minute_limit && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  Voice Minutes: {plan.minute_limit} per billing period
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
                            <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Stripe Ready (Product:{" "}
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
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isEditingPlan ? "Edit Plan" : "Create New Plan"}
                    </h3>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreatePlan(false);
                        setIsEditingPlan(false);
                        setEditingPlanId(null);
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
                          contentTitle: "",
                          contentSubtitle: "Ideal for those who want full flexibility with no long-term commitment.",
                          contentFeatures: [
                            `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
                            "Explanations to your questions in plain English",
                            "Generate expert-style responses",
                            "Recommendations based on expert knowledge",
                            "Cancel anytime"
                          ],
                          contentPerfectFor: [
                            "No commitment",
                            "Cancel anytime",
                            "Best for short-term or occasional use"
                          ],
                          contentBadge: "",
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
                        onChange={(e) => {
                          const newName = e.target.value;
                          const currentTitle = createPlanForm.contentTitle;
                          // Update title if it's empty or was mirroring the name
                          const shouldUpdateTitle = !currentTitle || currentTitle === createPlanForm.name;

                          setCreatePlanForm({
                            ...createPlanForm,
                            name: newName,
                            contentTitle: shouldUpdateTitle ? newName : currentTitle
                          });
                        }}
                        placeholder="e.g., Monthly Pro"
                        className="w-full"
                        required
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

                    {/* Billing Period Selection */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Period
                      </Label>
                      <select
                        value={`${createPlanForm.billingIntervalCount}-${createPlanForm.billingInterval}`}
                        onChange={(e) => {
                          const [count, interval] = e.target.value.split("-");
                          setCreatePlanForm({
                            ...createPlanForm,
                            billingIntervalCount: parseInt(count),
                            billingInterval: interval,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1-month">Monthly (1 Month)</option>
                        <option value="3-month">Quarterly (3 Months)</option>
                        <option value="6-month">Bi-Annually (6 Months)</option>
                        <option value="1-year">Yearly (1 Year)</option>
                      </select>
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

                    {/* Plan Display Content Section */}
                    <div className="pt-4 border-t space-y-4">
                      <h4 className="font-medium text-gray-900">Plan Display Content</h4>
                      <p className="text-sm text-gray-500">How this plan will appear in the payment modal</p>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Title (optional)
                        </Label>
                        <Input
                          value={createPlanForm.contentTitle}
                          onChange={(e) =>
                            setCreatePlanForm({
                              ...createPlanForm,
                              contentTitle: e.target.value,
                            })
                          }
                          placeholder="e.g., Premium Growth Plan"
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Subtitle / Description
                        </Label>
                        <textarea
                          value={createPlanForm.contentSubtitle}
                          onChange={(e) =>
                            setCreatePlanForm({
                              ...createPlanForm,
                              contentSubtitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Perfect for users who need..."
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Badge (optional)
                        </Label>
                        <Input
                          value={createPlanForm.contentBadge}
                          onChange={(e) =>
                            setCreatePlanForm({
                              ...createPlanForm,
                              contentBadge: e.target.value,
                            })
                          }
                          placeholder="e.g., Best Value"
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Features
                        </Label>
                        {createPlanForm.contentFeatures.map((feature, index) => (
                          <div key={index} className="flex gap-2 mb-2">
                            <Input
                              value={feature}
                              onChange={(e) => {
                                const newFeatures = [...createPlanForm.contentFeatures];
                                newFeatures[index] = e.target.value;
                                setCreatePlanForm({ ...createPlanForm, contentFeatures: newFeatures });
                              }}
                              placeholder={`Feature ${index + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFeatures = createPlanForm.contentFeatures.filter((_, i) => i !== index);
                                setCreatePlanForm({ ...createPlanForm, contentFeatures: newFeatures });
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatePlanForm({ ...createPlanForm, contentFeatures: [...createPlanForm.contentFeatures, ""] })}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Feature
                        </Button>
                        <div>
                          <Label className="block text-sm font-medium text-gray-700 mb-2">
                            "Perfect For" Items
                          </Label>
                          {createPlanForm.contentPerfectFor.map((item, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const newItems = [...createPlanForm.contentPerfectFor];
                                  newItems[index] = e.target.value;
                                  setCreatePlanForm({ ...createPlanForm, contentPerfectFor: newItems });
                                }}
                                placeholder={`Item ${index + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newItems = createPlanForm.contentPerfectFor.filter((_, i) => i !== index);
                                  setCreatePlanForm({ ...createPlanForm, contentPerfectFor: newItems });
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCreatePlanForm({ ...createPlanForm, contentPerfectFor: [...createPlanForm.contentPerfectFor, ""] })}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          type="button"
                          onClick={() => {
                            setShowCreatePlan(false);
                            setIsEditingPlan(false);
                            setEditingPlanId(null);
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
                              contentTitle: "",
                              contentSubtitle: "Ideal for those who want full flexibility with no long-term commitment.",
                              contentFeatures: [
                                `Immediate access to the full use of ${expert?.name || 'AI Expert'}`,
                                "Explanations to your questions in plain English",
                                "Generate expert-style responses",
                                "Recommendations based on expert knowledge",
                                "Cancel anytime"
                              ],
                              contentPerfectFor: [
                                "No commitment",
                                "Cancel anytime",
                                "Best for short-term or occasional use"
                              ],
                              contentBadge: "",
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
                          className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
                        >
                          {isCreatingPlan ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {isEditingPlan ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            isEditingPlan ? "Update Plan" : "Create Plan"
                          )}
                        </Button>
                      </div>
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
          </CardContent>
        </Card>

        {/* Content Editor Modal */}
        {showContentEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit Pricing Content
                  </h3>
                  <Button
                    onClick={() => setShowContentEditor(false)}
                    variant="outline"
                    size="sm"
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* General Settings */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4">General Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Subscription Page Title
                        </Label>
                        <Input
                          value={contentForm.general.subscription_page_title}
                          onChange={(e) =>
                            setContentForm(prev => ({
                              ...prev,
                              general: { ...prev.general, subscription_page_title: e.target.value }
                            }))
                          }
                          placeholder="Subscribe to AI Expert"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Subscription Page Description
                        </Label>
                        <Input
                          value={contentForm.general.subscription_page_description}
                          onChange={(e) =>
                            setContentForm(prev => ({
                              ...prev,
                              general: { ...prev.general, subscription_page_description: e.target.value }
                            }))
                          }
                          placeholder="Choose the perfect plan to access expert assistance"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Monthly Price (for discount calculations)
                        </Label>
                        <Input
                          value={contentForm.general.base_monthly_price}
                          onChange={(e) =>
                            setContentForm(prev => ({
                              ...prev,
                              general: { ...prev.general, base_monthly_price: e.target.value }
                            }))
                          }
                          placeholder="40"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This is used to calculate discount percentages for multi-month plans
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Content Editors */}
                  {/* Specific Plan Editors */}
                  {plans.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-bold text-gray-900 mb-4">Specific Plan Customization</h4>
                      <div className="space-y-6">
                        {plans.map((plan) => {
                          const planKey = plan.id;
                          const currentContent = contentForm.plan_custom_content[planKey] || {
                            title: "",
                            subtitle: "",
                            features: [""],
                            perfect_for: [""],
                            badge: ""
                          };

                          const updateField = (field: string, value: any) => {
                            setContentForm(prev => ({
                              ...prev,
                              plan_custom_content: {
                                ...prev.plan_custom_content,
                                [planKey]: { ...currentContent, [field]: value }
                              }
                            }));
                          };

                          return (
                            <div key={planKey} className="p-4 border border-blue-100 rounded-lg bg-blue-50/30">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                <h5 className="font-semibold text-blue-900">
                                  Plan: {plan.name} (£{plan.price}/{plan.billing_interval})
                                </h5>
                              </div>

                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-2">Plan Title</Label>
                                    <Input
                                      value={currentContent.title}
                                      onChange={(e) => updateField('title', e.target.value)}
                                      placeholder={`e.g. ${plan.name} Plan`}
                                    />
                                  </div>
                                  <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-2">Badge Text</Label>
                                    <Input
                                      value={currentContent.badge}
                                      onChange={(e) => updateField('badge', e.target.value)}
                                      placeholder="e.g. Recommended"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="block text-sm font-medium text-gray-700 mb-2">Subtitle / Description</Label>
                                  <Input
                                    value={currentContent.subtitle}
                                    onChange={(e) => updateField('subtitle', e.target.value)}
                                    placeholder="Brief description for this specific plan"
                                  />
                                </div>

                                {/* Features List for Specific Plan */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium text-gray-700">What's Included</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateField('features', [...currentContent.features, ""])}
                                      className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Feature
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {currentContent.features.map((feature: string, idx: number) => (
                                      <div key={idx} className="flex gap-2">
                                        <Input
                                          value={feature}
                                          onChange={(e) => {
                                            const newFeatures = [...currentContent.features];
                                            newFeatures[idx] = e.target.value;
                                            updateField('features', newFeatures);
                                          }}
                                          placeholder={`Feature ${idx + 1}`}
                                          className="flex-1"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newFeatures = currentContent.features.filter((_: any, i: number) => i !== idx);
                                            updateField('features', newFeatures.length ? newFeatures : [""]);
                                          }}
                                          className="h-10 w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Perfect For List for Specific Plan */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium text-gray-700">Perfect For</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateField('perfect_for', [...currentContent.perfect_for, ""])}
                                      className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {currentContent.perfect_for.map((item: string, idx: number) => (
                                      <div key={idx} className="flex gap-2">
                                        <Input
                                          value={item}
                                          onChange={(e) => {
                                            const newItems = [...currentContent.perfect_for];
                                            newItems[idx] = e.target.value;
                                            updateField('perfect_for', newItems);
                                          }}
                                          placeholder={`Perfect for item ${idx + 1}`}
                                          className="flex-1"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newItems = currentContent.perfect_for.filter((_: any, i: number) => i !== idx);
                                            updateField('perfect_for', newItems.length ? newItems : [""]);
                                          }}
                                          className="h-10 w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {plans.length === 0 && (
                    <div className="p-8 border-2 border-dashed rounded-lg text-center bg-gray-50">
                      <p className="text-gray-600 mb-2">No active pricing plans found.</p>
                      <p className="text-sm text-gray-500">Create a plan down below first to customize its content here.</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => setShowContentEditor(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={updatePricingContent}
                      disabled={isLoadingContent}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoadingContent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Subscription Preview */}
        {showPreview && (
          <CleanPaymentModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            plans={plans}
            expertName={expert?.name || "AI Expert"}
            expertSlug={expert?.slug}
            expertId={projectId}
            onPaymentSuccess={() => { }}
            userToken=""
          />
        )}
      </div>
    </DashboardLayout >
  );
};

export default PricingSubscriptionManagerPage;