"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthlyWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  warningMessage: string;
  currentUsage: number;
  monthlyThreshold: number;
  usageType: string;
  planName: string;
  subscriptionMonths: number;
}

export const MonthlyWarningModal: React.FC<MonthlyWarningModalProps> = ({
  isOpen,
  onClose,
  warningMessage,
  currentUsage,
  monthlyThreshold,
  usageType,
  planName,
  subscriptionMonths,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Monthly Usage Warning
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-4">{warningMessage}</p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Monthly Usage:</span>
                  <div className="font-semibold text-orange-700">
                    {currentUsage} {usageType}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Monthly Threshold:</span>
                  <div className="font-semibold text-gray-700">
                    {monthlyThreshold} {usageType}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Plan:</span>
                  <div className="font-semibold text-gray-700">{planName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Billing Period:</span>
                  <div className="font-semibold text-gray-700">
                    {subscriptionMonths} month{subscriptionMonths > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">What does this mean?</h4>
            <p className="text-sm text-blue-800">
              This is a friendly reminder to help you pace your usage throughout your subscription period. 
              You can continue using the service - this warning doesn't block any functionality.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it, thanks!
          </Button>
        </div>
      </div>
    </div>
  );
};