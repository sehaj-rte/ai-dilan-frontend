"use client";

import React from "react";
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
} from "lucide-react";
import {
  UsageLimitStatus,
  PlanWithLimitations,
} from "@/types/plan-limitations";
import { API_URL } from "@/lib/config";

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
  const isTrialSubscription = subscription?.status === "trialing";
  const trialUsage = subscription?.usage_info;

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
        const response = await fetch(`${API_URL}/payments/subscriptions/${subscription.stripe_subscription_id}/terminate-trial`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          onClose();
          // Refresh the page to update subscription status
          window.location.reload();
          return;
        }
      } catch (error) {
        console.error('Failed to terminate trial:', error);
      }
    }
    
    // Fallback to billing page
    onClose();
    const billingUrl = expertSlug
      ? `/billing?expert=${expertSlug}`
      : "/billing";
    router.push(billingUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleUpgradeClick} className="w-full">
              {isTrialSubscription ? (
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
              <Button variant="outline" onClick={onClose} className="w-full">
                I'll wait for the limit to reset
              </Button>
            )}
            
            {isTrialSubscription && (
              <Button variant="outline" onClick={onClose} className="w-full">
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
                  After trial: {currentPlan?.name} plan (${currentPlan?.price}/{currentPlan?.billing_interval})
                </span>
              </>
            ) : (
              <>
                Current Plan:{" "}
                <span className="font-medium">{currentPlan?.name}</span>
                {currentPlan?.billing_interval && (
                  <>
                    {" "}
                    • ${currentPlan.price}/{currentPlan.billing_interval}
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
