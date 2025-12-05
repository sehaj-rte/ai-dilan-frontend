"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Phone,
  Clock,
  Zap,
  AlertTriangle,
  Crown,
} from "lucide-react";
import {
  UsageLimitStatus,
  PlanWithLimitations,
} from "@/types/plan-limitations";

interface UsageStatusBarProps {
  limitStatus: UsageLimitStatus;
  currentPlan: PlanWithLimitations | null;
  loading?: boolean;
  compact?: boolean;
  expertSlug?: string;
}

export const UsageStatusBar: React.FC<UsageStatusBarProps> = ({
  limitStatus,
  currentPlan,
  loading = false,
  compact = false,
  expertSlug,
}) => {
  const router = useRouter();

  // Don't show if unlimited or no plan
  if (!currentPlan || limitStatus.isUnlimited) {
    return null;
  }

  const formatUsageText = (
    used: number,
    limit: number | null,
    type: string,
  ) => {
    if (limit === null) return `${used} ${type} (unlimited)`;
    return `${used} / ${limit} ${type}`;
  };

  const calculateProgress = (used: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const hasUsageLimits = currentPlan.message_limit || currentPlan.minute_limit;

  if (!hasUsageLimits) {
    return null;
  }

  const handleUpgradeClick = () => {
    const billingUrl = expertSlug
      ? `/billing?expert=${expertSlug}`
      : "/billing";
    router.push(billingUrl);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded">
        {/* Show trial indicator in compact mode */}
        {(currentPlan as any)?.status === "trialing" && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="text-blue-600 font-medium">Trial</span>
          </div>
        )}
        {(limitStatus.messagesRemaining !== null || currentPlan.message_limit) && (
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <span>
              {limitStatus.messagesRemaining === null
                ? "∞"
                : limitStatus.messagesRemaining}{" "}
              left
            </span>
          </div>
        )}
        {(limitStatus.minutesRemaining !== null || currentPlan.minute_limit) && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>
              {limitStatus.minutesRemaining === null
                ? "∞"
                : `${limitStatus.minutesRemaining}min`}{" "}
              left
            </span>
          </div>
        )}
        {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpgradeClick}
            className="h-6 px-2 text-xs"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <h3 className="font-medium text-sm">
              {currentPlan.name} Usage
              {/* Show trial indicator if this is a trial */}
              {(currentPlan as any)?.status === "trialing" && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Trial
                </span>
              )}
            </h3>
          </div>
          {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600">Limit Reached</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Messages Usage */}
          {currentPlan.message_limit && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-gray-500" />
                  <span>Messages</span>
                </div>
                <span
                  className={`${!limitStatus.canSendMessage ? "text-red-600 font-medium" : "text-gray-600"}`}
                >
                  {formatUsageText(
                    currentPlan.message_limit -
                      (limitStatus.messagesRemaining || 0),
                    currentPlan.message_limit,
                    "used",
                  )}
                </span>
              </div>
              <Progress
                value={calculateProgress(
                  currentPlan.message_limit -
                    (limitStatus.messagesRemaining || 0),
                  currentPlan.message_limit,
                )}
                className="h-2"
              />
            </div>
          )}

          {/* Minutes Usage */}
          {currentPlan.minute_limit && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-gray-500" />
                  <span>Call Minutes</span>
                </div>
                <span
                  className={`${!limitStatus.canMakeCall ? "text-red-600 font-medium" : "text-gray-600"}`}
                >
                  {formatUsageText(
                    currentPlan.minute_limit -
                      (limitStatus.minutesRemaining || 0),
                    currentPlan.minute_limit,
                    "mins",
                  )}
                </span>
              </div>
              <Progress
                value={calculateProgress(
                  currentPlan.minute_limit -
                    (limitStatus.minutesRemaining || 0),
                  currentPlan.minute_limit,
                )}
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Upgrade Button */}
        {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
          <div className="mt-4 pt-3 border-t">
            <Button onClick={handleUpgradeClick} className="w-full" size="sm">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageStatusBar;
