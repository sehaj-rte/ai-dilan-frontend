// Plan and limitation types
export interface PlanLimitations {
  message_limit?: number | null;
  minute_limit?: number | null;
  features?: string[];
}

export interface UserUsage {
  user_id: string;
  expert_id: string;
  plan_id?: string;
  current_period_start: string;
  current_period_end: string;
  messages_used: number;
  minutes_used: number;
  last_reset_date: string;
  updated_at: string;
}

export interface UsageLimitStatus {
  canSendMessage: boolean;
  canMakeCall: boolean;
  messagesRemaining: number | null; // null means unlimited
  minutesRemaining: number | null; // null means unlimited
  isUnlimited: boolean;
  limitReachedType: "none" | "messages" | "minutes";
}

// Extended Plan interface to include limitations
export interface PlanWithLimitations {
  id: string;
  expert_id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  billing_interval_count?: number; // Add billing interval count field
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  message_limit?: number | null;
  minute_limit?: number | null;
  features?: string[];
}

// Usage tracking events
export interface UsageTrackingEvent {
  user_id: string;
  expert_id: string;
  event_type: "message_sent" | "call_started" | "call_ended" | "minutes_used";
  quantity: number; // 1 for message, minutes for call
  timestamp: string;
  session_id?: string;
}

// User subscription with plan details
export interface UserSubscriptionWithPlan {
  subscription_id: string;
  user_id: string;
  expert_id: string;
  plan: PlanWithLimitations;
  status: "active" | "inactive" | "cancelled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  usage_info?: {
    is_trial: boolean;
    trial_days_remaining: number;
    messages_used: number;
    message_limit: number;
    minutes_used: number;
    minute_limit: number;
    message_percentage: number;
    minute_percentage: number;
  };
}
