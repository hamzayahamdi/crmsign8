# Resend Email Setup Guide

This guide explains how to set up Resend for sending email notifications in the Signature8 CRM application.

## Prerequisites

1. Sign up for a Resend account at [https://resend.com](https://resend.com)
2. Verify your domain (optional but recommended) or use Resend's default domain for testing

## Setup Steps

### 1. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Signature8 CRM Production")
5. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Note:**
- `RESEND_API_KEY`: Your Resend API key (required)
- `RESEND_FROM_EMAIL`: The email address to send from (optional, defaults to `onboarding@resend.dev`)

### 3. Domain Verification (Recommended)

For production use, verify your domain:

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Follow the DNS verification steps
4. Once verified, update `RESEND_FROM_EMAIL` to use your domain

## Usage

### Sending Reminder Emails

The system automatically sends reminder emails when:
- A user has email notifications enabled in their preferences
- An event reminder time is reached
- The reminder check endpoint is called

### Manual Email Sending

You can send emails programmatically:

```typescript
import { sendReminderEmail, sendNotificationEmail } from '@/lib/resend-service';

// Send a reminder email
await sendReminderEmail(
  'user@example.com',
  {
    title: 'Meeting with Client',
    startDate: new Date('2024-01-15T10:00:00'),
    location: 'Office',
    description: 'Discuss project requirements'
  },
  30 // minutes before event
);

// Send a notification email
await sendNotificationEmail(
  'user@example.com',
  {
    title: 'New Contact Assigned',
    message: 'You have been assigned a new contact.',
    type: 'client_assigned'
  }
);
```

### API Endpoints

#### Send Email
```
POST /api/notifications/send-email
Content-Type: application/json

{
  "type": "reminder" | "notification",
  "to": "user@example.com" | ["user1@example.com", "user2@example.com"],
  // For reminder type:
  "event": {
    "title": "Meeting",
    "startDate": "2024-01-15T10:00:00Z",
    "location": "Office",
    "description": "Description"
  },
  "reminderMinutes": 30,
  // For notification type:
  "notification": {
    "title": "Notification Title",
    "message": "Notification message"
  }
}
```

#### Check and Send Reminders
```
GET /api/notifications/check-reminders
```

This endpoint checks for reminders that need to be sent and sends email notifications.

**Note:** This should be called periodically (e.g., via cron job) to process reminders.

## Testing

### Test Email Sending

1. Make sure `RESEND_API_KEY` is set in your `.env`
2. Use the API endpoint or call the service directly
3. Check your Resend dashboard for email logs

### Test Reminder System

1. Create a calendar event with a reminder
2. Set the reminder time to a few minutes in the future
3. Call `/api/notifications/check-reminders`
4. Check that the email was sent

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is correct in `.env`
2. **Check User Preferences**: Ensure user has email notifications enabled
3. **Check User Email**: Verify user has an email address in their profile
4. **Check Resend Dashboard**: Look for errors in the Resend dashboard
5. **Check Logs**: Look for error messages in server logs

### Common Errors

- **"Resend not configured"**: `RESEND_API_KEY` is missing or invalid
- **"Email notifications disabled"**: User has disabled email in preferences
- **"No email address"**: User profile doesn't have an email address
- **"Invalid email format"**: Email address format is incorrect

## Integration with Notification System

The email service is integrated with the notification system:

```typescript
import { sendNotification } from '@/lib/notification-service';

await sendNotification({
  userId: 'user-id',
  type: 'client_assigned',
  priority: 'high',
  title: 'New Contact',
  message: 'You have a new contact assigned',
  sendEmail: true, // Enable email notification
  sendSMS: false
});
```

## Cron Job Setup (Recommended)

Set up a cron job to check reminders periodically:

```bash
# Check reminders every 5 minutes
*/5 * * * * curl https://your-domain.com/api/notifications/check-reminders
```

Or use a service like:
- Vercel Cron Jobs
- GitHub Actions
- AWS Lambda + EventBridge
- Any cron service

## Rate Limits

Resend has rate limits based on your plan:
- Free tier: 100 emails/day
- Paid plans: Higher limits

Check your Resend dashboard for current usage and limits.

