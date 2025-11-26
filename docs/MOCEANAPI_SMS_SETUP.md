# MoceanAPI SMS Notifications - Setup Guide

## ✅ Installation Complete!

MoceanAPI SMS notifications have been successfully configured in your CRM system. Follow the steps below to activate it.

---

## 📋 What's Been Added

### 1. **MoceanAPI Service**
- **File**: `lib/mocean-service.ts`
- Complete MoceanAPI integration using REST API
- SMS sending functionality
- Phone number formatting (supports Moroccan numbers)
- Configuration checking
- Error handling

### 2. **Updated Files**
- `lib/notification-service.ts` - Updated to use MoceanAPI
- `scripts/test-sms.ts` - Updated test script
- `app/api/twilio/test/route.ts` - API endpoint (kept route name for compatibility)
- `app/api/twilio/status/route.ts` - Status endpoint

### 3. **Removed**
- `lib/twilio-service.ts` - Replaced with MoceanAPI
- `twilio` npm package - Uninstalled

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Sign Up for MoceanAPI

1. Go to [https://moceanapi.com](https://moceanapi.com)
2. Sign up for a free account (no credit card needed)
3. Verify your email

### Step 2: Get Your API Credentials

From your MoceanAPI dashboard:

1. **API Key** - Found in your dashboard
2. **API Secret** - Found in your dashboard
3. **Sender ID** (optional) - You can set a custom sender ID

### Step 3: Add to Environment Variables

Add these to your `.env` or `.env.local` file:

```env
MOCEAN_API_KEY=your_api_key_here
MOCEAN_API_SECRET=your_api_secret_here
MOCEAN_FROM_NUMBER=SIGNATURE8
```

**Note:**
- `MOCEAN_FROM_NUMBER` is optional (defaults to "SIGNATURE8")
- Keep credentials secret
- Never commit `.env` to Git

### Step 4: Test Configuration

```bash
npm run test:sms
```

You should see: ✅ MoceanAPI configured successfully!

### Step 5: Send Test SMS

```bash
npm run test:sms +212636939179
```

Replace with your phone number.

---

## 📱 How It Works

### Automatic SMS on Contact Assignment

When a contact is assigned to an architect:

1. **In-App Notification** is created (always)
2. **SMS is sent** (if MoceanAPI configured + user has phone)

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

---

## 🧪 Testing

### Test 1: Verify Configuration

```bash
npm run test:sms
```

This checks:
- ✅ Credentials are set correctly
- ✅ MoceanAPI account is valid
- ✅ Phone number formatting works

### Test 2: Send Test SMS

```bash
npm run test:sms +212636939179
```

Replace with your phone number to receive a test SMS.

### Test 3: Test Full Notification Flow

```bash
npm run test:notification-sms <userId> <phoneNumber>
```

This tests:
- ✅ In-app notification creation
- ✅ SMS sending via MoceanAPI
- ✅ Complete notification flow

---

## 💰 Pricing

### MoceanAPI Free Trial

- **Free trial** - No credit card needed
- **Credits included** - Check your dashboard
- **Pay as you go** - After trial credits

### Production Pricing

- Very affordable rates
- Pay only for messages sent
- Check MoceanAPI website for current pricing

---

## 🔧 Configuration

### Custom Sender ID

Edit `.env`:
```env
MOCEAN_FROM_NUMBER=YOUR_COMPANY_NAME
```

### Disable SMS for Specific User

Remove phone number from user:
```sql
UPDATE users SET phone = NULL WHERE id = 'user_id';
```

### Disable SMS Globally

Remove MoceanAPI credentials from `.env` - system will fall back to in-app only.

---

## 🐛 Troubleshooting

### Issue: SMS not sending

**Check:**
1. MoceanAPI credentials in `.env`
2. User has phone number in database
3. Phone number in international format
4. MoceanAPI account has credits
5. Check MoceanAPI dashboard for logs

**Test:**
```bash
npm run test:sms +212636939179
```

### Issue: Wrong country code

**Solution:**
Update `formatPhoneNumber()` in `lib/mocean-service.ts`:

```typescript
// For other countries
if (cleaned.length === 10 && cleaned.startsWith('0')) {
  return '+33' + cleaned.substring(1); // France
}
```

---

## 📊 Monitoring

### View SMS Logs

**In Console:**
All SMS activity is logged:
```
[MoceanAPI] Sending SMS to +212636939179
[MoceanAPI] SMS sent successfully. Message ID: ...
```

**In MoceanAPI Dashboard:**
- View all sent messages
- See delivery status
- Check error logs
- Monitor costs

---

## 🔐 Security Best Practices

1. **Never expose credentials**
   - Keep MoceanAPI keys in `.env`
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Verify phone numbers**
   - Validate format before saving
   - Use international format
   - Sanitize user input

3. **Rate limiting**
   - Monitor SMS usage
   - Set up alerts in MoceanAPI
   - Consider implementing app-level rate limits

---

## 🎯 Next Steps

1. ✅ Sign up for MoceanAPI account
2. ✅ Add credentials to `.env`
3. ✅ Run test script: `npm run test:sms`
4. ✅ Add phone numbers to architect users
5. ✅ Test full flow: Assign a contact to an architect

---

## 📞 Support

### MoceanAPI Support
- Website: https://moceanapi.com
- Documentation: Check MoceanAPI dashboard
- Support: Contact via MoceanAPI website

### Need Help?
- Check logs in console
- Review MoceanAPI dashboard
- Test with `npm run test:sms`
- Check phone number format

---

## 📝 Quick Reference

```bash
# Test MoceanAPI configuration
npm run test:sms

# Send test SMS
npm run test:sms +212636939179

# Test notification with SMS
npm run test:notification-sms <userId> <phoneNumber>
```

**Environment Variables:**
```env
MOCEAN_API_KEY=your_api_key_here
MOCEAN_API_SECRET=your_api_secret_here
MOCEAN_FROM_NUMBER=SIGNATURE8
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
- ✅ Free trial, no credit card needed

**Enjoy your SMS notifications! 📱**





