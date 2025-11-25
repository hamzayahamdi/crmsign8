# SMS Notifications Setup Guide

## Overview

This guide explains how to enable SMS notifications for architects when contacts are assigned to them.

## Current Status

✅ **In-App Notifications**: Fully implemented
- Architects receive real-time notifications in the CRM when contacts are assigned
- Notifications appear in the notifications panel (bell icon)
- High-priority notifications are marked in red

🔔 **SMS Notifications**: Ready to enable
- Code infrastructure is ready
- Just needs Twilio configuration

## How Notifications Work

### When are notifications sent?

1. **Lead Conversion with Architect Assignment**
   - When a lead is converted to a contact
   - AND an architect is assigned during conversion
   - → The architect receives a notification

2. **Contact Creation with Architect Assignment**
   - When a contact is created manually
   - AND an architect is assigned
   - → The architect receives a notification

3. **Contact Architect Reassignment**
   - When an existing contact's architect is changed
   - → The new architect receives a notification
   - Message indicates it was a reassignment

### What information is included?

- **Contact Name**: Client's name
- **Phone Number**: Client's phone for immediate contact
- **Location**: City/ville if available
- **Assignment Type**: New assignment or reassignment
- **Previous Architect**: If it's a reassignment

## Enabling SMS Notifications

### Step 1: Sign up for Twilio

1. Go to [Twilio](https://www.twilio.com)
2. Create a free account (free trial includes credits)
3. Get a Twilio phone number

### Step 2: Get Your Credentials

From your Twilio dashboard, copy:
- **Account SID**
- **Auth Token**
- **Twilio Phone Number**

### Step 3: Add to Environment Variables

Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### Step 4: Install Twilio SDK

```bash
npm install twilio
```

### Step 5: Uncomment SMS Code

Edit `lib/notification-service.ts` and uncomment the Twilio code in the `sendSMSNotification` function (around line 90).

### Step 6: Add Phone Numbers to Users

1. Go to the database (Supabase dashboard or Prisma Studio)
2. Add phone numbers to users in the `users` table
3. Or add a phone field to the user management interface

### Step 7: Run Database Migration

```bash
npx prisma migrate dev --name add_user_phone
npx prisma generate
```

## Testing SMS Notifications

### Test with Twilio Free Trial

During the free trial:
- You can send SMS to verified phone numbers only
- Verify your architect's phone numbers in Twilio console
- Messages will have a trial prefix

### Production

Once you upgrade to a paid Twilio account:
- No restrictions on phone numbers
- No trial prefix in messages
- Pay only for messages sent (~$0.0075 per SMS)

## Alternative SMS Services

If you prefer not to use Twilio, you can integrate other services:

### 1. MessageBird
```bash
npm install messagebird
```

### 2. Vonage (formerly Nexmo)
```bash
npm install @vonage/server-sdk
```

### 3. AWS SNS (Simple Notification Service)
```bash
npm install @aws-sdk/client-sns
```

## Customizing SMS Messages

Edit the message format in `lib/notification-service.ts`:

```typescript
const smsMessage = await client.messages.create({
  body: `🔔 ${title}\n\n${message}\n\nSignature8 CRM`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phoneNumber,
});
```

## Cost Estimation

### Twilio Pricing (approximate)
- SMS: $0.0075 per message
- Monthly: 100 assignments × $0.0075 = $0.75
- Yearly: 1,200 assignments × $0.0075 = $9

Very affordable for important notifications!

## Disabling SMS for Specific Users

If an architect doesn't want SMS notifications:
- Remove their phone number from the database
- OR add a preference setting in the UI
- They'll still receive in-app notifications

## Monitoring & Logging

All SMS sends are logged:
- Check console output for `[SMS]` logs
- Twilio dashboard shows all sent messages
- Track delivery status and errors

## Troubleshooting

### SMS not sending?
1. Check Twilio credentials in `.env`
2. Verify phone number format (include country code: +212...)
3. Check Twilio account balance
4. Verify phone number in trial mode

### Phone number format
- International format: `+212612345678` (Morocco)
- Include country code (+212)
- No spaces or dashes

### User has no phone?
- Notification service skips SMS gracefully
- In-app notification still works
- Check logs for warning message

## Security Best Practices

1. **Never commit** `.env` file with credentials
2. **Rotate** Twilio auth tokens regularly
3. **Monitor** usage in Twilio dashboard
4. **Set spending limits** in Twilio account
5. **Use separate** credentials for dev/production

## Next Steps

After enabling SMS:
1. Test with a small group of architects first
2. Gather feedback on message content
3. Monitor delivery rates
4. Adjust message templates if needed
5. Consider adding SMS preferences to user settings

## Support

For issues:
- Twilio docs: https://www.twilio.com/docs
- Twilio support: https://support.twilio.com
- Check your implementation in `lib/notification-service.ts`

