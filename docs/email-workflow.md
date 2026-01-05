# Email Workflow System - Setup & Usage Guide

## Overview

This system enables contractors to send professional estimates to clients via email, track engagement, and receive client responses through a secure portal. All interactions trigger automated notifications to keep you informed.

## Features

✅ **Email Delivery** - Send estimates via Mailgun with professional HTML templates
✅ **Email Tracking** - Track when clients open emails and view estimates  
✅ **Client Portal** - Secure, no-login portal for clients to view estimates
✅ **Approve/Reject** - Clients can approve or reject estimates with optional comments
✅ **Two-Way Comments** - Communicate with clients through the estimate
✅ **Automated Notifications** - Get notified when clients open, comment, approve, or reject
✅ **Status Automation** - Estimate status updates automatically based on client actions

## Setup Instructions

### 1. Mailgun Configuration

#### Sign Up
1. Go to [mailgun.com](https://mailgun.com)
2. Create a free account (5,000 emails/month)
3. Verify your email address

#### Get API Credentials
1. Navigate to **Settings** → **API Keys**
2. Copy your **Private API Key**
3. Note your **Domain** (e.g., `mg.yourdomain.com` or sandbox domain)

#### Sandbox Testing (Development)
For testing, you can use Mailgun's sandbox domain:
1. Go to **Sending** → **Domains**
2. Click on your sandbox domain
3. Add **Authorized Recipients** (your test email addresses)
4. Only authorized emails will receive test messages

#### Production Domain (Optional)
For production, add your own domain:
1. Go to **Sending** → **Domains** → **Add New Domain**
2. Follow DNS verification steps
3. Wait for verification (can take up to 48 hours)

### 2. Environment Variables

Your `.env` file should contain:

```env
# Mailgun Configuration
VITE_MAILGUN_API_KEY=your_mailgun_private_api_key
VITE_MAILGUN_DOMAIN=mg.yourdomain.com  # or sandbox domain

# Application URL
VITE_APP_URL=http://localhost:5173  # Development
# VITE_APP_URL=https://easierboss.netlify.app  # Production (uncomment when deploying)

# Firebase Configuration (existing)
# ... your existing Firebase vars ...
```

**Important:** 
- Never commit `.env` to Git (it's in `.gitignore`)
- For Netlify deployment, add these as **Environment Variables** in Netlify dashboard

### 3. Netlify Deployment

#### Add Environment Variables
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - `VITE_MAILGUN_API_KEY`
   - `VITE_MAILGUN_DOMAIN`
   - `VITE_APP_URL` (set to `https://easierboss.netlify.app`)
   - All your Firebase config variables

#### Deploy
```bash
git add .
git commit -m "Add email integration system"
git push origin main
```

Netlify will automatically:
- Build your app
- Deploy the tracking pixel serverless function
- Make it available at `https://easierboss.netlify.app`

## Usage Guide

### Sending an Estimate

1. **Create Estimate**
   - Navigate to Estimates
   - Create a new estimate with line items
   - Add customer email address

2. **Prepare for Sending**
   - Set status to **"Estimate"** (or leave as "Draft" and it will auto-update)
   - Review all details
   - Ensure customer email is correct

3. **Send Email**
   - Click **"Send Estimate"** button in header
   - Wait for confirmation message
   - Status automatically changes to **"Sent"**

4. **Track Engagement**
   - View "Last sent" timestamp in header
   - See open count when client views estimate
   - Status changes to **"Viewed"** on first open

### Client Experience

When you send an estimate, the client receives:

1. **Email Notification**
   - Professional HTML email
   - Estimate summary (number, total, valid until)
   - "View Estimate" button

2. **Client Portal**
   - Click button to view full estimate
   - See all line items, totals, notes
   - No login required (secure token-based access)

3. **Actions Available**
   - **Approve** - Accept the estimate
   - **Reject** - Decline with optional reason
   - **Comment** - Ask questions or provide feedback

### Contractor Notifications

You receive email notifications when clients:
- ✉️ **Open the estimate** (first time only)
- 💬 **Add a comment**
- ✅ **Approve the estimate**
- ❌ **Reject the estimate**

### Status Flow

The estimate status updates automatically:

```
Draft → Estimate → Sent → Viewed → Accepted/Rejected
         (manual)  (auto)  (auto)    (auto)
```

**Manual Statuses:**
- `Draft` - Work in progress
- `Estimate` - Ready to send
- `Change Order` - Additions during job
- `Quote` - Final record
- `Expired` - No longer valid

**Auto-Set Statuses** (cannot be manually selected):
- `Sent` - Email sent to client
- `Viewed` - Client opened email/estimate
- `Accepted` - Client approved
- `Rejected` - Client declined

## Testing Workflow

### Local Testing

1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Create Test Estimate**
   - Use your own email as customer email
   - Add some line items
   - Set status to "Estimate"

3. **Send Email**
   - Click "Send Estimate"
   - Check your inbox (including spam folder)

4. **Test Client Portal**
   - Click "View Estimate" in email
   - Should open `http://localhost:5173/client/estimate/[token]`
   - Try approving/rejecting
   - Add a comment

5. **Check Notifications**
   - Verify you receive contractor notification emails
   - Check estimate status updates in dashboard

### Production Testing

1. **Deploy to Netlify**
   ```bash
   git push origin main
   ```

2. **Update Environment**
   - Ensure `VITE_APP_URL` is set to production URL in Netlify

3. **Test End-to-End**
   - Send estimate from production site
   - Email should link to `https://easierboss.netlify.app/client/estimate/[token]`
   - Complete full workflow

## Troubleshooting

### Email Not Sending

**Check:**
- ✓ Mailgun API key is correct in `.env`
- ✓ Domain is verified (or using sandbox with authorized recipients)
- ✓ Customer email is valid
- ✓ Check browser console for errors
- ✓ Check Netlify function logs

**Common Issues:**
- **401 Unauthorized** - Wrong API key
- **403 Forbidden** - Sandbox domain, recipient not authorized
- **Network Error** - Check internet connection

### Tracking Pixel Not Working

The tracking pixel logs opens in Netlify function logs but doesn't update the database. This is by design - actual tracking happens when the client clicks "View Estimate" and visits the portal.

**To view tracking logs:**
1. Go to Netlify dashboard
2. Navigate to **Functions** → **track-email-open**
3. View logs to see when emails are opened

### Client Portal Not Loading

**Check:**
- ✓ Token is in URL: `/client/estimate/[token]`
- ✓ Estimate exists in database
- ✓ Token matches estimate's `emailToken` field
- ✓ Browser console for errors

### Status Not Updating

**Check:**
- ✓ Auto-set statuses are disabled in dropdown
- ✓ Client successfully approved/rejected
- ✓ Firebase permissions allow updates
- ✓ Check browser console for errors

## Security Considerations

✅ **Token Security**
- Tokens generated using `crypto.randomUUID()` (cryptographically secure)
- Not predictable or guessable
- Unique per estimate

✅ **Access Control**
- Client portal requires valid token
- No authentication needed (token = access)
- Tokens don't expire (estimate validity handled separately)

✅ **Input Sanitization**
- Client comments should be sanitized (consider adding XSS protection)
- Email addresses validated before sending

⚠️ **Recommendations:**
- Add rate limiting to tracking pixel endpoint
- Implement token expiration based on `estimate.validUntil`
- Sanitize client input to prevent XSS attacks
- Monitor for abuse (excessive email sends)

## API Reference

### Email Functions

#### `sendEstimateEmail(params)`
Sends estimate email to client via Mailgun.

```typescript
await sendEstimateEmail({
  estimate: estimateWithToken,
  recipientEmail: 'client@example.com',
  recipientName: 'John Doe',
  contractorName: 'Your Company',
  contractorEmail: 'you@company.com'
});
```

#### `sendContractorNotification(email, eventType, estimate, additionalInfo?)`
Sends notification to contractor about client activity.

```typescript
await sendContractorNotification(
  'contractor@example.com',
  'approved',
  estimate,
  'Client is ready to proceed'
);
```

### Estimate Mutations

#### `prepareEstimateForSending(estimateId)`
Generates secure token and prepares estimate for sending.

```typescript
const { success, token, error } = await prepareEstimateForSending(estimateId);
```

#### `trackEmailOpen(token)`
Tracks email open and updates estimate status.

```typescript
await trackEmailOpen(token);
```

#### `addClientComment(estimateId, comment)`
Adds client comment and notifies contractor.

```typescript
await addClientComment(estimateId, {
  text: 'When can you start?',
  authorName: 'John Doe',
  authorEmail: 'john@example.com',
  isContractor: false
});
```

#### `handleClientResponse(estimateId, response, clientName, clientEmail, reason?)`
Handles client approval or rejection.

```typescript
await handleClientResponse(
  estimateId,
  'approved',
  'John Doe',
  'john@example.com'
);
```

### Queries

#### `getEstimateByToken(token)`
Retrieves estimate by secure token (for client portal).

```typescript
const estimate = await getEstimateByToken(token);
```

## Future Enhancements

Potential improvements to consider:

- [ ] Timeline view showing all estimate events
- [ ] Contractor-side comment replies
- [ ] Email templates customization
- [ ] PDF generation and attachment
- [ ] Reminder emails for pending estimates
- [ ] Analytics dashboard (open rates, response times)
- [ ] Multiple recipient support
- [ ] SMS notifications option
- [ ] Client signature capture
- [ ] Payment integration

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check Netlify function logs
4. Verify Mailgun dashboard for email delivery status
5. Test with sandbox domain first before production
