# Resend Domain Verification Guide

## Important: You Verify the DOMAIN, Not the Email Address

When setting up Resend, you verify the **domain** (`sketch.ma`), not a specific email address. Once the domain is verified, you can use **any email address** from that domain.

## Step-by-Step Domain Verification

### Step 1: Go to Resend Domains Page
Visit: **https://resend.com/domains**

### Step 2: Add Your Domain
1. Click the **"Add Domain"** button
2. Enter your domain: **`sketch.ma`** (NOT the email address)
3. Click **"Add"**

### Step 3: Get DNS Records
Resend will show you DNS records to add. You'll typically see:

#### Record 1: Domain Verification (TXT)
- **Type**: TXT
- **Name**: `@` or `sketch.ma`
- **Value**: Something like `resend-domain-verification=abc123...`
- **TTL**: 3600 (or default)

#### Record 2: SPF Record (TXT)
- **Type**: TXT
- **Name**: `@` or `sketch.ma`
- **Value**: `v=spf1 include:resend.com ~all`
- **TTL**: 3600 (or default)

#### Record 3: DKIM Record (TXT)
- **Type**: TXT
- **Name**: `resend._domainkey` or similar
- **Value**: Something like `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...`
- **TTL**: 3600 (or default)

### Step 4: Add DNS Records to Your Domain Provider

You need to add these records where you manage your domain DNS (e.g., GoDaddy, Namecheap, Cloudflare, etc.):

1. Log in to your domain registrar/DNS provider
2. Go to DNS Management
3. Add each TXT record exactly as Resend shows
4. Save the changes

### Step 5: Wait for Verification
- DNS changes can take a few minutes to 48 hours to propagate
- Resend will automatically check and verify
- You'll see the status change from "Pending" to "Verified" in Resend dashboard

### Step 6: Once Verified
Once `sketch.ma` is verified, you can use **any email address** from that domain:
- ✅ `i.aboulfadl@sketch.ma`
- ✅ `noreply@sketch.ma`
- ✅ `notifications@sketch.ma`
- ✅ Any other email you want

### Step 7: Update Your .env File
```env
RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
```

### Step 8: Restart Your Server
After updating `.env`, restart your server.

## Common Issues

### Issue: "Domain already exists"
- Someone may have already added this domain
- Check if you have access to the Resend account that owns it
- You may need to use a different Resend account or contact Resend support

### Issue: "Can't add domain"
- Make sure you're logged into the correct Resend account
- Check if you have the right permissions
- Try a different browser or clear cache

### Issue: "DNS records not verifying"
- Wait longer (can take up to 48 hours)
- Double-check DNS records are added correctly
- Make sure there are no typos in the record values
- Use a DNS checker tool to verify records are live

## Alternative: Use Resend's Default Email (Temporary)

If you can't verify your domain right now, you can temporarily:

1. **Remove or comment out** `RESEND_FROM_EMAIL` in your `.env`:
   ```env
   # RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
   ```

2. The system will use `onboarding@resend.dev` automatically

3. **BUT**: You'll still be limited to sending only to your verified email address (`i.aboulfadl@sketch.ma`) until you verify the domain

## Need Help?

If you're having trouble:
1. Check Resend documentation: https://resend.com/docs
2. Contact Resend support: support@resend.com
3. Check your DNS provider's documentation for adding TXT records

## Quick Checklist

- [ ] Go to https://resend.com/domains
- [ ] Click "Add Domain"
- [ ] Enter: `sketch.ma` (domain only, not email)
- [ ] Copy all DNS records shown
- [ ] Add DNS records to your domain provider
- [ ] Wait for verification (check status in Resend)
- [ ] Once verified, set `RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma` in `.env`
- [ ] Restart server
- [ ] Test email sending


