"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Phone, Clock, AlertTriangle } from "lucide-react";

interface UsageStats {
  messages: {
    used: number;
    limit: number;
    percentage: number;
  };
  minutes: {
    used: number;
    limit: number;
    percentage: number;
  };
  is_trial: boolean;
  trial_days_remaining?: number;
}

interface UsageProgressIndicatorProps {
  usageStats: UsageStats;
  className?: string;
  compact?: boolean;
}

const UsageProgressIndicator: React.FC<UsageProgressIndicatorProps> = ({
  usageStats,
  className = "",
  compact = false,
}) => {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 100) return "text-red-700";
    if (percentage >= 80) return "text-yellow-700";
    return "text-green-700";
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {/* Messages */}
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Progress 
                value={usageStats.messages.percentage} 
                className="h-2 flex-1"
              />
              <span className={`text-xs font-medium ${getTextColor(usageStats.messages.percentage)}`}>
                {usageStats.messages.used}/{usageStats.messages.limit}
              </span>
            </div>
          </div>
        </div>

        {/* Minutes */}
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Progress 
                value={usageStats.minutes.percentage} 
                className="h-2 flex-1"
              />
              <span className={`text-xs font-medium ${getTextColor(usageStats.minutes.percentage)}`}>
                {usageStats.minutes.used}/{usageStats.minutes.limit}
              </span>
            </div>
          </div>
        </div>

        {/* Trial indicator */}
        {usageStats.is_trial && usageStats.trial_days_remaining !== undefined && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Clock className="w-3 h-3" />
            <span>{usageStats.trial_days_remaining}d</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Trial Status */}
          {usageStats.is_trial && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Free Trial</span>
              {usageStats.trial_days_remaining !== undefined && (
                <span className="text-blue-700">
                  ({usageStats.trial_days_remaining} days remaining)
                </span>
              )}
            </div>
          )}

          {/* Messages Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Messages</span>
              </div>
              <span className={`text-sm font-medium ${getTextColor(usageStats.messages.percentage)}`}>
                {usageStats.messages.used} / {usageStats.messages.limit}
              </span>
            </div>
            <Progress 
              value={usageStats.messages.percentage} 
              className="h-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {usageStats.messages.percentage.toFixed(1)}% used
              </span>
              {usageStats.messages.percentage >= 80 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Near limit</span>
                </div>
              )}
            </div>
          </div>

          {/* Voice Minutes Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Voice Minutes</span>
              </div>
              <span className={`text-sm font-medium ${getTextColor(usageStats.minutes.percentage)}`}>
                {usageStats.minutes.used} / {usageStats.minutes.limit}
              </span>
            </div>
            <Progress 
              value={usageStats.minutes.percentage} 
              className="h-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {usageStats.minutes.percentage.toFixed(1)}% used
              </span>
              {usageStats.minutes.percentage >= 80 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Near limit</span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Status */}
          {(usageStats.messages.percentage >= 100 || usageStats.minutes.percentage >= 100) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Usage Limit Reached</span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                You've reached your usage limit. Upgrade to continue using the service.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageProgressIndicator;