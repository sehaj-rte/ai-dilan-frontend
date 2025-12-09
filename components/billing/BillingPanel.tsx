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
  Trash2,
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
  plan_currency: string;
  plan_interval: string;
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
}

const BillingPanel: React.FC<BillingPanelProps> = ({
  userToken,
  expertSlug, // Add expertSlug prop
  usageContext,
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); // Add plans state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null); // Add selected plan state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<Subscription | null>(null);
  const [upgrading, setUpgrading] = useState(false); // Add upgrading state
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null); // Add selected subscription for upgrade
  const [expertId, setExpertId] = useState<string | null>(null); // Add expertId state

  const {
    toasts,
    removeToast,
    error: showError,
    success: showSuccess,
  } = useToast();

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!userToken) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch expert ID if expertSlug is provided
        let expertIdLocal = null;
        if (expertSlug) {
          try {
            const expertResponse = await fetch(
              `${API_URL}/public/expert/${expertSlug}`,
            );
            const expertData = await expertResponse.json();

            if (expertData.success && expertData.expert) {
              expertIdLocal = expertData.expert.id;
              setExpertId(expertData.expert.id);
            }
          } catch (expertError) {
            console.error("Error fetching expert data:", expertError);
          }
        }

        // Fetch subscriptions from database (more reliable)
        const subscriptionsResponse = await fetch(
          `${API_URL}/payments/subscriptions/database`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        );
        const subscriptionsData = await subscriptionsResponse.json();

        if (subscriptionsData.success) {
          // Filter subscriptions to only show those for the current expert if expertId is available
          let filteredSubscriptions = subscriptionsData.subscriptions || [];
          if (expertIdLocal) {
            filteredSubscriptions = filteredSubscriptions.filter(
              (sub: Subscription) => sub.expert_id === expertIdLocal,
            );
          }

          setSubscriptions(filteredSubscriptions);

          // Find the subscription for this expert if we have one
          if (expertIdLocal && filteredSubscriptions.length > 0) {
            // Only consider active and trialing subscriptions
            const activeSubscriptions = filteredSubscriptions.filter(
              (sub: Subscription) => sub.status === "active" || sub.status === "trialing",
            );
            const expertSubscription =
              activeSubscriptions.length > 0 ? activeSubscriptions[0] : null; // Take the first active one
            setSelectedSubscription(expertSubscription);
          } else if (expertIdLocal) {
            // No subscription for this expert yet
            setSelectedSubscription(null);
          }
        } else {
          console.error(
            "Failed to fetch subscriptions:",
            subscriptionsData.error,
          );
        }

        // Fetch payment methods
        const paymentMethodsResponse = await fetch(
          `${API_URL}/payments/payment-methods`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        );
        const paymentMethodsData = await paymentMethodsResponse.json();

        if (paymentMethodsData.success) {
          setPaymentMethods(paymentMethodsData.payment_methods || []);
        }

        // Fetch expert plans if expertSlug is provided
        if (expertSlug) {
          try {
            const plansResponse = await fetch(
              `${API_URL}/public/expert/${expertSlug}/plans`,
            );
            const plansData = await plansResponse.json();

            if (plansData.success && plansData.plans) {
              // Transform plans to match our interface with limit fields
              const transformedPlans = plansData.plans.map((plan: any) => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                currency: plan.currency || "USD",
                billing_interval: plan.billing_interval,
                message_limit: plan.message_limit,
                minute_limit: plan.minute_limit,
                features: ["Priority support", "24/7 access"],
                // Always mark the second plan as recommended
                recommended:
                  plan.name.toLowerCase().includes("pro") || plan.recommended,
              }));

              setPlans(transformedPlans);
              // Auto-select the recommended plan or the first one
              const recommendedPlan =
                transformedPlans.find((p: Plan) => p.recommended) ||
                transformedPlans[0];
              setSelectedPlan(recommendedPlan);
            }
          } catch (planError) {
            console.error("Error fetching expert plans:", planError);
            // Fallback to mock data if fetching plans fails
            setMockPlans();
          }
        } else {
          // Fallback to mock data if no expertSlug provided
          setMockPlans();
        }
      } catch (err) {
        console.error("Error fetching billing data:", err);
        setError("Failed to load billing information");
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [userToken, expertSlug, expertId]);

  // Set mock plans as fallback with limit fields
  const setMockPlans = () => {
    const mockPlans: Plan[] = [
      {
        id: "1",
        name: "Basic Plan",
        price: 29,
        currency: "USD",
        billing_interval: "month",
        message_limit: 100,
        minute_limit: 30,
        features: ["Email support", "Cancel anytime", "Basic analytics"],
        recommended: false,
      },
      {
        id: "2",
        name: "Pro Plan",
        price: 59,
        currency: "USD",
        billing_interval: "month",
        message_limit: 500,
        minute_limit: 120,
        features: [
          "Priority support",
          "Advanced analytics",
          "Custom integrations",
          "Cancel anytime",
        ],
        recommended: true,
      },
      {
        id: "3",
        name: "Enterprise Plan",
        price: 99,
        currency: "USD",
        billing_interval: "month",
        message_limit: null, // Unlimited
        minute_limit: null, // Unlimited
        features: [
          "Dedicated support",
          "Custom branding",
          "API access",
          "SLA guarantee",
        ],
        recommended: false,
      },
    ];

    // Auto-select the recommended plan or the first one
    const recommendedPlan =
      mockPlans.find((p) => p.recommended) || mockPlans[0];
    setSelectedPlan(recommendedPlan);
  };

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

  // Generate dynamic features based on plan limits (always show plan features, not trial limits)
  const generatePlanFeatures = (plan: Plan, subscription?: Subscription) => {
    const features = [...plan.features]; // Start with existing features

    // Always show the actual plan limits, not trial limits
    // Add message limit feature
    if (plan.message_limit !== undefined && plan.message_limit !== null) {
      if (plan.message_limit > 0) {
        features.unshift(
          `${plan.message_limit} chat messages per ${plan.billing_interval}`,
        );
      } else {
        features.unshift("Unlimited chat messages");
      }
    } else {
      // Default to unlimited if not specified
      features.unshift("Unlimited chat messages");
    }

    // Add minute limit feature
    if (plan.minute_limit !== undefined && plan.minute_limit !== null) {
      if (plan.minute_limit > 0) {
        features.unshift(
          `${plan.minute_limit} voice call minutes per ${plan.billing_interval}`,
        );
      } else {
        features.unshift("Unlimited voice calls");
      }
    } else {
      // Default to unlimited if not specified
      features.unshift("Unlimited voice calls");
    }

    return features;
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

      const data = await response.json();
      if (data.success) {
        // Refresh subscriptions
        setSubscriptions((prev) =>
          prev.map((sub) =>
            sub.stripe_subscription_id === subscriptionId
              ? { ...sub, cancel_at_period_end: true }
              : sub,
          ),
        );
        
        const subscription = subscriptions.find(
          (sub) => sub.stripe_subscription_id === subscriptionId,
        );
        
        showSuccess(
          `Subscription cancelled successfully. You'll continue to have access until ${subscription ? formatDate(subscription.current_period_end) : 'the end of your billing period'}.`
        );
      } else {
        showError(
          "Failed to cancel subscription: " + (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      console.error("Error canceling subscription:", err);
      showError("Failed to cancel subscription");
    }
  };

  const handleShowCancelModal = (subscription: Subscription) => {
    setSubscriptionToCancel(subscription);
    setShowCancelModal(true);
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to reactivate this subscription?"))
      return;

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
        // Refresh subscriptions
        setSubscriptions((prev) =>
          prev.map((sub) =>
            sub.stripe_subscription_id === subscriptionId
              ? { ...sub, cancel_at_period_end: false }
              : sub,
          ),
        );
        showSuccess("Subscription reactivated successfully");
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

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/payments/payment-methods/${paymentMethodId}/default`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        showSuccess("Default payment method updated successfully");
        // Refresh payment methods to show updated default
        const paymentMethodsResponse = await fetch(
          `${API_URL}/payments/payment-methods`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        );
        const paymentMethodsData = await paymentMethodsResponse.json();
        if (paymentMethodsData.success) {
          setPaymentMethods(paymentMethodsData.payment_methods || []);
        }
      } else {
        showError(
          "Failed to update default payment method: " +
            (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      console.error("Error setting default payment method:", err);
      showError("Failed to update default payment method");
    }
  };

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true);
  };

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentModal(false);
    showSuccess("Payment method added successfully");
    // Refresh billing data to show new payment method
    // Fetch updated payment methods instead of reloading the page
    const fetchPaymentMethods = async () => {
      try {
        const paymentMethodsResponse = await fetch(
          `${API_URL}/payments/payment-methods`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        );
        const paymentMethodsData = await paymentMethodsResponse.json();
        if (paymentMethodsData.success) {
          setPaymentMethods(paymentMethodsData.payment_methods || []);
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
      }
    };
    fetchPaymentMethods();
  };

  // Handle incomplete subscription payment confirmation
  const handleCompletePayment = async (subscriptionId: string) => {
    try {
      setLoading(true);

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
      setLoading(false);
    }
  };

  // Handle plan upgrade
  const handleUpgradePlan = async (plan: Plan) => {
    setSelectedPlan(plan);

    // Add a small delay to ensure the selectedPlan state is updated
    await new Promise((resolve) => setTimeout(resolve, 10));

    // If we don't have a selected subscription but we're viewing plans for a specific expert,
    // we need to create a new subscription rather than replace an existing one
    if (!selectedSubscription && expertId) {
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
    if (!confirm("Are you sure you want to end your trial and start the paid plan now? This action cannot be undone.")) {
      return;
    }

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
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (data.requires_payment_action) {
          // Payment is incomplete but trial was ended
          showSuccess("Trial ended. Please complete payment to activate your plan.");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Generic success
          showSuccess("Trial ended successfully!");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
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
        {/* Plan Selection - Added section */}
        {plans.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
            {expertSlug && (
              <p className="text-gray-600 mb-4">
                Plans for expert: {expertSlug}
              </p>
            )}
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-4 py-2">
                {plans.map((plan, index) => {
                  // Check if this is the current plan for any ACTIVE or TRIALING subscription
                  const isCurrentPlan = subscriptions.some(
                    (sub) => sub.plan_id === plan.id && (sub.status === "active" || sub.status === "trialing"),
                  );
                  // Always show the badge on the second plan (index 1)
                  const showRecommendedBadge = index === 1 && plan.recommended;
                  
                  // Find the current subscription for this plan to show trial info if applicable
                  const currentSubscription = subscriptions.find(
                    (sub) => sub.plan_id === plan.id && (sub.status === "active" || sub.status === "trialing")
                  );
                  
                  const dynamicFeatures = generatePlanFeatures(plan, currentSubscription);

                  return (
                    <div key={plan.id} className="relative flex justify-center">
                      {/* Recommended Badge */}
                      {showRecommendedBadge && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                            Recommended
                          </Badge>
                        </div>
                      )}
                      
                      {/* Current Plan Ribbon */}
                      {isCurrentPlan && (
                        <div className="absolute -top-1 -right-1 z-20">
                          <div className="relative">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-12 border-2 border-white hover:scale-105 transition-transform duration-200">
                              ✓ Current
                            </div>
                          </div>
                        </div>
                      )}
                      <Card
                        className={`w-full max-w-[300px] cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col min-h-[500px] ${
                          isCurrentPlan
                            ? "ring-4 ring-green-500 ring-offset-2 border-green-200 mt-2 mr-2"
                            : selectedPlan?.id === plan.id
                              ? "ring-4 ring-blue-500 ring-offset-2 border-blue-200"
                              : "hover:border-gray-300"
                        }`}
                        onClick={(e) => {
                          // Only select the plan if not clicking on the action button
                          if (!isCurrentPlan) {
                            setSelectedPlan(plan);
                          }
                        }}
                      >
                        <CardHeader className="pb-4 pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-xl">
                                  {plan.name}
                                </CardTitle>
                                {currentSubscription && currentSubscription.status === "trialing" && (
                                  <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs border border-blue-300">
                                    Trial ({currentSubscription.usage_info?.trial_days_remaining || 0}d left)
                                  </Badge>
                                )}
                              </div>
                              <div className="text-2xl font-bold text-blue-600 mt-3">
                                {currentSubscription && currentSubscription.status === "trialing" ? (
                                  <>
                                    <span className="text-green-600">FREE</span>
                                    <span className="text-base text-gray-500 font-normal ml-1">
                                      (Trial)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    ${plan.price}
                                    <span className="text-base text-gray-500 font-normal">
                                      /{plan.billing_interval}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {!isCurrentPlan && selectedPlan?.id === plan.id && (
                              <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 pb-6 flex-grow flex flex-col">
                          {/* Plan Features */}
                          <ul className="space-y-3 text-sm flex-grow">
                            {dynamicFeatures.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Trial Usage Display (only for current trial plan) */}
                          {isCurrentPlan && currentSubscription && currentSubscription.status === "trialing" && currentSubscription.usage_info && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="text-xs font-semibold text-blue-800 mb-3">
                                Trial Usage
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Messages Used</span>
                                    <span>{currentSubscription.usage_info.messages_used}/{currentSubscription.usage_info.message_limit}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full" 
                                      style={{ width: `${Math.min(currentSubscription.usage_info.message_percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Minutes Used</span>
                                    <span>{currentSubscription.usage_info.minutes_used}/{currentSubscription.usage_info.minute_limit}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full" 
                                      style={{ width: `${Math.min(currentSubscription.usage_info.minute_percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                        {/* Action button at the bottom of each card */}
                        <div className="px-6 pb-8 pt-4 mt-auto">
                          {(() => {
                            if (isCurrentPlan) {
                              return (
                                <Button
                                  variant="outline"
                                  className="w-full py-3 bg-green-50 border-green-200 text-green-700"
                                  disabled
                                >
                                  ✓ Current Plan
                                </Button>
                              );
                            }

                            if (!selectedSubscription) {
                              // No subscription yet - show subscribe
                              return (
                                <Button
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlan(plan);
                                    setTimeout(() => handleUpgradePlan(plan), 0);
                                  }}
                                  disabled={upgrading}
                                >
                                  {upgrading && selectedPlan?.id === plan.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Subscribing...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Subscribe to Plan
                                    </>
                                  )}
                                </Button>
                              );
                            }

                            // Has subscription - determine if upgrade or downgrade
                            const currentPlanPrice = selectedSubscription.plan_price;
                            const targetPlanPrice = plan.price;
                            
                            if (targetPlanPrice > currentPlanPrice) {
                              // Upgrade
                              return (
                                <Button
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlan(plan);
                                    setTimeout(() => handleUpgradePlan(plan), 0);
                                  }}
                                  disabled={upgrading}
                                >
                                  {upgrading && selectedPlan?.id === plan.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Upgrading...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Upgrade Plan
                                    </>
                                  )}
                                </Button>
                              );
                            } else {
                              // Downgrade - show disabled button with explanation
                              return (
                                <div className="space-y-2">
                                  <Button
                                    variant="outline"
                                    className="w-full py-3 text-gray-500 cursor-not-allowed"
                                    disabled
                                  >
                                    Lower Plan
                                  </Button>
                                  <p className="text-xs text-gray-500 text-center">
                                    Contact support for downgrades
                                  </p>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Remove the global upgrade button since we now have individual buttons in each card */}
            </div>
          </div>
        )}

        {/* Active Subscriptions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Active Subscriptions</h2>
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
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <div className="flex items-center justify-between md:justify-start gap-2">
                          <div>
                            <CardTitle className="text-lg">
                              {subscription.plan_name}
                            </CardTitle>
                            {subscription.expert_name && (
                              <p className="text-sm text-gray-600 mt-1">
                                Expert: {subscription.expert_name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-semibold">
                                {subscription.status === "trialing" ? (
                                  <span className="text-green-600">FREE (Trial)</span>
                                ) : (
                                  `$${subscription.plan_price}/${subscription.plan_interval}`
                                )}
                              </span>
                            </div>
                            {/* Trial Usage Information */}
                            {subscription.status === "trialing" && subscription.usage_info && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs font-semibold text-blue-800 mb-2">
                                  Trial Usage ({subscription.usage_info.trial_days_remaining} days left)
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Messages:</span>
                                    <span className="font-medium">
                                      {subscription.usage_info.messages_used}/{subscription.usage_info.message_limit}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full" 
                                      style={{ width: `${subscription.usage_info.message_percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Minutes:</span>
                                    <span className="font-medium">
                                      {subscription.usage_info.minutes_used}/{subscription.usage_info.minute_limit}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full" 
                                      style={{ width: `${subscription.usage_info.minute_percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                                
                                {/* Show Start Paid Plan button if trial is exhausted */}
                                {(subscription.usage_info.message_percentage >= 100 || 
                                  subscription.usage_info.minute_percentage >= 100 ||
                                  subscription.usage_info.trial_days_remaining <= 0) && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-orange-500" />
                                      <span className="text-xs font-semibold text-orange-700">
                                        Trial Limit Reached
                                      </span>
                                    </div>
                                    {paymentMethods.length === 0 ? (
                                      <>
                                        <p className="text-xs text-red-600 mb-3">
                                          Add a payment method to start your paid plan and continue using all features.
                                        </p>
                                        <Button
                                          onClick={() => setShowAddPaymentModal(true)}
                                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
                                        >
                                          <Plus className="h-3 w-3 mr-2" />
                                          Add Payment Method
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xs text-gray-600 mb-3">
                                          Start your paid plan now to continue using all features without limits.
                                        </p>
                                        <Button
                                          onClick={() => handleStartPaidPlan(subscription.stripe_subscription_id)}
                                          className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs py-2"
                                          disabled={upgrading}
                                        >
                                          {upgrading ? (
                                            <>
                                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                              Starting Paid Plan...
                                            </>
                                          ) : (
                                            <>
                                              <Zap className="h-3 w-3 mr-2" />
                                              Start Paid Plan Now
                                            </>
                                          )}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-1 flex flex-col items-center justify-center">
                        <p className="text-sm text-gray-600">Current Period</p>
                        <p className="font-semibold text-center">
                          {formatDate(subscription.current_period_start)} -{" "}
                          {formatDate(subscription.current_period_end)}
                        </p>
                      </div>

                      <div className="md:col-span-1 flex items-center justify-between md:justify-end gap-2">
                        <div className="hidden md:block">
                          {subscription.status === "trialing" ? (
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(subscription.status)}
                              {subscription.usage_info && (
                                <span className="text-xs text-blue-600 font-medium">
                                  {subscription.usage_info.trial_days_remaining} days left
                                </span>
                              )}
                            </div>
                          ) : (
                            getStatusBadge(subscription.status)
                          )}
                        </div>
                        <div className="flex gap-2">
                          {subscription.status === "incomplete" ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-orange-600">
                                Payment required
                              </span>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleCompletePayment(
                                    subscription.stripe_subscription_id,
                                  )
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  "Complete Payment"
                                )}
                              </Button>
                            </div>
                          ) : subscription.cancel_at_period_end ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-orange-600">
                                Cancels at period end
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleReactivateSubscription(
                                    subscription.stripe_subscription_id,
                                  )
                                }
                                className="text-green-600 hover:text-green-700"
                              >
                                Reactivate
                              </Button>
                            </div>
                          ) : subscription.status === "trialing" && 
                             subscription.usage_info && 
                             (subscription.usage_info.message_percentage >= 100 || 
                              subscription.usage_info.minute_percentage >= 100 ||
                              subscription.usage_info.trial_days_remaining <= 0) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-orange-600 font-medium">
                                Trial exhausted
                              </span>
                              {paymentMethods.length === 0 ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setShowAddPaymentModal(true)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Payment Method
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    handleStartPaidPlan(
                                      subscription.stripe_subscription_id,
                                    )
                                  }
                                  className="bg-orange-600 hover:bg-orange-700 text-white"
                                  disabled={upgrading}
                                >
                                  {upgrading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Starting...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="mr-2 h-4 w-4" />
                                      Start Paid Plan
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : subscription.status === "active" ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncSubscriptionStatus(subscription.stripe_subscription_id)}
                                className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                title="Sync status with Stripe"
                              >
                                Sync Status
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShowCancelModal(subscription)}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              >
                                Cancel Subscription
                              </Button>
                            </div>
                          ) : (
                            ""
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Usage Information - Show when usage context is available */}
                    {usageContext &&
                      usageContext.currentPlan &&
                      subscription.status === "active" && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-gray-900">
                              Usage This Period
                            </span>
                            {(!usageContext.limitStatus.canSendMessage ||
                              !usageContext.limitStatus.canMakeCall) && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                Limit Reached
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Messages Usage */}
                            {usageContext.currentPlan.message_limit && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-gray-500" />
                                    <span>Messages</span>
                                  </div>
                                  <span
                                    className={`${!usageContext.limitStatus.canSendMessage ? "text-red-600 font-medium" : "text-gray-600"}`}
                                  >
                                    {usageContext.currentPlan.message_limit -
                                      (usageContext.limitStatus
                                        .messagesRemaining || 0)}{" "}
                                    / {usageContext.currentPlan.message_limit}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      ((usageContext.currentPlan.message_limit -
                                        (usageContext.limitStatus
                                          .messagesRemaining || 0)) /
                                        usageContext.currentPlan
                                          .message_limit) *
                                        100 >=
                                      90
                                        ? "bg-red-500"
                                        : ((usageContext.currentPlan
                                              .message_limit -
                                              (usageContext.limitStatus
                                                .messagesRemaining || 0)) /
                                              usageContext.currentPlan
                                                .message_limit) *
                                              100 >=
                                            75
                                          ? "bg-yellow-500"
                                          : "bg-blue-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(((usageContext.currentPlan.message_limit - (usageContext.limitStatus.messagesRemaining || 0)) / usageContext.currentPlan.message_limit) * 100, 100)}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Minutes Usage */}
                            {usageContext.currentPlan.minute_limit && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span>Call Minutes</span>
                                  </div>
                                  <span
                                    className={`${!usageContext.limitStatus.canMakeCall ? "text-red-600 font-medium" : "text-gray-600"}`}
                                  >
                                    {usageContext.currentPlan.minute_limit -
                                      (usageContext.limitStatus
                                        .minutesRemaining || 0)}{" "}
                                    / {usageContext.currentPlan.minute_limit}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      ((usageContext.currentPlan.minute_limit -
                                        (usageContext.limitStatus
                                          .minutesRemaining || 0)) /
                                        usageContext.currentPlan.minute_limit) *
                                        100 >=
                                      90
                                        ? "bg-red-500"
                                        : ((usageContext.currentPlan
                                              .minute_limit -
                                              (usageContext.limitStatus
                                                .minutesRemaining || 0)) /
                                              usageContext.currentPlan
                                                .minute_limit) *
                                              100 >=
                                            75
                                          ? "bg-yellow-500"
                                          : "bg-blue-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(((usageContext.currentPlan.minute_limit - (usageContext.limitStatus.minutesRemaining || 0)) / usageContext.currentPlan.minute_limit) * 100, 100)}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Unlimited plan message */}
                          {!usageContext.currentPlan.message_limit &&
                            !usageContext.currentPlan.minute_limit && (
                              <div className="text-center py-2 text-green-600">
                                <span className="flex items-center justify-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Unlimited usage plan
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <Card key={method.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="font-semibold">
                            •••• •••• •••• {method.card.last4}
                          </p>
                          <p className="text-sm text-gray-600">
                            {method.card.brand.toUpperCase()} • Expires{" "}
                            {method.card.exp_month}/{method.card.exp_year}
                          </p>
                          {method.is_default && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.is_default ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSetDefaultPaymentMethod(method.id)
                            }
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Set Default
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-gray-400"
                          >
                            Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
    </div>
  );
};

export default BillingPanel;
