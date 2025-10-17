# LogRocket Integration Setup

## Installation

First, install the LogRocket package:

```bash
npm install --save logrocket
```

## What's Already Set Up

✅ **LogRocketProvider** - Automatically initializes LogRocket with your app ID: `40k7ez/ai-dilan`
✅ **Root Layout Integration** - LogRocket is initialized at the app level
✅ **Utility Functions** - Helper functions for common LogRocket operations

## Usage Examples

### 1. Identify Users (Recommended for authentication)

```typescript
import { identifyUser } from '@/lib/logrocket'

// After user login
await identifyUser('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium'
})
```

### 2. Track Custom Events

```typescript
import { trackEvent } from '@/lib/logrocket'

// Track user actions
await trackEvent('expert_created', {
  expertName: 'AI Assistant',
  voiceId: 'voice-123'
})

await trackEvent('chat_started', {
  expertId: 'expert-456',
  messageCount: 1
})
```

### 3. Add Session Tags

```typescript
import { addSessionTags } from '@/lib/logrocket'

// Add tags for better filtering
await addSessionTags(['premium-user', 'beta-tester'])

// Or use object format
await addSessionTags({
  userType: 'premium',
  feature: 'voice-chat'
})
```

### 4. Capture Exceptions

```typescript
import { captureException } from '@/lib/logrocket'

try {
  // Your code here
} catch (error) {
  await captureException(error, {
    context: 'expert-creation',
    userId: 'user-123'
  })
}
```

### 5. Get Session URL (for support)

```typescript
import { getSessionURL } from '@/lib/logrocket'

const sessionUrl = await getSessionURL()
if (sessionUrl) {
  console.log('Share this URL with support:', sessionUrl)
}
```

## Integration Points

Consider adding LogRocket tracking to:

- **User Authentication** - Identify users after login
- **Expert Creation** - Track when users create new experts
- **Chat Interactions** - Monitor voice chat usage
- **File Uploads** - Track knowledge base uploads
- **Errors** - Capture and track application errors
- **Feature Usage** - Monitor which features are most used

## Environment Configuration

The LogRocket app ID is currently hardcoded as `40k7ez/ai-dilan`. 

For different environments, you might want to use environment variables:

```typescript
const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID || '40k7ez/ai-dilan'
LogRocket.init(appId)
```

## Notes

- LogRocket only initializes on the client side (browser)
- The integration gracefully handles cases where LogRocket isn't installed
- All utility functions include error handling
- Sessions are automatically recorded once LogRocket is initialized
