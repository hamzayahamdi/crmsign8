# How to Add DNS Records - Step by Step Guide

## Step 1: Identify Your Domain Provider

Your domain provider is where you:
- Bought the domain `sketch.ma`
- Manage your domain settings
- Pay for domain renewal

**Common providers:**
- GoDaddy
- Namecheap
- Cloudflare
- OVH
- Google Domains
- Name.com
- Bluehost
- Hostinger

**How to find out:**
1. Check your email for domain purchase/renewal emails
2. Check your credit card/bank statements for domain charges
3. Try logging into common providers with your email

## Step 2: Log Into Your Domain Provider

1. Go to your domain provider's website
2. Log in with your account
3. Find your domain `sketch.ma` in your account

## Step 3: Find DNS Management

Look for one of these sections:
- **DNS Management**
- **DNS Settings**
- **DNS Records**
- **Zone Editor**
- **DNS Zone**
- **Advanced DNS**

It's usually in:
- "My Products" → "Domains" → "DNS"
- "Domain List" → "Manage" → "DNS"
- "Web Cloud" → "Domains" → "DNS Zone"

## Step 4: Get DNS Records from Resend

1. Go to: **https://resend.com/domains**
2. Click on your domain `sketch.ma`
3. You'll see the DNS records you need to add
4. **Copy each record completely** (the Content/Value is very long!)

You need to add **3 records**:

### Record 1: DKIM (Domain Verification)
- **Type**: `TXT`
- **Name**: `resend._domainkey`
- **Content**: `p=MIGfMA0GCSqGSIb3DQEB...` (very long string)
- **TTL**: `3600` or `Auto`

### Record 2: SPF MX (Enable Sending)
- **Type**: `MX`
- **Name**: `send`
- **Content/Value**: `feedback-smtp.us-east-...` (the full value)
- **TTL**: `3600` or `Auto`
- **Priority**: `10`

### Record 3: SPF TXT (Enable Sending)
- **Type**: `TXT`
- **Name**: `send`
- **Content**: `v=spf1 include:amazons...` (the full value)
- **TTL**: `3600` or `Auto`

## Step 5: Add Records - Instructions by Provider

### If you use GoDaddy:

1. Log in to GoDaddy
2. Go to **"My Products"**
3. Find `sketch.ma` and click **"DNS"** or **"Manage DNS"**
4. Scroll down to **"Records"** section
5. Click **"Add"** button
6. For each record:
   - **Type**: Select from dropdown (TXT or MX)
   - **Name**: Enter exactly as shown (e.g., `resend._domainkey` or `send`)
   - **Value**: Paste the full Content from Resend
   - **TTL**: Leave as default or set to 3600
   - **Priority**: For MX record, enter `10`
   - Click **"Save"**
7. Repeat for all 3 records

### If you use Namecheap:

1. Log in to Namecheap
2. Go to **"Domain List"**
3. Click **"Manage"** next to `sketch.ma`
4. Go to **"Advanced DNS"** tab
5. Scroll to **"Host Records"** section
6. Click **"Add New Record"**
7. For each record:
   - **Type**: Select from dropdown
   - **Host**: Enter the Name (e.g., `resend._domainkey` or `send`)
   - **Value**: Paste the full Content
   - **TTL**: Select "Automatic" or "30 min"
   - **Priority**: For MX, enter `10`
   - Click the checkmark to save
8. Repeat for all 3 records

### If you use Cloudflare:

1. Log in to Cloudflare
2. Select your domain `sketch.ma`
3. Click **"DNS"** in the left menu
4. Click **"Add record"**
5. For each record:
   - **Type**: Select from dropdown
   - **Name**: Enter exactly as shown
   - **Content**: Paste the full value
   - **TTL**: Select "Auto"
   - **Priority**: For MX, enter `10`
   - Click **"Save"**
6. Repeat for all 3 records

### If you use OVH:

1. Log in to OVH
2. Go to **"Web Cloud"** → **"Domains"**
3. Click on `sketch.ma`
4. Go to **"DNS Zone"** tab
5. Click **"Add an entry"**
6. For each record:
   - **Subdomain**: Enter the Name part (e.g., `resend._domainkey` or `send`)
   - **Type**: Select from dropdown
   - **Target**: Paste the full Content
   - **TTL**: Leave default
   - **Priority**: For MX, enter `10`
   - Click **"Confirm"**
7. Repeat for all 3 records

### If you use another provider:

The process is similar:
1. Find DNS Management/DNS Records section
2. Look for "Add Record" or "Add Entry" button
3. Fill in:
   - Type (TXT or MX)
   - Name/Host (exactly as shown in Resend)
   - Value/Content (the full long string from Resend)
   - TTL (3600 or Auto)
   - Priority (10 for MX record)
4. Save each record

## Step 6: Verify Records Are Added

After adding all 3 records:

1. Go back to **https://resend.com/domains**
2. Click on `sketch.ma`
3. Resend will automatically check for the records
4. You should see:
   - Green checkmarks ✅ next to each record
   - Status changing from "Pending" to "Verified"

**Note:** This can take 5 minutes to 48 hours. Be patient!

## Step 7: Common Mistakes to Avoid

❌ **Don't** add extra spaces in the Content/Value
❌ **Don't** truncate the Content - copy the ENTIRE string
❌ **Don't** change the Name - it must be exactly as shown
❌ **Don't** forget the Priority (10) for the MX record
✅ **Do** copy the entire Content value (it's very long!)
✅ **Do** double-check spelling of the Name field
✅ **Do** wait for DNS propagation (can take time)

## Step 8: Still Need Help?

If you can't find your DNS provider or need help:

1. **Tell me which provider you use** and I'll give specific instructions
2. **Check your email** for domain-related emails (they usually mention the provider)
3. **Contact your domain provider's support** - they can guide you

## Quick Visual Guide

```
Resend Dashboard → Copy DNS Records
         ↓
Your Domain Provider → DNS Management
         ↓
Add 3 Records:
  1. TXT: resend._domainkey
  2. MX: send (Priority 10)
  3. TXT: send
         ↓
Wait for Verification (5 min - 48 hours)
         ↓
Check Resend Dashboard for ✅ Green Checkmarks
```

## After Verification

Once you see green checkmarks in Resend:

1. Update `.env`:
   ```env
   RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
   ```

2. Restart server

3. Test email sending!

