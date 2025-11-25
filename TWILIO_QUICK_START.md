# 📱 Twilio SMS - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Get Twilio Credentials (2 minutes)

1. Go to [twilio.com](https://www.twilio.com) and sign up
2. From dashboard, copy:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
3. Buy a phone number: Phone Numbers → Buy a Number

### 2. Add to .env (30 seconds)

Open your `.env` file and add:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Test Configuration (30 seconds)

```bash
npm run test:sms
```

You should see: ✅ Twilio configured successfully!

### 4. Send Test SMS (30 seconds)

```bash
npm run test:sms +212612345678
```

Replace with your phone number.

### 5. Add Phone to Users (1 minute)

Add phone numbers to users who should receive SMS:

```bash
npx prisma studio
```

Go to `users` table → Add phone in international format: `+212612345678`

---

## ✅ That's It!

SMS notifications are now active! When you assign a contact to an architect, they'll receive both:
- 📱 In-app notification
- 💬 SMS message

---

## 🧪 Quick Test

```bash
# 1. Get a user ID from database
npx prisma studio

# 2. Test notification with SMS
npm run test:notification-sms <userId> +212612345678
```

---

## 📊 Monitor

**Console logs:**
```
[Twilio] SMS sent successfully. SID: SM...
```

**Twilio Dashboard:**
https://www.twilio.com/console/sms/logs

---

## 💰 Cost

~$0.05 per SMS to Morocco
≈ $5/month for 100 notifications

Free trial: $15.50 credit included

---

## 📚 Full Documentation

See `docs/TWILIO_SMS_SETUP.md` for complete documentation.

---

## 🆘 Troubleshooting

### SMS not sending?

```bash
# Check configuration
npm run test:sms

# Check logs
[Twilio] Twilio not configured...
# → Add credentials to .env

[Twilio] SMS requested but no phone number...
# → Add phone to user in database
```

### "Unverified number" error?

**Trial account limitation:**
- Can only send to verified numbers
- Verify in: Twilio Console → Phone Numbers → Verified
- Or upgrade to paid (no restrictions)

---

## 🎯 Where SMS is Sent

Automatically sent when:
1. ✅ Converting lead to contact (with architect)
2. ✅ Creating new contact (with architect)
3. ✅ Reassigning architect to existing contact

All in real-time! 📱⚡

---

**Need help?** Check `docs/TWILIO_SMS_SETUP.md` for detailed docs.

