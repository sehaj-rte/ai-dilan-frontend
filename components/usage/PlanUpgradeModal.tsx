"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  MessageCircle,
  Phone,
  Clock,
  Zap,
  X,
} from "lucide-react";
import {
  PlanWithLimitations,
  UsageLimitStatus,
} from "@/types/plan-limitations";
import { API_URL } from "@/lib/config";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  expertId: string;
  currentPlan: PlanWithLimitations | null;
  limitStatus: UsageLimitStatus;
  onUpgradeSuccess?: (planId: string) => void;
}

interface AvailablePlan extends PlanWithLimitations {
  recommended?: boolean;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  expertId,
  currentPlan,
  limitStatus,
  onUpgradeSuccess,
}) => {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available plans for the expert
  const fetchAvailablePlans = async () => {
    if (!expertId || !isAuthenticated) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/plans/expert/${expertId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out current plan and mark recommended plans
          const filteredPlans = data.plans
            .filter((plan: PlanWithLimitations) => plan.id !== currentPlan?.id)
            .map((plan: PlanWithLimitations, index: number) => ({
              ...plan,
              recommended: index === 1, // Mark second plan as recommended
            }));

          setAvailablePlans(filteredPlans);
        }
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError("Failed to load available plans");
    } finally {
      setLoading(false);
    }
  };

  // Handle plan upgrade
  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setUpgrading(planId);
      setError(null);

      const response = await fetch(`${API_URL}/subscriptions/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          expert_id: expertId,
          new_plan_id: planId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.payment_required && data.checkout_url) {
          // Redirect to Stripe checkout
          window.location.href = data.checkout_url;
        } else {
          // Upgrade successful
          onUpgradeSuccess?.(planId);
          onClose();
        }
      } else {
        setError(data.message || "Failed to upgrade plan");
      }
    } catch (err) {
      console.error("Error upgrading plan:", err);
      setError("An error occurred during upgrade");
    } finally {
      setUpgrading(null);
    }
  };

  // Get limit reached message
  const getLimitReachedMessage = () => {
    switch (limitStatus.limitReachedType) {
      case "messages":
        return "You've reached your monthly message limit";
      case "minutes":
        return "You've reached your monthly call minutes limit";

      default:
        return "Upgrade to continue using all features";
    }
  };

  // Format plan features
  const formatPlanFeatures = (plan: PlanWithLimitations): string[] => {
    const features: string[] = [];

    if (plan.message_limit) {
      features.push(
        `${plan.message_limit} messages per ${plan.billing_interval}`,
      );
    } else {
      features.push("Unlimited messages");
    }

    if (plan.minute_limit) {
      features.push(
        `${plan.minute_limit} call minutes per ${plan.billing_interval}`,
      );
    } else {
      features.push("Unlimited call minutes");
    }

    // Add default features
    features.push("Priority support");
    features.push("24/7 access");

    return features;
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailablePlans();
    }
  }, [isOpen, expertId, isAuthenticated]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {getLimitReachedMessage()}. Choose a plan that fits your needs.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading plans...</span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.recommended ? "ring-2 ring-blue-500" : ""}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      <Zap className="h-3 w-3 mr-1" />
                      Recommended
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold text-gray-900">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-600">
                      /{plan.billing_interval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {formatPlanFeatures(plan).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                  >
                    {upgrading === plan.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Upgrading...
                      </div>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to {plan.name}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Current Plan Info */}
        {currentPlan && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">
              Current Plan: {currentPlan.name}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {currentPlan.message_limit && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                  <span>
                    {limitStatus.messagesRemaining || 0} /{" "}
                    {currentPlan.message_limit} messages
                  </span>
                </div>
              )}

              {currentPlan.minute_limit && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>
                    {limitStatus.minutesRemaining || 0} /{" "}
                    {currentPlan.minute_limit} minutes
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PlanUpgradeModal;
