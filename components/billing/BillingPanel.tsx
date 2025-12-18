"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToastContainer, useToast } from "@/components/ui/toast";
import {
  CreditCard,
  Calendar,
  DollarSign,
  Settings,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Star,
  MessageCircle,
  Phone,
  BarChart3,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { API_URL } from "@/lib/config";
import AddPaymentMethodModal from "./AddPaymentMethodModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import { useBillingData } from "@/hooks/useBillingData";
import { TrialDebugPanel } from "@/components/debug/TrialDebugPanel";
import { UsagePaceWarning } from "@/components/usage/UsagePaceWarning";

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Subscription {
  id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_name: string;
  plan_price: number;
  plan_total_price?: number;
  plan_currency: string;
  plan_interval: string;
  plan_billing_period?: string;
  plan_display_text?: string;
  expert_id: string;
  expert_name?: string;
  expert_description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  plan_id?: string; // Add plan_id to the interface
  usage_info?: {
    trial_days_remaining: number;
    messages_used: number;
    message_limit: number;
    message_percentage: number;
    minutes_used: number;
    minute_limit: number;
    minute_percentage: number;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name: string;
    email: string;
  };
  is_default?: boolean;
}

// Add Plan interface with limit fields
interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  billing_interval_count?: number; // Add billing interval count field
  features: string[];
  recommended?: boolean;
  message_limit?: number | null;
  minute_limit?: number | null;
}

interface BillingPanelProps {
  userToken: string;
  expertSlug?: string; // Add expertSlug prop
  usageContext?: {
    limitStatus: any;
    currentPlan: any;
    planLoading: boolean;
  };
  onExpertIdFetched?: (expertId: string | null) => void; // Callback for expert ID
}

const BillingPanel: React.FC<BillingPanelProps> = ({
  userToken,
  expertSlug, // Add expertSlug prop
  usageContext,
  onExpertIdFetched, // Add callback prop
}) => {
  // Use optimized billing data hook
  const {
    subscriptions,
    paymentMethods,
    plans,
    expert,
    loading,
    error,
    refetch: refetchBillingData,
  } = useBillingData({ userToken, expertSlug });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null); // Add selected plan state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<Subscription | null>(null);
  const [upgrading, setUpgrading] = useState(false); // Add upgrading state
  const [paymentLoading, setPaymentLoading] = useState(false); // Add payment loading state
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null); // Add selected subscription for upgrade

  // Pace warning state
  const [paceWarnings, setPaceWarnings] = useState<{[key: string]: any}>({});
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const {
    toasts,
    removeToast,
    error: showError,
    success: showSuccess,
  } = useToast();

  // Function to check pace warnings for a subscription
  const checkPaceWarning = async (subscriptionId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/usage-pace-warning`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      const data = await response.json();
      
      if (data.success && data.show_warning) {
        setPaceWarnings(prev => ({
          ...prev,
          [subscriptionId]: data
        }));
      }
    } catch (error) {
      console.error('Error checking pace warning:', error);
    }
  };

  // Check pace warnings for all subscriptions when they load
  useEffect(() => {
    if (subscriptions.length > 0 && userToken) {
      subscriptions.forEach(sub => {
        // Only check for non-trial subscriptions
        if (!sub.usage_info?.trial_days_remaining || sub.usage_info.trial_days_remaining <= 0) {
          checkPaceWarning(sub.stripe_subscription_id);
        }
      });
    }
  }, [subscriptions, userToken]);

  // Helper function to show confirmation modal
  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = "Confirm",
    cancelText: string = "Cancel"
  ) => {
    setConfirmAction({
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
    });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      confirmAction.onConfirm();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Notify parent of expert ID when available
  useEffect(() => {
    if (expert?.id) {
      onExpertIdFetched?.(expert.id);
    }
  }, [expert?.id, onExpertIdFetched]);

  // Set selected subscription and plan when data is loaded
  useEffect(() => {
    if (subscriptions.length > 0 && expert?.id) {
      const activeSubscriptions = subscriptions.filter(
        (sub: Subscription) => sub.status === "active" || sub.status === "trialing",
      );
      setSelectedSubscription(activeSubscriptions[0] || null);
    } else if (expert?.id) {
      setSelectedSubscription(null);
    }
  }, [subscriptions, expert?.id]);

  useEffect(() => {
    if (plans.length > 0) {
      setSelectedPlan(plans.find((p: Plan) => p.recommended) || plans[0]);
    }
  }, [plans]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: "Active" },
      trialing: { color: "bg-blue-100 text-blue-800", label: "Trial" },
      past_due: { color: "bg-red-100 text-red-800", label: "Past Due" },
      canceled: { color: "bg-gray-100 text-gray-800", label: "Canceled" },
      incomplete: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Incomplete",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  // Generate plan features (features are already set in useBillingData hook)
  const generatePlanFeatures = (plan: Plan, subscription?: Subscription) => {
    // Just return the features as they're already properly set in the hook
    return plan.features;
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      // Handle both successful responses and server errors gracefully
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const subscription = subscriptions.find(
            (sub) => sub.stripe_subscription_id === subscriptionId,
          );

          showSuccess(
            `Subscription cancelled successfully. You'll continue to have access until ${subscription ? formatDate(subscription.current_period_end) : 'the end of your billing period'}.`
          );

          // Refresh billing data
          await refetchBillingData();
        } else {
          showError(
            "Failed to cancel subscription: " + (data.error || "Unknown error"),
          );
        }
      } else {
        // Even if server returns error, the cancellation might have worked
        // Show a more graceful message and refresh data
        showSuccess(
          "Cancellation request submitted. Please refresh the page in a few moments to see the updated status."
        );

        // Refresh billing data after a short delay to catch webhook updates
        setTimeout(async () => {
          await refetchBillingData();
        }, 2000);
      }
    } catch (err) {
      console.error("Error canceling subscription:", err);
      // Show a more graceful error message
      showSuccess(
        "Cancellation request submitted. Please refresh the page in a few moments to see the updated status."
      );

      // Still try to refresh data in case it worked
      setTimeout(async () => {
        await refetchBillingData();
      }, 2000);
    }
  };

  const handleShowCancelModal = (subscription: Subscription) => {
    setSubscriptionToCancel(subscription);
    setShowCancelModal(true);
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    const doReactivate = async () => {

      try {
        const response = await fetch(
          `${API_URL}/payments/subscriptions/${subscriptionId}/reactivate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        );

        const data = await response.json();
        if (data.success) {
          showSuccess("Subscription reactivated successfully");
          // Refresh billing data
          await refetchBillingData();
        } else {
          showError(
            "Failed to reactivate subscription: " +
            (data.error || "Unknown error"),
          );
        }
      } catch (err) {
        console.error("Error reactivating subscription:", err);
        showError("Failed to reactivate subscription");
      }
    };

    showConfirmation(
      "Reactivate Subscription",
      "Are you sure you want to reactivate this subscription?",
      doReactivate,
      "Reactivate",
      "Cancel"
    );
  };



  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true);
  };

  const handlePaymentMethodAdded = async (newPaymentMethodId?: string) => {
    setShowAddPaymentModal(false);
    showSuccess("Payment method added successfully and set as default");
    
    // Refresh billing data to show new payment method
    await refetchBillingData();
  };

  // Handle incomplete subscription payment confirmation
  const handleCompletePayment = async (subscriptionId: string) => {
    try {
      setPaymentLoading(true);

      if (!userToken) {
        showError("Not authenticated. Please refresh the page and try again.");
        return;
      }

      // Get the subscription details to find client_secret
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/payment-intent`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          if (data.detail?.includes("No payment method found")) {
            showError("Please add a payment method first, then try again.");
            return;
          } else if (data.detail?.includes("not incomplete")) {
            showError("This subscription doesn't need payment confirmation.");
            // Refresh to show current status
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            return;
          }
        }
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      if (data.success && data.client_secret) {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Stripe failed to initialize. Please check your configuration.");
        }

        showSuccess("Processing payment...");

        // Confirm the payment
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          data.client_secret,
        );

        if (error) {
          console.error("Payment confirmation error:", error);
          showError(`Payment failed: ${error.message}`);
        } else if (paymentIntent.status === "succeeded") {
          showSuccess(
            "Payment confirmed successfully! Your subscription is now active.",
          );
          // Refresh subscriptions after successful payment
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          showError(
            `Payment status: ${paymentIntent.status}. Please try again.`,
          );
        }
      } else {
        showError(
          data.message ||
          "Unable to retrieve payment information. Please try again.",
        );
      }
    } catch (err) {
      console.error("Error completing payment:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to complete payment: ${errorMessage}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle plan upgrade
  const handleUpgradePlan = async (plan: Plan) => {
    setSelectedPlan(plan);



    // Add a small delay to ensure the selectedPlan state is updated
    await new Promise((resolve) => setTimeout(resolve, 10));

    // If we don't have a selected subscription but we're viewing plans for a specific expert,
    // we need to create a new subscription rather than replace an existing one
    if (!selectedSubscription && expert?.id) {
      // Create new subscription flow
      try {
        setUpgrading(true);
        const response = await fetch(
          `${API_URL}/payments/create-subscription`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({
              plan_id: plan.id,
              expert_name: expertSlug,
            }),
          },
        );

        const data = await response.json();

        if (data.success) {
          if (data.checkout_url) {
            // Redirect to Stripe Checkout
            window.location.href = data.checkout_url;
          } else if (data.subscription_id) {
            // Direct subscription creation successful
            showSuccess(`Successfully subscribed to ${plan.name} plan!`);
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
          showError(
            "Failed to create subscription: " + (data.error || "Unknown error"),
          );
        }
      } catch (err) {
        console.error("Error creating subscription:", err);
        showError("Failed to create subscription. Please try again.");
      } finally {
        setUpgrading(false);
      }
      return;
    }

    if (!selectedSubscription) {
      showError("Please select a subscription to upgrade.");
      return;
    }

    // Check if the selected subscription is active
    if (selectedSubscription.status !== "active") {
      showError(
        "Can only upgrade active subscriptions. Current subscription status: " +
        selectedSubscription.status,
      );
      return;
    }

    setUpgrading(true);
    try {
      // Use the replace subscription endpoint to upgrade the plan
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${selectedSubscription.stripe_subscription_id}/replace`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_plan_id: plan.id,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        // Check if we need to handle a client_secret for payment confirmation
        if (data.client_secret) {
          await handleStripePaymentConfirmation(data.client_secret, plan);
        } else if (data.checkout_url) {
          // Redirect to Stripe Checkout if needed
          showSuccess(`Redirecting to checkout for ${plan.name} plan...`);
          setTimeout(() => {
            window.location.href = data.checkout_url;
          }, 2000);
        } else {
          showSuccess(`Successfully upgraded to ${plan.name} plan!`);
          // Refresh subscriptions to show the updated plan
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        showError("Failed to upgrade plan: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error upgrading plan:", err);
      showError("Failed to upgrade plan. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  // Handle Stripe payment confirmation
  const handleStripePaymentConfirmation = async (
    clientSecret: string,
    plan: Plan,
  ) => {
    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize. Please check your configuration.");
      }

      // Confirm the payment
      const { error, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret);

      if (error) {
        console.error("Payment confirmation error:", error);
        showError(`Payment failed: ${error.message}`);
      } else if (paymentIntent.status === "succeeded") {
        showSuccess(`Successfully upgraded to ${plan.name} plan!`);
        // Refresh the page to show updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showError(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      showError("Failed to confirm payment. Please try again.");
    }
  };

  // Handle payment confirmation for trial termination
  const handleTrialPaymentConfirmation = async (clientSecret: string) => {
    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize. Please check your configuration.");
      }

      // Confirm the payment with 3D Secure authentication
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

      if (error) {
        console.error("Payment confirmation error:", error);
        showError(`Payment authentication failed: ${error.message}`);
      } else if (paymentIntent.status === "succeeded") {
        showSuccess("Payment confirmed! Your paid plan is now active.");
        // Refresh the page to show updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (paymentIntent.status === "processing") {
        showSuccess("Payment is being processed. Your plan will be activated shortly.");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        showError(`Payment status: ${paymentIntent.status}. Please try again.`);
      }
    } catch (error) {
      console.error("Error confirming trial payment:", error);
      showError("Failed to confirm payment. Please try again.");
    }
  };

  // Sync subscription status with Stripe
  const syncSubscriptionStatus = async (subscriptionId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/payments/sync-subscription-status/${subscriptionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        if (data.old_status && data.new_status && data.old_status !== data.new_status) {
          showSuccess(`Subscription status synced: ${data.old_status} → ${data.new_status}`);
          // Refresh the page to show updated status
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        return data;
      } else {
        console.error("Failed to sync subscription status:", data);
        return null;
      }
    } catch (err) {
      console.error("Error syncing subscription status:", err);
      return null;
    }
  };

  // Handle starting paid plan when trial is exhausted
  const handleStartPaidPlan = async (subscriptionId: string) => {
    const doStartPaidPlan = async () => {

      try {
        setUpgrading(true);

        const response = await fetch(
          `${API_URL}/payments/subscriptions/${subscriptionId}/terminate-trial`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          // Handle different payment scenarios
          if (data.requires_confirmation || data.requires_action) {
            // Payment requires additional authentication (3D Secure)
            showSuccess("Processing payment authentication...");
            await handleTrialPaymentConfirmation(data.client_secret);
          } else if (data.billing_started) {
            // Payment succeeded immediately
            showSuccess("Trial ended successfully! Your paid plan is now active.");
            // Refresh billing data multiple times to ensure we get updated data
            const refreshData = async () => {
              console.log("🔄 Refreshing billing data after trial termination...");
              await refetchBillingData();
              
              // Check if data is still showing trial, if so refresh again
              setTimeout(async () => {
                console.log("🔄 Second refresh attempt...");
                await refetchBillingData();
              }, 2000);
              
              // Final refresh attempt
              setTimeout(async () => {
                console.log("🔄 Final refresh attempt...");
                await refetchBillingData();
              }, 4000);
            };
            
            setTimeout(refreshData, 1500);
          } else if (data.requires_payment_action) {
            // Payment is incomplete but trial was ended
            showSuccess("Trial ended. Please complete payment to activate your plan.");
            setTimeout(async () => {
              await refetchBillingData();
              // If still showing trial after first refresh, try again
              setTimeout(async () => {
                await refetchBillingData();
              }, 2000);
            }, 2000);
          } else {
            // Generic success
            showSuccess("Trial ended successfully!");
            // Refresh billing data multiple times to ensure we get updated data
            const refreshData = async () => {
              console.log("🔄 Refreshing billing data after trial termination...");
              await refetchBillingData();
              
              // Check if data is still showing trial, if so refresh again
              setTimeout(async () => {
                console.log("🔄 Second refresh attempt...");
                await refetchBillingData();
              }, 2000);
              
              // Final refresh attempt
              setTimeout(async () => {
                console.log("🔄 Final refresh attempt...");
                await refetchBillingData();
              }, 4000);
            };
            
            setTimeout(refreshData, 1500);
          }
        } else {
          // Handle specific error cases
          if (data.requires_payment_method) {
            showError("No payment method found. Please add a payment method to continue.");
            // Open the add payment method modal immediately
            setShowAddPaymentModal(true);
          } else {
            showError("Failed to start paid plan: " + (data.error || "Unknown error"));
          }
        }
      } catch (err) {
        console.error("Error starting paid plan:", err);
        showError("Failed to start paid plan. Please try again.");
      } finally {
        setUpgrading(false);
      }
    };

    showConfirmation(
      "End Trial & Start Paid Plan",
      "Are you sure you want to end your trial and start the paid plan now? This action cannot be undone.",
      doStartPaidPlan,
      "Start Paid Plan",
      "Keep Trial"
    );
  };

  // Check if Stripe is configured
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Stripe Not Configured</h3>
          <p className="text-gray-600">
            The Stripe publishable key is missing from the environment configuration.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Debug Panel - Only show in development */}
      {false && process.env.NODE_ENV === 'development' && subscriptions.length > 0 && (
        <TrialDebugPanel 
          subscriptionId={subscriptions[0].stripe_subscription_id} 
          userToken={userToken} 
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Wrap all sections in a container with reduced max-width and centered margin */}
      <div
        style={{ maxWidth: "950px", margin: "0 auto" }}
        className="space-y-10"
      >
        {/* Trial Status Banner - Show for trial subscriptions */}
        {subscriptions.some(sub => sub.status === "trialing") && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Free Trial Active</h3>
                  {subscriptions.filter(sub => sub.status === "trialing").map(subscription => (
                    <div key={subscription.id}>
                      <p className="text-blue-700">
                        {subscription.usage_info?.trial_days_remaining || 0} days remaining
                      </p>
                      {subscription.usage_info && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-sm text-blue-700 mb-1">
                              <span>Messages Used</span>
                              <span>{subscription.usage_info.messages_used}/{subscription.usage_info.message_limit}</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(subscription.usage_info.message_percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm text-blue-700 mb-1">
                              <span>Minutes Used</span>
                              <span>{subscription.usage_info.minutes_used}/{subscription.usage_info.minute_limit}</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(subscription.usage_info.minute_percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {subscriptions.some(sub =>
                sub.status === "trialing" &&
                sub.usage_info &&
                (sub.usage_info.message_percentage >= 100 ||
                  sub.usage_info.minute_percentage >= 100 ||
                  sub.usage_info.trial_days_remaining <= 0)
              ) && (
                  <div className="text-right">
                    <Badge className="bg-orange-100 text-orange-800 mb-2">
                      Trial Limit Reached
                    </Badge>
                    <p className="text-sm text-orange-700">
                      Upgrade to continue using all features
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}


        {/* Active Subscriptions */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Active Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>
                  {expertSlug
                    ? `No active subscriptions for expert: ${expertSlug}`
                    : "No active subscriptions"}
                </p>
                {expertSlug && (
                  <p className="mt-2 text-sm">
                    Choose a plan above to get started with this expert
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {subscriptions.map((subscription) => {
                // Calculate plan duration and pricing display
                const getPlanDurationInfo = () => {
                  // Use backend-provided billing period info
                  const billingPeriod = subscription.plan_billing_period || 'month';
                  const totalPrice = subscription.plan_total_price || subscription.plan_price;
                  const monthlyPrice = subscription.plan_price;
                  
                  // Parse month count from billing period
                  let monthCount = 1;
                  let planLabel = '';
                  let bestValueLabel = '';
                  
                  if (billingPeriod.includes('month')) {
                    const match = billingPeriod.match(/(\d+)\s*month/);
                    if (match) {
                      monthCount = parseInt(match[1]);
                    }
                  }
                  
                  // Format: {expert_name} - {duration} Plan ({plan_name})
                  const expertName = subscription.expert_name || 'AI Expert';
                  const planName = subscription.plan_name;
                  
                  if (monthCount === 6) {
                    planLabel = `${expertName} - 6 Months Plan`;
                    bestValueLabel = 'Best Value';
                  } else if (monthCount === 3) {
                    planLabel = `${expertName} - 3 Months Plan`;
                  } else if (monthCount > 1) {
                    planLabel = `${expertName} - ${monthCount} Months Plan (${planName})`;
                  } else {
                    planLabel = `${expertName} - 1 Month Plan (${planName})`;
                  }
                  
                  return {
                    planLabel,
                    bestValueLabel,
                    monthlyPrice,
                    totalPrice,
                    billingPeriod,
                    monthCount
                  };
                };

                const planInfo = getPlanDurationInfo();
                
                return (
                  <Card key={subscription.id} className="border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {planInfo.planLabel}
                            </h3>
                            {planInfo.bestValueLabel && (
                              <Badge className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1">
                                {planInfo.bestValueLabel}
                              </Badge>
                            )}
                            {getStatusBadge(subscription.status)}
                          </div>
                          
                          {subscription.expert_name && (
                            <p className="text-sm text-gray-600 mb-3">
                              Expert: {subscription.expert_name}
                            </p>
                          )}
                          
                          {/* Pricing Display */}
                          <div className="mb-2">
                            {subscription.usage_info && subscription.usage_info.trial_days_remaining > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-green-600">FREE</span>
                                <span className="text-sm text-gray-600">(Trial)</span>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">
                                  £{planInfo.monthlyPrice}
                                </span>
                                <span className="text-gray-600">/month</span>
                              </div>
                            )}
                            
                            {planInfo.monthCount > 1 && !subscription.usage_info?.trial_days_remaining && (
                              <p className="text-sm text-gray-600 mt-1">
                                Total: £{planInfo.totalPrice} for {planInfo.monthCount} months
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowCancelModal(subscription)}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      </div>

                      {/* Subscription Period Section */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Subscription Period</span>
                        </div>
                        <div className="text-blue-800">
                          <p className="font-medium">
                            {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                          </p>
                          {(() => {
                            const endDate = new Date(subscription.current_period_end);
                            const today = new Date();
                            const diffTime = endDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return (
                              <p className="text-sm text-blue-700 mt-1">
                                {diffDays > 0 ? `${diffDays} days remaining` : 'Expired'}
                              </p>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Plan Allowances Section */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-purple-100 p-1 rounded-full">
                            <BarChart3 className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium text-purple-900">Plan Allowances</span>
                        </div>
                        
                        {subscription.usage_info ? (
                          <p className="text-purple-800 text-sm">
                            You get <span className="font-semibold">{subscription.usage_info.message_limit} messages</span> and{' '}
                            <span className="font-semibold">{subscription.usage_info.minute_limit} voice minutes</span> for the entire{' '}
                            {planInfo.monthCount === 1 ? 'monthly' : `${planInfo.monthCount}-month`} period
                          </p>
                        ) : (
                          <p className="text-purple-800 text-sm">
                            Unlimited messages and voice minutes for the entire{' '}
                            {planInfo.monthCount === 1 ? 'monthly' : `${planInfo.monthCount}-month`} period
                          </p>
                        )}
                      </div>

                      {/* Usage Tracking */}
                      {subscription.usage_info && (
                        <div className="space-y-4">
                          {/* Messages Usage */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-gray-900">Messages</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {subscription.usage_info.messages_used} / {subscription.usage_info.message_limit}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(subscription.usage_info.message_percentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {subscription.usage_info.message_percentage.toFixed(1)}% used
                            </div>
                          </div>

                          {/* Voice Minutes Usage */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-gray-900">Voice Minutes</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {subscription.usage_info.minutes_used} / {subscription.usage_info.minute_limit}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(subscription.usage_info.minute_percentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {subscription.usage_info.minute_percentage.toFixed(1)}% used
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Subscription Validity Notice */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span>
                            Your subscription is valid until {formatDate(subscription.current_period_end)}
                          </span>
                        </div>
                      </div>
                      {/* Trial-specific actions */}
                      {subscription.usage_info && subscription.usage_info.trial_days_remaining > 0 && 
                       (subscription.usage_info.message_percentage >= 100 ||
                        subscription.usage_info.minute_percentage >= 100 ||
                        subscription.usage_info.trial_days_remaining <= 0) && (
                          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <span className="font-semibold text-orange-700">Trial Limit Reached</span>
                            </div>
                            {paymentMethods.length === 0 ? (
                              <>
                                <p className="text-sm text-orange-700 mb-3">
                                  Add a payment method to start your paid plan and continue using all features.
                                </p>
                                <Button
                                  onClick={() => setShowAddPaymentModal(true)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Payment Method
                                </Button>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-orange-700 mb-3">
                                  Start your paid plan now to continue using all features without limits.
                                </p>
                                <Button
                                  onClick={() => handleStartPaidPlan(subscription.stripe_subscription_id)}
                                  className="bg-orange-600 hover:bg-orange-700 text-white"
                                  disabled={upgrading}
                                >
                                  {upgrading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Starting Paid Plan...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Start Paid Plan Now
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                      {/* Incomplete payment actions */}
                      {subscription.status === "incomplete" && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="font-semibold text-yellow-700">Payment Required</span>
                          </div>
                          <p className="text-sm text-yellow-700 mb-3">
                            Complete your payment to activate your subscription.
                          </p>
                          <Button
                            onClick={() => handleCompletePayment(subscription.stripe_subscription_id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={paymentLoading}
                          >
                            {paymentLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Confirming...
                              </>
                            ) : (
                              "Complete Payment"
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Reactivation option */}
                      {subscription.cancel_at_period_end && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-green-700">Subscription Scheduled for Cancellation</span>
                          </div>
                          <p className="text-sm text-green-700 mb-3">
                            Your subscription will end on {formatDate(subscription.current_period_end)}. You can reactivate it anytime before then.
                          </p>
                          <Button
                            onClick={() => handleReactivateSubscription(subscription.stripe_subscription_id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Reactivate Subscription
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Methods</h3>
            <Button onClick={handleAddPaymentMethod} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </div>

          {paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No payment methods saved</p>
                <Button onClick={handleAddPaymentMethod} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Card
                </Button>
              </CardContent>
            </Card>
          ) : (
            (() => {
              // Find the default payment method, or use the first one if no default is set
              const defaultMethod = paymentMethods.find(method => method.is_default) || paymentMethods[0];
              
              return (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="font-semibold">
                            •••• •••• •••• {defaultMethod.card.last4}
                          </p>
                          <p className="text-sm text-gray-600">
                            {defaultMethod.card.brand.toUpperCase()} • Expires{" "}
                            {defaultMethod.card.exp_month}/{defaultMethod.card.exp_year}
                          </p>
                          <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                            Default
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {paymentMethods.length > 1 && (
                          <span className="text-xs text-gray-500">
                            +{paymentMethods.length - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()
          )}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={handlePaymentMethodAdded}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSubscriptionToCancel(null);
        }}
        subscription={subscriptionToCancel}
        onConfirm={handleCancelSubscription}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {confirmAction.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction.message}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelAction}
              >
                {confirmAction.cancelText || "Cancel"}
              </Button>
              <Button
                onClick={handleConfirmAction}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {confirmAction.confirmText || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPanel;
