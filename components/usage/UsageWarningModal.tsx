"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, MessageCircle, Phone, Clock } from "lucide-react";

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
  trial_days_remaining?: number;
}

interface UsageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageStats: UsageStats;
  expertName: string;
  onUpgrade?: () => void;
}

const UsageWarningModal: React.FC<UsageWarningModalProps> = ({
  isOpen,
  onClose,
  usageStats,
  expertName,
  onUpgrade,
}) => {
  const isNearLimit = 
    usageStats.messages.percentage >= 80 || 
    usageStats.minutes.percentage >= 80;

  const isAtLimit = 
    usageStats.messages.percentage >= 100 || 
    usageStats.minutes.percentage >= 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-6 h-6 ${
              isAtLimit ? 'text-red-500' : 'text-yellow-500'
            }`} />
            {isAtLimit ? 'Usage Limit Reached' : 'Usage Warning'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Trial Days Remaining */}
          {usageStats.trial_days_remaining !== undefined && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Trial Period</span>
              </div>
              <p className="text-blue-800">
                {usageStats.trial_days_remaining > 0 
                  ? `${usageStats.trial_days_remaining} days remaining in your free trial`
                  : 'Your trial period has ended'
                }
              </p>
            </div>
          )}

          {/* Message Usage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">Messages</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {usageStats.messages.used}</span>
                <span>Limit: {usageStats.messages.limit}</span>
              </div>
              <Progress 
                value={usageStats.messages.percentage} 
                className="h-3"
              />
              <p className="text-sm text-gray-600">
                {usageStats.messages.percentage.toFixed(1)}% of your message limit used
              </p>
            </div>
          </div>

          {/* Voice Minutes Usage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Voice Minutes</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {usageStats.minutes.used}</span>
                <span>Limit: {usageStats.minutes.limit}</span>
              </div>
              <Progress 
                value={usageStats.minutes.percentage} 
                className="h-3"
              />
              <p className="text-sm text-gray-600">
                {usageStats.minutes.percentage.toFixed(1)}% of your voice minutes used
              </p>
            </div>
          </div>

          {/* Warning/Limit Message */}
          <div className={`rounded-lg p-4 ${
            isAtLimit 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm ${
              isAtLimit ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {isAtLimit 
                ? `You've reached your usage limit for ${expertName}. To continue using the service, please upgrade to a paid plan.`
                : `You're approaching your usage limit for ${expertName}. Consider upgrading to avoid service interruption.`
              }
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {isAtLimit ? 'Close' : 'Continue Trial'}
          </Button>
          {onUpgrade && (
            <Button 
              onClick={onUpgrade} 
              className={`flex-1 ${
                isAtLimit 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              } text-white`}
            >
              {isAtLimit ? 'Start Paid Plan Now' : 'Upgrade Plan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsageWarningModal;