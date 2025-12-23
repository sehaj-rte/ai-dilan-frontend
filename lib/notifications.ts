interface NotificationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  includePaymentSuccess?: boolean;
  includeVoiceSetup?: boolean;
  invoiceUrl?: string;
  invoiceId?: string;
  subscriptionId?: string;
  customerId?: string;
  paymentIntentId?: string;
  expertName?: string;
}

interface PaymentNotificationData extends NotificationData {
  expertName: string;
  expertSlug: string;
  planName: string;
  amount: number;
  currency: string;
  sessionType: "chat" | "call";
}

interface SubscriptionCancelledNotificationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  expertName: string;
  expertSlug: string;
  planName: string;
  subscriptionId: string;
  cancelReason?: string;
  periodEndDate?: string;
}

interface PasswordResetNotificationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  resetToken: string;
  resetLink: string;
  expiresAt: string;
}

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/bapi";
  }

  /**
   * Send user registration notification to admins
   * DISABLED: Notifications are now sent from backend webhook only
   */
  async sendUserRegistrationNotification(
    data: NotificationData,
  ): Promise<boolean> {
    // Notifications are now handled by backend webhook - no frontend calls needed
    console.log("ℹ️ FRONTEND DEBUG: User registration notification disabled - handled by backend webhook");
    console.log("📝 FRONTEND DEBUG: Would have sent data:", data);
    
    // Return true to not break existing code flow
    return true;
  }

  /**
   * Send payment success notification to admins
   */

  /**
   * Helper method to get user data from auth state
   */
  getUserDataFromState(user: any): NotificationData {
    return {
      userEmail: user?.email || "",
      userName: user?.username || "",
      fullName: user?.full_name || user?.name || "",
    };
  }

  /**
   * Send subscription cancelled notification
   */
  async sendSubscriptionCancelledNotification(
    data: SubscriptionCancelledNotificationData,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notifications/subscription-cancelled`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Subscription cancelled notification sent:", result.message);
        return true;
      } else {
        console.error(
          "❌ Failed to send subscription cancelled notification:",
          result.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending subscription cancelled notification:", error);
      return false;
    }
  }

  /**
   * Send password reset notification
   */
  async sendPasswordResetNotification(
    data: PasswordResetNotificationData,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notifications/password-reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Password reset notification sent:", result.message);
        return true;
      } else {
        console.error(
          "❌ Failed to send password reset notification:",
          result.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending password reset notification:", error);
      return false;
    }
  }

  /**
   * Helper method to extract plan data from payment response
   */
  extractPaymentData(
    userData: NotificationData,
    expertData: { name: string; slug: string },
    planData: { name: string; price: number; currency: string },
    sessionType: "chat" | "call",
  ): PaymentNotificationData {
    return {
      ...userData,
      expertName: expertData.name,
      expertSlug: expertData.slug,
      planName: planData.name,
      amount: planData.price,
      currency: planData.currency,
      sessionType,
    };
  }
}

export const notificationService = new NotificationService();
export type { 
  NotificationData, 
  PaymentNotificationData, 
  SubscriptionCancelledNotificationData, 
  PasswordResetNotificationData 
};
