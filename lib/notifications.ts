interface NotificationData {
  userEmail: string;
  userName: string;
  fullName?: string;
}

interface PaymentNotificationData extends NotificationData {
  expertName: string;
  expertSlug: string;
  planName: string;
  amount: number;
  currency: string;
  sessionType: "chat" | "call";
}

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
  }

  /**
   * Send user registration notification to admins
   */
  async sendUserRegistrationNotification(
    data: NotificationData,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/notifications/user-registration`,
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
        console.log("✅ User registration notification sent:", result.message);
        return true;
      } else {
        console.error(
          "❌ Failed to send user registration notification:",
          result.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending user registration notification:", error);
      return false;
    }
  }

  /**
   * Send payment success notification to admins
   */
  async sendPaymentSuccessNotification(
    data: PaymentNotificationData,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/notifications/payment-success`,
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
        console.log("✅ Payment success notification sent:", result.message);
        return true;
      } else {
        console.error(
          "❌ Failed to send payment success notification:",
          result.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending payment success notification:", error);
      return false;
    }
  }

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
export type { NotificationData, PaymentNotificationData };
