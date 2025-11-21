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

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitStatus: UsageLimitStatus;
  currentPlan: PlanWithLimitations | null;
  featureType: "chat" | "call";
  expertSlug?: string;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  isOpen,
  onClose,
  limitStatus,
  currentPlan,
  featureType,
  expertSlug,
}) => {
  const router = useRouter();
  const getLimitMessage = () => {
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
  };

  const limitInfo = getLimitMessage();
  const IconComponent = limitInfo.icon;

  const getResetTime = () => {
    // No daily limits, so no reset time needed
    return null;
  };

  const getUpgradeCtaText = () => {
    if (featureType === "chat") {
      return "Upgrade to send unlimited messages";
    }
    return "Upgrade for unlimited call minutes";
  };

  const handleUpgradeClick = () => {
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
              <h4 className="font-medium text-gray-900 mb-3">Current Usage</h4>
              <div className="space-y-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleUpgradeClick} className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              {getUpgradeCtaText()}
            </Button>

            <Button variant="outline" onClick={onClose} className="w-full">
              I'll wait for the limit to reset
            </Button>
          </div>

          {/* Plan Information */}
          <div className="text-center text-xs text-gray-500 pt-2 border-t">
            Current Plan:{" "}
            <span className="font-medium">{currentPlan?.name}</span>
            {currentPlan?.billing_interval && (
              <>
                {" "}
                • ${currentPlan.price}/{currentPlan.billing_interval}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LimitReachedModal;
