# Email Setup Guide

## Current Issue: Domain Not Verified

Your Resend account is trying to send emails from `i.aboulfadl@sketch.ma`, but the domain `sketch.ma` is not verified in Resend.

## Quick Fix (Temporary)

The system will automatically fall back to `onboarding@resend.dev` if domain verification fails. However, for production use, you should verify your domain.

## Permanent Solution: Verify Your Domain

### Step 1: Go to Resend Domains
Visit: https://resend.com/domains

### Step 2: Add Your Domain
1. Click "Add Domain"
2. Enter: `sketch.ma`
3. Follow the DNS verification steps

### Step 3: Add DNS Records
Resend will provide you with DNS records to add. Typically these include:
- **TXT record** for domain verification
- **SPF record** (TXT)
- **DKIM record** (TXT)
- **DMARC record** (TXT) - optional but recommended

### Step 4: Wait for Verification
- DNS propagation can take a few minutes to 48 hours
- Resend will show verification status in the dashboard

### Step 5: Update Your .env (if needed)
Once verified, your current `.env` setting should work:
```env
RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
```

## Alternative: Use Default Resend Email

If you want to use the default Resend email temporarily, you can:

1. **Remove or comment out** `RESEND_FROM_EMAIL` in your `.env`:
```env
# RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
```

2. The system will automatically use `onboarding@resend.dev`

## Testing

After setting up, test your email configuration:
```
GET /api/email/test?email=your@email.com
```

## Troubleshooting

### Error: "domain is not verified"
- **Solution**: Verify your domain at https://resend.com/domains
- **Temporary**: System will auto-fallback to `onboarding@resend.dev`

### Error: "Invalid API key"
- Check that `RESEND_API_KEY` starts with `re_`
- Ensure no quotes or spaces in `.env` file
- Restart server after changing `.env`

### Emails not arriving
- Check spam folder
- Verify recipient email is correct
- Check Resend dashboard for delivery status
- Review server logs for detailed error messages

## Current Configuration

- **API Key**: ✅ Configured (starts with `re_`)
- **From Email**: `i.aboulfadl@sketch.ma` (requires domain verification)
- **Fallback**: `onboarding@resend.dev` (automatic if domain fails)


