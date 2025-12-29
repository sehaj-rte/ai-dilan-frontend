"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Crown,
  MessageCircle,
  Phone,
  Clock,
  Zap,
  Loader2,
} from "lucide-react";
import {
  UsageLimitStatus,
  PlanWithLimitations,
} from "@/types/plan-limitations";
import { API_URL } from "@/lib/config";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitStatus: UsageLimitStatus;
  currentPlan: PlanWithLimitations | null;
  featureType: "chat" | "call";
  expertSlug?: string;
  subscription?: any; // Add subscription prop to detect trial status
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  isOpen,
  onClose,
  limitStatus,
  currentPlan,
  featureType,
  expertSlug,
  subscription,
}) => {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  
  const isTrialSubscription = subscription?.status === "trialing" || subscription?.usage_info?.is_trial;
  const trialUsage = subscription?.usage_info;

  // Handle payment confirmation for trial termination (3D Secure)
  const handleTrialPaymentConfirmation = async (clientSecret: string) => {
    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize. Please check your configuration.");
      }

      setUpgradeMessage("Authenticating payment...");

      // Confirm the payment with 3D Secure authentication
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

      if (error) {
        console.error("Payment confirmation error:", error);
        setUpgradeError(`Payment authentication failed: ${error.message}`);
        setUpgradeMessage(null);
      } else if (paymentIntent.status === "succeeded") {
        setUpgradeMessage("Payment confirmed! Your paid plan is now active.");
        setUpgradeError(null);
        // Refresh the page to show updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (paymentIntent.status === "processing") {
        setUpgradeMessage("Payment is being processed. Your plan will be activated shortly.");
        setUpgradeError(null);
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setUpgradeError(`Payment status: ${paymentIntent.status}. Please try again.`);
        setUpgradeMessage(null);
      }
    } catch (error) {
      console.error("Error confirming trial payment:", error);
      setUpgradeError("Failed to confirm payment. Please try again.");
      setUpgradeMessage(null);
    }
  };

  const getLimitMessage = () => {
    if (isTrialSubscription) {
      // Trial-specific messaging
      switch (limitStatus.limitReachedType) {
        case "messages":
          return {
            title: "Trial Message Limit Reached",
            description: `You've used all ${trialUsage?.message_limit || 0} messages in your ${trialUsage?.trial_days_remaining || 0}-day trial.`,
            icon: MessageCircle,
            color: "text-blue-500",
          };
        case "minutes":
          return {
            title: "Trial Call Minutes Limit Reached",
            description: `You've used all ${trialUsage?.minute_limit || 0} call minutes in your ${trialUsage?.trial_days_remaining || 0}-day trial.`,
            icon: Phone,
            color: "text-green-500",
          };
        default:
          return {
            title: "Trial Limit Reached",
            description: `You've reached your trial usage limit. Start your paid plan to continue.`,
            icon: Clock,
            color: "text-orange-500",
          };
      }
    } else {
      // Regular paid plan messaging
      switch (limitStatus.limitReachedType) {
        case "messages":
          return {
            title: "Monthly Message Limit Reached",
            description: `You've used all ${currentPlan?.message_limit} messages in your ${currentPlan?.name} plan for this month.`,
            icon: MessageCircle,
            color: "text-blue-500",
          };
        case "minutes":
          return {
            title: "Monthly Call Minutes Limit Reached",
            description: `You've used all ${currentPlan?.minute_limit} call minutes in your ${currentPlan?.name} plan for this month.`,
            icon: Phone,
            color: "text-green-500",
          };
        default:
          return {
            title: "Usage Limit Reached",
            description: "You've reached your usage limit for this feature.",
            icon: AlertTriangle,
            color: "text-red-500",
          };
      }
    }
  };

  const limitInfo = getLimitMessage();
  const IconComponent = limitInfo.icon;

  const getResetTime = () => {
    // No daily limits, so no reset time needed
    return null;
  };

  const getUpgradeCtaText = () => {
    if (isTrialSubscription) {
      return "Start Paid Plan Now";
    }
    if (featureType === "chat") {
      return "Upgrade to send unlimited messages";
    }
    return "Upgrade for unlimited call minutes";
  };

  const handleUpgradeClick = async () => {
    if (isTrialSubscription && subscription?.stripe_subscription_id) {
      // For trial subscriptions, immediately end trial and start paid plan
      try {
        setIsUpgrading(true);
        setUpgradeError(null);
        setUpgradeMessage("Ending trial and starting paid plan...");

        const response = await fetch(`${API_URL}/payments/subscriptions/${subscription.stripe_subscription_id}/terminate-trial`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();

        // Debug logging
        console.log("🔥 TRIAL TERMINATION RESPONSE:", data);

        if (data.success) {
          // Handle different payment scenarios
          if (data.requires_confirmation || data.requires_action) {
            // Payment requires additional authentication (3D Secure)
            setUpgradeMessage("Processing payment authentication...");
            await handleTrialPaymentConfirmation(data.client_secret);
          } else if (data.billing_started) {
            // Payment succeeded immediately
            setUpgradeMessage("Trial ended successfully! Your paid plan is now active.");
            setUpgradeError(null);
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (data.requires_payment_action) {
            // Payment is incomplete but trial was ended
            setUpgradeMessage("Trial ended. Please complete payment to activate your plan.");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            // Generic success
            setUpgradeMessage("Trial ended successfully!");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
          // Handle specific error cases
          if (data.requires_payment_method) {
            setUpgradeError("No payment method found. Please add a payment method first.");
            setUpgradeMessage(null);
            // Redirect to expert billing page to add payment method
            setTimeout(() => {
              const billingUrl = expertSlug ? `/expert/billing?expert=${expertSlug}` : "/expert/billing";
              router.push(billingUrl);
            }, 2000);
          } else {
            setUpgradeError("Failed to start paid plan: " + (data.error || "Unknown error"));
            setUpgradeMessage(null);
          }
        }
      } catch (error) {
        console.error('Failed to terminate trial:', error);
        setUpgradeError("Failed to start paid plan. Please try again.");
        setUpgradeMessage(null);
      } finally {
        setIsUpgrading(false);
      }
      return;
    }
    
    // Fallback to billing page
    onClose();
    const billingUrl = expertSlug
      ? `/expert/billing?expert=${expertSlug}`
      : "/expert/billing";
    router.push(billingUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={isUpgrading ? () => {} : onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <IconComponent className={`h-6 w-6 ${limitInfo.color}`} />
          </div>
          <DialogTitle className="text-xl">{limitInfo.title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {limitInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Usage Card */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {isTrialSubscription ? "Trial Usage" : "Current Usage"}
              </h4>
              <div className="space-y-2">
                {isTrialSubscription ? (
                  // Show trial usage
                  <>
                    {trialUsage?.message_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-gray-500" />
                          <span>Messages this trial</span>
                        </div>
                        <span className="font-medium">
                          {trialUsage.messages_used} / {trialUsage.message_limit}
                        </span>
                      </div>
                    )}
                    {trialUsage?.minute_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>Call minutes this trial</span>
                        </div>
                        <span className="font-medium">
                          {trialUsage.minutes_used} / {trialUsage.minute_limit}
                        </span>
                      </div>
                    )}
                    {trialUsage?.trial_days_remaining !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>Trial days remaining</span>
                        </div>
                        <span className="font-medium">
                          {trialUsage.trial_days_remaining} days
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  // Show regular plan usage
                  <>
                    {currentPlan?.message_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-gray-500" />
                          <span>Messages this month</span>
                        </div>
                        <span className="font-medium">
                          {currentPlan.message_limit -
                            (limitStatus.messagesRemaining || 0)}{" "}
                          / {currentPlan.message_limit}
                        </span>
                      </div>
                    )}
                    {currentPlan?.minute_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>Call minutes this month</span>
                        </div>
                        <span className="font-medium">
                          {currentPlan.minute_limit -
                            (limitStatus.minutesRemaining || 0)}{" "}
                          / {currentPlan.minute_limit}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Messages */}
          {upgradeMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm text-center">
              {upgradeMessage}
            </div>
          )}
          
          {upgradeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm text-center">
              {upgradeError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleUpgradeClick} 
              className="w-full" 
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isTrialSubscription ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {getUpgradeCtaText()}
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  {getUpgradeCtaText()}
                </>
              )}
            </Button>

            {!isTrialSubscription && (
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full"
                disabled={isUpgrading}
              >
                I'll wait for the limit to reset
              </Button>
            )}
            
            {isTrialSubscription && (
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full"
                disabled={isUpgrading}
              >
                Continue with trial limits
              </Button>
            )}
          </div>

          {/* Plan Information */}
          <div className="text-center text-xs text-gray-500 pt-2 border-t">
            {isTrialSubscription ? (
              <>
                <span className="font-medium">Trial Period</span>
                {trialUsage?.trial_days_remaining !== undefined && (
                  <> • {trialUsage.trial_days_remaining} days remaining</>
                )}
                <br />
                <span className="text-xs">
                  After trial: {currentPlan?.name} plan (£{currentPlan?.price}/{currentPlan?.billing_interval})
                </span>
              </>
            ) : (
              <>
                Current Plan:{" "}
                <span className="font-medium">{currentPlan?.name}</span>
                {currentPlan?.billing_interval && (
                  <>
                    {" "}
                    • £{currentPlan.price}/{currentPlan.billing_interval}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LimitReachedModal;
