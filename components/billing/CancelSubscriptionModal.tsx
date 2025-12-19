"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
} from "lucide-react";

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
  expert_name?: string;
}

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onConfirm: (subscriptionId: string) => Promise<void>;
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleConfirm = async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await onConfirm(subscription.stripe_subscription_id);
      onClose();
    } catch (error) {
      console.error("Error canceling subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Subscription Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{subscription.plan_name}</span>
              </div>
              {subscription.expert_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expert:</span>
                  <span className="font-medium">{subscription.expert_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">
                  £{subscription.plan_price}/{subscription.plan_interval}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Period:</span>
                <span className="font-medium">
                  {formatDate(subscription.current_period_start)} -{" "}
                  {formatDate(subscription.current_period_end)}
                </span>
              </div>
            </div>
          </div>

          {/* What Happens When You Cancel */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              What happens when you cancel:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Access continues until period end
                  </p>
                  <p className="text-xs text-gray-600">
                    You'll keep full access until {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    No immediate charges
                  </p>
                  <p className="text-xs text-gray-600">
                    Your subscription will not renew automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Can reactivate anytime
                  </p>
                  <p className="text-xs text-gray-600">
                    You can reactivate before the period ends to continue
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    No refunds for current period
                  </p>
                  <p className="text-xs text-gray-600">
                    You've already been charged for the current billing period
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            This action can be undone by reactivating your subscription before{" "}
            {formatDate(subscription.current_period_end)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSubscriptionModal;