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
    
    // Calculate monthly breakdown for multi-month plans
    const billingMonths = currentPlan?.billing_interval_count || 1;
    if (billingMonths > 1 && limit) {
      const monthlyLimit = Math.floor(limit / billingMonths);
      return `${used} / ${limit} ${type} (${monthlyLimit} per month)`;
    }
    
    return `${used} / ${limit} ${type}`;
  };

  const calculateProgress = (used: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const hasUsageLimits = currentPlan.message_limit || currentPlan.minute_limit;

  if (!hasUsageLimits) {
    return null;
  }

  const handleUpgradeClick = () => {
    const billingUrl = expertSlug
      ? `/expert/billing?expert=${expertSlug}`
      : "/expert/billing";
    router.push(billingUrl);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm bg-gradient-to-r from-gray-50 to-blue-50/30 px-4 py-2 rounded-xl border border-gray-200/50 shadow-sm">
        {/* Show trial indicator in compact mode */}
        {(currentPlan as any)?.status === "trialing" && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 rounded-full">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-blue-700 font-bold text-xs">Trial</span>
          </div>
        )}
        {(limitStatus.messagesRemaining !== null || currentPlan.message_limit) && (
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 rounded-full">
              <MessageCircle className="h-3 w-3 text-blue-600" />
            </div>
            <div>
              <span className="font-bold text-gray-900">
                {limitStatus.messagesRemaining === null ? "∞" : limitStatus.messagesRemaining}
              </span>
              <span className="text-gray-600 font-medium ml-1">messages left</span>
              {/* Show monthly breakdown for multi-month plans */}
              {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 && 
               currentPlan.message_limit && limitStatus.messagesRemaining !== null && (
                <div className="text-xs text-blue-600 font-medium">
                  {Math.floor(currentPlan.message_limit / currentPlan.billing_interval_count)}/mo
                </div>
              )}
            </div>
          </div>
        )}
        {(limitStatus.minutesRemaining !== null || currentPlan.minute_limit) && (
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 rounded-full">
              <Phone className="h-3 w-3 text-purple-600" />
            </div>
            <div>
              <span className="font-bold text-gray-900">
                {limitStatus.minutesRemaining === null ? "∞" : `${limitStatus.minutesRemaining} voice`}
              </span>
              <span className="text-gray-600 font-medium ml-1">minutes left</span>
              {/* Show monthly breakdown for multi-month plans */}
              {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 && 
               currentPlan.minute_limit && limitStatus.minutesRemaining !== null && (
                <div className="text-xs text-purple-600 font-medium">
                  {Math.floor(currentPlan.minute_limit / currentPlan.billing_interval_count)}/mo
                </div>
              )}
            </div>
          </div>
        )}
        {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpgradeClick}
            className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-white to-gray-50/50 border-gray-200/50 shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {currentPlan.name}
                {/* Show plan duration for multi-month plans */}
                {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 && (
                  <span className="ml-2 text-sm text-gray-500 font-medium">
                    ({currentPlan.billing_interval_count}-month plan)
                  </span>
                )}
              </h3>
              {/* Show trial indicator if this is a trial */}
              {(currentPlan as any)?.status === "trialing" && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs rounded-full font-bold border border-blue-200">
                  <Clock className="h-3 w-3" />
                  Trial Active
                </span>
              )}
            </div>
          </div>
          {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-bold">Limit Reached</span>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {/* Messages Usage */}
          {currentPlan.message_limit && (
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl p-4 border border-blue-100/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-gray-900">Messages</span>
                    {/* Show plan breakdown for multi-month plans */}
                    {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 && 
                     currentPlan.message_limit && (
                      <div className="text-xs text-blue-600 font-medium">
                        Monthly usage allowance
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 ? (
                    <div>
                      <div className={`text-xs font-bold ${!limitStatus.canSendMessage ? "text-red-600" : "text-gray-900"}`}>
                        {Math.floor((currentPlan.message_limit - (limitStatus.messagesRemaining || 0)) / currentPlan.billing_interval_count)} / {Math.floor(currentPlan.message_limit / currentPlan.billing_interval_count)} messages / month
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        ({currentPlan.message_limit - (limitStatus.messagesRemaining || 0)} / {currentPlan.message_limit} total)
                      </div>
                    </div>
                  ) : (
                    <div className={`text-xs font-bold ${!limitStatus.canSendMessage ? "text-red-600" : "text-gray-900"}`}>
                      {currentPlan.message_limit - (limitStatus.messagesRemaining || 0)} / {currentPlan.message_limit} messages
                    </div>
                  )}
                </div>
              </div>
              <Progress
                value={calculateProgress(
                  currentPlan.message_limit - (limitStatus.messagesRemaining || 0),
                  currentPlan.message_limit,
                )}
                className="h-2.5 bg-blue-100"
              />
            </div>
          )}

          {/* Voice Usage */}
          {currentPlan.minute_limit && (
            <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl p-4 border border-purple-100/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Phone className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-gray-900">Voice</span>
                    {/* Show plan breakdown for multi-month plans */}
                    {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 && 
                     currentPlan.minute_limit && (
                      <div className="text-xs text-purple-600 font-medium">
                        Monthly usage allowance
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {currentPlan.billing_interval_count && currentPlan.billing_interval_count > 1 ? (
                    <div>
                      <div className={`text-sm font-bold ${!limitStatus.canMakeCall ? "text-red-600" : "text-gray-900"}`}>
                        {Math.floor((currentPlan.minute_limit - (limitStatus.minutesRemaining || 0)) / currentPlan.billing_interval_count)} / {Math.floor(currentPlan.minute_limit / currentPlan.billing_interval_count)} min/mo
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        ({currentPlan.minute_limit - (limitStatus.minutesRemaining || 0)} / {currentPlan.minute_limit} total)
                      </div>
                    </div>
                  ) : (
                    <div className={`text-sm font-bold ${!limitStatus.canMakeCall ? "text-red-600" : "text-gray-900"}`}>
                      {currentPlan.minute_limit - (limitStatus.minutesRemaining || 0)} / {currentPlan.minute_limit} min
                    </div>
                  )}
                </div>
              </div>
              <Progress
                value={calculateProgress(
                  currentPlan.minute_limit - (limitStatus.minutesRemaining || 0),
                  currentPlan.minute_limit,
                )}
                className="h-2.5 bg-purple-100"
              />
            </div>
          )}
        </div>

        {/* Upgrade Button */}
        {(!limitStatus.canSendMessage || !limitStatus.canMakeCall) && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Button 
              onClick={handleUpgradeClick} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageStatusBar;
