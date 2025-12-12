import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";

// Brevo configuration - lazy initialization
let apiInstance: TransactionalEmailsApi | null = null;

const getApiInstance = () => {
  if (!apiInstance) {
    try {
      apiInstance = new TransactionalEmailsApi();
      // Set the API key using the setApiKey method with proper type
      (apiInstance as any).setApiKey(
        "api-key",
        process.env.BREVO_API_KEY || "dummy-api-key",
      );
    } catch (error) {
      console.error("Failed to initialize Brevo API:", error);
      return null;
    }
  }
  return apiInstance;
};

// Template IDs (use dummy values for now, replace with actual template IDs)
const TEMPLATES = {
  USER_REGISTRATION: parseInt(
    process.env.BREVO_USER_REGISTRATION_TEMPLATE_ID || "1",
  ),
  USER_PAYMENT_SUCCESS: parseInt(
    process.env.BREVO_USER_PAYMENT_TEMPLATE_ID || "2",
  ),
};

// Admin email addresses (replace with actual admin emails)
const ADMIN_EMAILS = {
  EXPERTS: process.env.EXPERT_ADMIN_EMAILS?.split(",") || [
    "expert@example.com",
  ],
  SUPER_ADMINS: process.env.SUPER_ADMIN_EMAILS?.split(",") || [
    "superadmin@example.com",
  ],
};

interface UserRegistrationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  registrationDate?: string;
  includePaymentSuccess?: boolean;
  includeVoiceSetup?: boolean;
  invoiceUrl?: string;
  invoiceId?: string;
  subscriptionId?: string;
  customerId?: string;
  paymentIntentId?: string;
  expertName?: string;
}

interface PaymentSuccessData {
  userEmail: string;
  userName: string;
  fullName?: string;
  expertName: string;
  expertSlug: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  sessionType: "chat" | "call";
}

class BrevoService {
  /**
   * Send combined user registration and payment success notification with voice setup steps
   */
  async sendUserRegistrationNotification(
    userData: UserRegistrationData,
  ): Promise<boolean> {
    try {
      // Prepare customer recipient (user gets the email)
      const customerRecipient = {
        email: userData.userEmail,
        name: userData.fullName || userData.userName,
      };

      // Admin recipients
      const adminRecipients = [
        ...ADMIN_EMAILS.EXPERTS.map((email) => ({
          email,
          name: "Expert Admin",
        })),
        ...ADMIN_EMAILS.SUPER_ADMINS.map((email) => ({
          email,
          name: "Super Admin",
        })),
      ];

      // Customer + Admins all receive this email
      const recipients = [customerRecipient, ...adminRecipients];

      const expertName = userData.expertName || "AI Expert";
      const DASHBOARD_URL =
        process.env.NEXT_PUBLIC_DASHBOARD_URL ||
        "https://your-domain.com/dashboard";

      const sendSmtpEmail = new SendSmtpEmail();
      sendSmtpEmail.to = recipients;
      sendSmtpEmail.templateId = TEMPLATES.USER_REGISTRATION;
      
      // Set dynamic subject
      sendSmtpEmail.subject = `${expertName} | Welcome to ${expertName} — Your Receipt & Access Details`;
      
      // Dynamic subject
      const dynamicSubject = `${expertName} | Welcome to ${expertName} — Your Receipt & Access Details`;
      
      // Base parameters with dynamic expert name
      const params: any = {
        CLIENT_NAME: userData.fullName || userData.userName,
        USER_EMAIL: userData.userEmail,
        PRODUCT_NAME: expertName,  // Dynamic expert name
        EXPERT_NAME: expertName,   // Also as EXPERT_NAME
        ACCESS_LINK: DASHBOARD_URL,
        EMAIL_SUBJECT: dynamicSubject,  // Dynamic subject as parameter
        REGISTRATION_DATE: userData.registrationDate || new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
      };

      // Add payment success message if requested
      if (userData.includePaymentSuccess !== false) {
        params.PAYMENT_SUCCESS = "✅ Payment processed successfully!";
      }

      // Voice setup steps removed as requested

      // Add invoice URL if available
      if (userData.invoiceUrl) {
        params.INVOICE_URL = userData.invoiceUrl;
        params.INVOICE_MESSAGE = "📄 View your invoice and receipt";
      }

      sendSmtpEmail.params = params;

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(sendSmtpEmail);
      console.log(
        "✅ Combined registration and payment notification with voice setup sent successfully:",
        response,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send registration notification:", error);
      return false;
    }
  }

  /**
   * Send payment success notification to admins
   */
  async sendPaymentSuccessNotification(
    paymentData: PaymentSuccessData,
  ): Promise<boolean> {
    try {
      // Prepare recipient list (both expert and super admins)
      const recipients = [
        ...ADMIN_EMAILS.EXPERTS.map((email) => ({
          email,
          name: "Expert Admin",
        })),
        ...ADMIN_EMAILS.SUPER_ADMINS.map((email) => ({
          email,
          name: "Super Admin",
        })),
      ];

      const sendSmtpEmail = new SendSmtpEmail();
      sendSmtpEmail.to = recipients;
      sendSmtpEmail.templateId = TEMPLATES.USER_PAYMENT_SUCCESS;
      sendSmtpEmail.params = {
        USER_EMAIL: paymentData.userEmail,
        USER_NAME: paymentData.userName,
        FULL_NAME: paymentData.fullName || paymentData.userName,
        EXPERT_NAME: paymentData.expertName,
        EXPERT_SLUG: paymentData.expertSlug,
        PLAN_NAME: paymentData.planName,
        AMOUNT: paymentData.amount.toString(),
        CURRENCY: paymentData.currency,
        PAYMENT_DATE: paymentData.paymentDate,
        SESSION_TYPE: paymentData.sessionType,
        EXPERT_URL: `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/expert/${paymentData.expertSlug}`,
        DASHBOARD_URL:
          process.env.NEXT_PUBLIC_DASHBOARD_URL ||
          "https://your-domain.com/dashboard",
      };

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(sendSmtpEmail);
      console.log(
        "✅ Payment success notification sent successfully:",
        response,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send payment success notification:", error);
      return false;
    }
  }

  /**
   * Test email functionality
   */
  async testEmailService(): Promise<boolean> {
    try {
      const testEmail = new SendSmtpEmail();
      testEmail.to = [{ email: "test@example.com", name: "Test User" }];
      testEmail.subject = "Brevo Service Test";
      testEmail.textContent = "This is a test email from Brevo service.";
      testEmail.htmlContent = "<p>This is a test email from Brevo service.</p>";
      testEmail.sender = {
        email: process.env.BREVO_SENDER_EMAIL || "noreply@your-domain.com",
        name: process.env.BREVO_SENDER_NAME || "Dilan AI",
      };

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(testEmail);
      console.log("✅ Test email sent successfully:", response);
      return true;
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      return false;
    }
  }
}

export const brevoService = new BrevoService();
export type { UserRegistrationData, PaymentSuccessData };
