# DNS Setup Steps for sketch.ma

## Current Status
✅ Domain `sketch.ma` has been added to Resend
⏳ Waiting for DNS records to be added and verified

## Next Steps

### Step 1: Add DNS Records to Your Domain Provider

You need to add the DNS records shown in Resend to wherever you manage your domain DNS (e.g., GoDaddy, Namecheap, Cloudflare, OVH, etc.).

#### Record 1: Domain Verification (DKIM)
- **Type**: `TXT`
- **Name**: `resend._domainkey`
- **Content**: `p=MIGfMA0GCSqGSIb3DQEB...` (the full value from Resend)
- **TTL**: `Auto` or `3600`

#### Record 2: Enable Sending (MX)
- **Type**: `MX`
- **Name**: `send`
- **Content**: `feedback-smtp.us-east-...` (the full value from Resend)
- **TTL**: `Auto` or `3600`
- **Priority**: `10`

#### Record 3: Enable Sending (SPF)
- **Type**: `TXT`
- **Name**: `send`
- **Content**: `v=spf1 include:amazons...` (the full value from Resend)
- **TTL**: `Auto` or `3600`

### Step 2: How to Add DNS Records

1. **Log in to your domain provider** (where you bought/manage sketch.ma)
2. **Go to DNS Management** (might be called "DNS Settings", "DNS Records", "Zone Editor", etc.)
3. **Add each record** exactly as shown in Resend:
   - Click "Add Record" or similar
   - Select the Type (TXT or MX)
   - Enter the Name exactly as shown
   - Paste the Content value completely
   - Set TTL (Auto or 3600)
   - For MX record, set Priority to 10
   - Save each record

### Step 3: Wait for Verification

- DNS changes can take **5 minutes to 48 hours** to propagate
- Resend will automatically check and verify
- Go back to https://resend.com/domains
- You'll see the status change from "Pending" to "Verified"
- The green checkmarks will appear when records are detected

### Step 4: Once Verified

1. **Update your `.env` file**:
   ```env
   RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma
   ```

2. **Restart your server**:
   - Stop the server (Ctrl+C)
   - Start again: `npm run dev` or `pnpm dev`

3. **Test email sending**:
   ```
   GET /api/email/test?email=issam.aboulfadl05@gmail.com
   ```

## Common Domain Providers

### GoDaddy
1. Go to "My Products" → "DNS"
2. Click "Add" under DNS Records
3. Select Type, enter Name and Value

### Namecheap
1. Go to "Domain List" → Click "Manage"
2. Go to "Advanced DNS" tab
3. Click "Add New Record"

### Cloudflare
1. Go to your domain → "DNS" section
2. Click "Add record"
3. Select Type, enter Name and Content

### OVH
1. Go to "Web Cloud" → "Domains"
2. Click on sketch.ma → "DNS Zone"
3. Click "Add an entry"

## Troubleshooting

### Records not verifying after 24 hours?
- Double-check you copied the **entire** Content value (it's long!)
- Make sure there are no extra spaces
- Verify the Name is exactly as shown (case-sensitive)
- Use a DNS checker tool: https://mxtoolbox.com/TXTLookup.aspx

### Still showing "Pending"?
- DNS propagation can take up to 48 hours
- Make sure all 3 records are added
- Check your DNS provider's documentation

### Need help finding your DNS provider?
- Check your domain registrar (where you bought sketch.ma)
- Look for "DNS Management" or "DNS Settings" in your account

