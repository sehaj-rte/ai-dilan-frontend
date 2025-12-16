"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  MessageCircle,
  Phone,
  Calendar,
  TrendingUp,
  X,
} from "lucide-react";

interface UsagePaceWarningProps {
  warnings: Array<{
    type: 'messages' | 'minutes';
    current_usage: number;
    total_limit: number;
    monthly_limit: number;
    days_elapsed: number;
    projected_monthly: number;
    days_to_monthly_limit: number;
    billing_months: number;
  }>;
  usageStats: {
    messages_used: number;
    minutes_used: number;
    days_elapsed: number;
    messages_per_day: number;
    minutes_per_day: number;
  };
  onDismiss: () => void;
}

export const UsagePaceWarning: React.FC<UsagePaceWarningProps> = ({
  warnings,
  usageStats,
  onDismiss,
}) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Usage Pace Warning</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-800">
          You're using your plan resources faster than expected. Here's what we noticed:
        </div>

        {warnings.map((warning, index) => {
          const Icon = warning.type === 'messages' ? MessageCircle : Phone;
          const unit = warning.type === 'messages' ? 'messages' : 'minutes';
          
          return (
            <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-orange-900 capitalize">
                      {warning.type} Usage
                    </span>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      Fast Pace
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Current Usage</div>
                      <div className="font-medium">
                        {warning.current_usage} {unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Limit</div>
                      <div className="font-medium">
                        {warning.total_limit} {unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Days Elapsed</div>
                      <div className="font-medium">
                        {warning.days_elapsed} days
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Monthly Pace</div>
                      <div className="font-medium text-orange-700">
                        {warning.projected_monthly} {unit}/month
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-100 rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900">Projection</span>
                    </div>
                    <div className="text-orange-800">
                      At your current pace, you'll use about{" "}
                      <span className="font-medium">{warning.projected_monthly} {unit}</span> per month.
                      Your plan includes{" "}
                      <span className="font-medium">{warning.monthly_limit} {unit}</span> per month
                      for {warning.billing_months} months.
                    </div>
                    {warning.days_to_monthly_limit < 30 && (
                      <div className="text-orange-800 mt-1">
                        You might reach your monthly limit in about{" "}
                        <span className="font-medium">{warning.days_to_monthly_limit} days</span>.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Your Plan</span>
          </div>
          <div className="text-blue-800">
            You have a {warnings[0]?.billing_months}-month plan with upfront limits.
            You can use all your resources at any pace, but this warning helps you
            manage your usage throughout the billing period.
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center">
          This is just a friendly reminder. You can continue using the service normally.
        </div>
      </CardContent>
    </Card>
  );
};