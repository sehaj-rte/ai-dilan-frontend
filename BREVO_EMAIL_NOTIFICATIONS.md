# Brevo Email Notifications Setup

This document explains how to set up and use Brevo email notifications for admin alerts when users register and make payments in the Dilan AI platform.

## Overview

The system sends automated email notifications to expert and super admins when:
1. **User Registration**: A new user signs up on the platform
2. **Payment Success**: A user successfully completes a payment for an expert session

## Features

- **Dual Admin Support**: Notifications sent to both expert admins and super admins
- **Template-based Emails**: Uses Brevo email templates for consistent branding
- **Secure Server-side Processing**: API keys handled securely on the server
- **Non-blocking Flow**: Email failures don't interrupt user experience
- **Test API**: Built-in testing endpoints for verification

## Setup Instructions

### 1. Install Dependencies

The required Brevo package is already installed:
```bash
npm install @getbrevo/brevo
```

### 2. Create Brevo Account and Templates

1. Sign up at [Brevo](https://www.brevo.com/)
2. Get your API key from the dashboard
3. Create email templates:
   - **User Registration Template**: For new user notifications
   - **Payment Success Template**: For successful payment notifications
4. Note the template IDs for configuration

### 3. Configure Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Brevo Email Configuration
BREVO_API_KEY=your-brevo-api-key-here
BREVO_SENDER_EMAIL=noreply@your-domain.com
BREVO_SENDER_NAME=Dilan AI

# Brevo Template IDs
BREVO_USER_REGISTRATION_TEMPLATE_ID=1
BREVO_USER_PAYMENT_TEMPLATE_ID=2

# Admin Email Addresses (comma-separated)
EXPERT_ADMIN_EMAILS=expert1@example.com,expert2@example.com
SUPER_ADMIN_EMAILS=superadmin1@example.com,superadmin2@example.com

# Base URLs
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_DASHBOARD_URL=https://your-domain.com/dashboard
```

### 4. Email Template Variables

When creating your Brevo templates, use these variables:

#### User Registration Template Variables:
- `USER_EMAIL`: The new user's email address
- `USER_NAME`: The new user's username
- `FULL_NAME`: The user's full name (optional)
- `REGISTRATION_DATE`: Date and time of registration
- `DASHBOARD_URL`: Link to the admin dashboard

#### Payment Success Template Variables:
- `USER_EMAIL`: The paying user's email
- `USER_NAME`: The paying user's username
- `FULL_NAME`: The user's full name (optional)
- `EXPERT_NAME`: Name of the expert they paid for
- `EXPERT_SLUG`: Expert's URL slug
- `PLAN_NAME`: Name of the purchased plan
- `AMOUNT`: Payment amount
- `CURRENCY`: Payment currency (USD, EUR, etc.)
- `PAYMENT_DATE`: Date and time of payment
- `SESSION_TYPE`: Type of session (chat or call)
- `EXPERT_URL`: Direct link to the expert page
- `DASHBOARD_URL`: Link to the admin dashboard

## File Structure

```
dilan-new-project/ai-dilan-frontend/
├── lib/
│   ├── brevoService.ts          # Core Brevo service
│   └── notifications.ts         # Client-side notification utility
├── app/api/notifications/
│   ├── user-registration/
│   │   └── route.ts            # User registration API endpoint
│   ├── payment-success/
│   │   └── route.ts            # Payment success API endpoint
│   └── test/
│       └── route.ts            # Testing API endpoint
└── components/auth/
    └── RegisterForm.tsx        # Updated with notifications
```

## API Endpoints

### POST /api/notifications/user-registration
Sends user registration notification to admins.

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "userName": "username",
  "fullName": "John Doe"
}
```

### POST /api/notifications/payment-success
Sends payment success notification to admins.

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "userName": "username",
  "fullName": "John Doe",
  "expertName": "AI Expert",
  "expertSlug": "ai-expert",
  "planName": "Monthly Plan",
  "amount": 29.99,
  "currency": "USD",
  "sessionType": "chat"
}
```

### GET /api/notifications/test
Test basic Brevo functionality.

### POST /api/notifications/test
Test specific notification types.

**Request Body:**
```json
{
  "testType": "user-registration" | "payment-success" | "basic",
  // ... test data
}
```

## Testing

### 1. Basic Service Test
```bash
curl http://localhost:3000/api/notifications/test
```

### 2. Test User Registration Notification
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "user-registration",
    "userEmail": "test@example.com",
    "userName": "testuser",
    "fullName": "Test User"
  }'
```

### 3. Test Payment Success Notification
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "payment-success",
    "userEmail": "test@example.com",
    "userName": "testuser",
    "fullName": "Test User",
    "expertName": "Test Expert",
    "expertSlug": "test-expert",
    "planName": "Test Plan",
    "amount": 29.99,
    "currency": "USD",
    "sessionType": "chat"
  }'
```

## Integration Points

### User Registration
Notifications are automatically sent when users register through:
- Main registration form (`/auth/register`)
- Expert page authentication modal

### Payment Success
Notifications are sent when payments are validated in:
- Expert page payment flow
- Direct payment session validation

## Error Handling

- Email failures are logged but don't block user flows
- Fallback to console warnings if notifications fail
- API endpoints return appropriate error codes
- All errors are logged for debugging

## Security Considerations

- API keys stored securely in environment variables
- Server-side processing prevents key exposure
- Admin email addresses configurable via environment
- CORS headers configured for API endpoints

## Monitoring and Logs

Monitor notifications through:
- Server console logs (success/failure messages)
- Brevo dashboard (email delivery status)
- API response logs
- Test endpoint results

## Troubleshooting

### Common Issues:

1. **API Key Invalid**
   - Verify BREVO_API_KEY in environment variables
   - Check key permissions in Brevo dashboard

2. **Template Not Found**
   - Verify template IDs in environment variables
   - Ensure templates are published in Brevo

3. **Emails Not Delivered**
   - Check Brevo dashboard for delivery status
   - Verify admin email addresses
   - Check spam folders

4. **Missing Environment Variables**
   - Ensure all required variables are set
   - Restart development server after changes

### Debug Mode:

Enable detailed logging by checking browser console and server logs for:
- `✅ User registration notification sent`
- `✅ Payment success notification sent`
- `❌ Failed to send notification`

## Production Deployment

1. Set production environment variables
2. Update sender email and name
3. Configure production admin email lists
4. Test all notification flows
5. Monitor delivery rates
6. Set up error alerting

## Support

For issues with:
- Brevo integration: Check Brevo documentation
- Template setup: Use Brevo template editor
- API configuration: Review environment variables
- Code issues: Check server logs and console