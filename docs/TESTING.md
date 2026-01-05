# Quick Testing Guide - Email Integration

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Environment
Check your `.env` file has:
```env
VITE_MAILGUN_API_KEY=your_actual_key
VITE_MAILGUN_DOMAIN=your_domain
VITE_APP_URL=http://localhost:5173
```

### Step 2: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Create Test Estimate
1. Navigate to **Estimates** → **Create New**
2. Fill in:
   - **Customer Name:** Your Name
   - **Customer Email:** your.email@example.com (use your real email!)
   - **Line Items:** Add 2-3 items
   - **Status:** Set to "Estimate"

### Step 4: Send Email
1. Click **"Send Estimate"** button in header
2. Wait for green success message
3. Verify:
   - ✅ Status changed to "Sent"
   - ✅ "Last sent" timestamp appears
   - ✅ No error messages

### Step 5: Check Email
1. Open your email inbox
2. Look for email from your Mailgun domain
3. **Check spam folder if not in inbox!**
4. Email should have:
   - Estimate number in subject
   - Professional HTML formatting
   - "View Estimate" button
   - Total amount

### Step 6: Test Client Portal
1. Click **"View Estimate"** in email
2. Should open: `http://localhost:5173/client/estimate/[long-token]`
3. Verify you see:
   - Estimate details
   - All line items
   - Totals (subtotal, tax, total)
   - Comment section
   - Approve/Reject buttons

### Step 7: Test Client Actions

#### Add Comment
1. Enter your name and email in comment form
2. Type a test comment: "When can you start?"
3. Click "Add Comment"
4. Check your email for contractor notification

#### Approve Estimate
1. Click **"Approve"** button
2. Confirm approval
3. Check:
   - ✅ Status shows "Approved"
   - ✅ You receive contractor notification email
   - ✅ Dashboard shows status as "Accepted"

## ✅ Success Criteria

You should see:
- [x] Email delivered successfully
- [x] Client portal loads with estimate
- [x] Status updates automatically
- [x] Contractor notifications received
- [x] Email tracking info in dashboard

## ❌ Troubleshooting

### Email Not Received

**Problem:** No email in inbox or spam
**Solutions:**
1. Check Mailgun dashboard → Logs → Sending
2. Verify API key is correct
3. If using sandbox domain, add your email as authorized recipient
4. Check browser console for errors

### "Failed to send estimate" Error

**Problem:** Error message when clicking Send
**Solutions:**
1. Check `.env` file has correct credentials
2. Restart dev server after changing `.env`
3. Check browser console for specific error
4. Verify customer email is valid

### Client Portal Shows "Estimate Not Found"

**Problem:** Token URL doesn't load estimate
**Solutions:**
1. Verify URL has token: `/client/estimate/[token]`
2. Check browser console for errors
3. Verify estimate exists in Firebase
4. Try sending email again

### Status Not Updating

**Problem:** Status doesn't change after client action
**Solutions:**
1. Refresh the page
2. Check browser console for errors
3. Verify Firebase permissions
4. Check network tab for failed requests

## 📊 What to Look For

### In Dashboard
- Email tracking info shows below customer name
- "Last sent" timestamp is accurate
- View count increments when you open portal
- Status changes automatically (can't manually select auto statuses)

### In Email
- Professional formatting
- Correct estimate number and total
- "View Estimate" button works
- Tracking pixel loads (check network tab)

### In Client Portal
- Clean, professional design
- All line items display correctly
- Totals calculate properly
- Comments save and appear
- Approve/Reject buttons work

### In Notifications
- Contractor receives email when client:
  - Opens estimate (first time)
  - Adds comment
  - Approves estimate
  - Rejects estimate

## 🎯 Next: Production Testing

Once local testing passes:

1. **Set Netlify Environment Variables**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add all VITE_* variables
   - Set `VITE_APP_URL=https://easierboss.netlify.app`

2. **Deploy**
   ```bash
   git add .
   git commit -m "Add email integration"
   git push origin main
   ```

3. **Test Production**
   - Send estimate from production site
   - Verify email links to production URL
   - Complete full workflow
   - Check Netlify function logs

## 📝 Test Checklist

- [ ] Dev server running
- [ ] Environment variables set
- [ ] Test estimate created
- [ ] Email sent successfully
- [ ] Email received in inbox
- [ ] Client portal accessible
- [ ] Comment system works
- [ ] Approve/reject works
- [ ] Notifications received
- [ ] Status updates automatically
- [ ] Email tracking displays
- [ ] No console errors

## 🆘 Need Help?

1. Check [docs/email-workflow.md](file:///c:/Users/busin/Desktop/NewEzBoss/docs/email-workflow.md) for detailed guide
2. Review browser console for errors
3. Check Mailgun dashboard for delivery status
4. Verify all environment variables are set
5. Ensure dev server restarted after .env changes

---

**Estimated Testing Time:** 5-10 minutes
**Difficulty:** Easy
**Prerequisites:** Mailgun credentials in .env file
