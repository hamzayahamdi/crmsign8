# Twilio SMS Notifications - Setup Guide

## ✅ Installation Complete!

Twilio SMS notifications have been successfully configured in your CRM system. Follow the steps below to activate it.

---

## 📋 What's Been Added

### 1. **Twilio SDK Installed**
- Package: `twilio@5.10.6`
- Installed via: `pnpm add twilio`

### 2. **New Files Created**

#### `lib/twilio-service.ts`
Core Twilio integration service with:
- SMS sending functionality
- Phone number formatting (supports Moroccan numbers)
- Configuration checking
- Error handling
- Test utilities

#### `scripts/test-sms.js`
Quick test script to verify Twilio configuration:
```bash
npm run test:sms
npm run test:sms +212612345678
```

#### `scripts/test-notification-with-sms.js`
Full notification flow test with SMS:
```bash
npm run test:notification-sms <userId> <phoneNumber>
```

### 3. **Updated Files**

#### `lib/notification-service.ts`
- Integrated Twilio SMS service
- Enabled SMS notifications for contact assignments
- Added automatic fallback if Twilio not configured

#### `package.json`
Added new scripts:
- `npm run test:sms` - Test Twilio configuration
- `npm run test:notification-sms` - Test full notification with SMS

---

## 🚀 Setup Instructions

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account (includes trial credits)
3. Verify your email and phone number

### Step 2: Get Twilio Credentials

From your [Twilio Console](https://www.twilio.com/console):

1. **Account SID** - Found on dashboard (starts with `AC...`)
2. **Auth Token** - Found on dashboard (click to reveal)
3. **Phone Number** - Get one from Phone Numbers → Buy a Number

### Step 3: Add to Environment Variables

Add these three lines to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:**
- Keep these credentials secret
- Never commit `.env` to Git
- Use international format for phone number (+country code)

### Step 4: Add Phone Numbers to Users

Users need phone numbers in the database to receive SMS:

```sql
-- Add phone to specific user
UPDATE users 
SET phone = '+212612345678' 
WHERE email = 'architect@example.com';
```

Or via Prisma Studio:
```bash
npx prisma studio
```

**Phone Number Format:**
- International format: `+212612345678` (Morocco)
- The system auto-formats Moroccan numbers:
  - `0612345678` → `+212612345678`
  - `612345678` → `+212612345678`

---

## 🧪 Testing

### Test 1: Verify Configuration

```bash
npm run test:sms
```

This checks:
- ✅ Credentials are set correctly
- ✅ Twilio account is valid
- ✅ Phone number formatting works

### Test 2: Send Test SMS

```bash
npm run test:sms +212612345678
```

Replace with your phone number to receive a test SMS.

### Test 3: Test Full Notification Flow

```bash
npm run test:notification-sms <userId> <phoneNumber>
```

This tests:
- ✅ In-app notification creation
- ✅ SMS sending via Twilio
- ✅ Complete notification flow

---

## 📱 How It Works

### Automatic SMS on Contact Assignment

When a contact is assigned to an architect:

1. **In-App Notification** is created (always)
2. **SMS is sent** (if Twilio configured + user has phone)

Example notification SMS:
```
🔔 Nouveau Contact Assigné

Le contact "Ahmed Benali" vous a été assigné. 
Téléphone: +212612345678

— Signature8 CRM
```

### Where SMS is Triggered

SMS notifications are sent in these scenarios:

1. **Lead Conversion with Architect Assignment**
   - File: `app/api/contacts/convert-lead/route.ts`
   - When converting lead to contact and assigning architect

2. **Contact Creation with Architect Assignment**
   - File: `app/api/contacts/route.ts`
   - When creating new contact with architect assigned

3. **Architect Reassignment**
   - File: `app/api/contacts/[id]/route.ts`
   - When changing the assigned architect

### Enable/Disable SMS

SMS is controlled by the `sendSMS` parameter in `sendNotification()`:

```typescript
// Enable SMS
await sendNotification({
  userId: architectId,
  title: 'Nouveau Contact',
  message: 'Contact assigné',
  sendSMS: true, // ← Enable SMS
});

// Disable SMS (in-app only)
await sendNotification({
  userId: architectId,
  title: 'Nouveau Contact',
  message: 'Contact assigné',
  sendSMS: false, // ← Disable SMS
});
```

---

## 💰 Pricing

### Twilio Costs (Approximate)

- **SMS to Morocco**: ~$0.05 per message
- **Monthly estimate**: 100 notifications = $5
- **Yearly estimate**: 1,200 notifications = $60

### Free Trial

- $15.50 in trial credits
- Can send to verified numbers only
- Messages include trial prefix

### Production

- Upgrade anytime (no monthly fee)
- Pay only for messages sent
- No trial prefix
- Send to any number

---

## 🔧 Configuration

### Disable SMS for Specific Users

**Option 1:** Remove phone number
```sql
UPDATE users SET phone = NULL WHERE id = 'user_id';
```

**Option 2:** Disable globally
Remove Twilio credentials from `.env` - system will fall back to in-app only.

### Custom SMS Messages

Edit `lib/twilio-service.ts` to customize message format:

```typescript
export async function sendNotificationSMS(to, title, message) {
  const fullMessage = `🔔 ${title}\n\n${message}\n\n— Signature8 CRM`;
  return sendSMS(to, fullMessage);
}
```

### Phone Number Formatting

The system automatically formats phone numbers. To customize:

Edit `lib/twilio-service.ts`:

```typescript
export function formatPhoneNumber(phone: string): string {
  // Your custom formatting logic
}
```

---

## 🐛 Troubleshooting

### Issue: SMS not sending

**Check:**
1. Twilio credentials in `.env`
2. User has phone number in database
3. Phone number in international format
4. Twilio account has credits
5. Check Twilio logs: https://www.twilio.com/console/sms/logs

**Test:**
```bash
npm run test:sms +212612345678
```

### Issue: "Unverified number" error

**Solution:**
- Twilio trial accounts can only send to verified numbers
- Verify numbers in Twilio Console → Phone Numbers → Verified
- Or upgrade to paid account (no restrictions)

### Issue: Wrong country code

**Solution:**
Update `formatPhoneNumber()` in `lib/twilio-service.ts`:

```typescript
// For other countries
if (cleaned.length === 10 && cleaned.startsWith('0')) {
  return '+33' + cleaned.substring(1); // France
}
```

### Issue: SMS received but formatted badly

**Solution:**
Adjust message template in `lib/twilio-service.ts`:

```typescript
const fullMessage = `${title}\n${message}`; // Simple format
```

---

## 📊 Monitoring

### View SMS Logs

**In Console:**
All SMS activity is logged:
```
[Twilio] Sending SMS to +212612345678
[Twilio] SMS sent successfully. SID: SM...
```

**In Twilio Dashboard:**
- View all sent messages
- See delivery status
- Check error logs
- Monitor costs

**In Database:**
Notifications are stored in `notifications` table with metadata.

---

## 🔐 Security Best Practices

1. **Never expose credentials**
   - Keep Twilio keys in `.env`
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Verify phone numbers**
   - Validate format before saving
   - Use international format
   - Sanitize user input

3. **Rate limiting**
   - Monitor SMS usage
   - Set up alerts in Twilio
   - Consider implementing app-level rate limits

4. **Rotate credentials**
   - Change Auth Token periodically
   - Use separate credentials for dev/prod

---

## 🎯 Next Steps

1. ✅ Add Twilio credentials to `.env`
2. ✅ Run test script: `npm run test:sms`
3. ✅ Add phone numbers to architect users
4. ✅ Test full flow: Assign a contact to an architect
5. ✅ Monitor Twilio dashboard for delivery

---

## 📞 Support

### Twilio Support
- Documentation: https://www.twilio.com/docs
- Support: https://support.twilio.com
- Console: https://www.twilio.com/console

### Need Help?
- Check logs in console
- Review Twilio SMS logs
- Test with `npm run test:sms`
- Check phone number format

---

## 📝 Quick Reference

```bash
# Test Twilio configuration
npm run test:sms

# Send test SMS
npm run test:sms +212612345678

# Test notification with SMS
npm run test:notification-sms <userId> <phoneNumber>

# View Prisma Studio (manage user phones)
npx prisma studio
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

---

## ✨ Features

- ✅ Automatic SMS on contact assignment
- ✅ Phone number auto-formatting
- ✅ Graceful fallback (no SMS if not configured)
- ✅ Test scripts included
- ✅ Moroccan number support
- ✅ Error handling and logging
- ✅ Production-ready

**Enjoy your SMS notifications! 📱**





