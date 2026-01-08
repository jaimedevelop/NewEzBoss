import { Estimate } from '../estimates/estimates.types';

const MAILGUN_API_KEY = import.meta.env.VITE_MAILGUN_API_KEY;
const MAILGUN_DOMAIN = import.meta.env.VITE_MAILGUN_DOMAIN;
const APP_URL = import.meta.env.VITE_APP_URL; // e.g., https://yourapp.com

interface SendEstimateEmailParams {
    estimate: Estimate;
    recipientEmail: string;
    recipientName: string;
    contractorName: string;
    contractorEmail: string;
}

/**
 * Send estimate email to client via Mailgun
 */
export const sendEstimateEmail = async (params: SendEstimateEmailParams): Promise<any> => {
    const { estimate, recipientEmail, recipientName, contractorName, contractorEmail } = params;

    const viewUrl = `${APP_URL}/client/estimate/${estimate.emailToken}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2563eb;
            margin-top: 0;
            font-size: 28px;
          }
          .estimate-details {
            background-color: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .estimate-details p {
            margin: 8px 0;
          }
          .view-button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.2s;
          }
          .view-button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Estimate ${estimate.estimateNumber}</h1>
          <p>Hello ${recipientName},</p>
          <p>${contractorName} has sent you an estimate for your project.</p>
          
          <div class="estimate-details">
            <p><strong>Total:</strong> $${estimate.total.toFixed(2)}</p>
            ${estimate.validUntil ? `<p><strong>Valid Until:</strong> ${new Date(estimate.validUntil).toLocaleDateString()}</p>` : ''}
          </div>
          
          <a href="${viewUrl}" class="view-button">View Estimate</a>
          
          <p class="footer">
            If you have questions, please reply to ${contractorEmail}
          </p>
        </div>
        
        <!-- Tracking pixel -->
        <img src="${APP_URL}/.netlify/functions/track-email-open?token=${estimate.emailToken}" width="1" height="1" alt="" style="display:block;" />
      </body>
    </html>
  `;

    const response = await fetch(
        `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                from: `${contractorName} <noreply@${MAILGUN_DOMAIN}>`,
                to: recipientEmail,
                subject: `Estimate ${estimate.estimateNumber} from ${contractorName}`,
                html: htmlContent,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Send notification to contractor about client activity
 */
export const sendContractorNotification = async (
    contractorEmail: string,
    eventType: 'opened' | 'approved' | 'rejected' | 'commented' | 'on-hold',
    estimate: Estimate,
    additionalInfo?: string
): Promise<any> => {
    const messages = {
        opened: `${estimate.customerName} has opened estimate ${estimate.estimateNumber}`,
        approved: `${estimate.customerName} has APPROVED estimate ${estimate.estimateNumber}! ✅`,
        rejected: `${estimate.customerName} has rejected estimate ${estimate.estimateNumber}`,
        commented: `${estimate.customerName} commented on estimate ${estimate.estimateNumber}`,
        'on-hold': `${estimate.customerName} has put estimate ${estimate.estimateNumber} on hold`
    };

    const subject = messages[eventType];

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            margin-top: 0;
            font-size: 24px;
          }
          .event-${eventType} {
            background-color: ${eventType === 'approved' ? '#dcfce7' : eventType === 'rejected' ? '#fee2e2' : '#dbeafe'};
            border-left: 4px solid ${eventType === 'approved' ? '#16a34a' : eventType === 'rejected' ? '#dc2626' : '#2563eb'};
            padding: 20px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .info {
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 4px;
            margin: 16px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${subject}</h1>
          
          <div class="event-${eventType}">
            <p><strong>Estimate:</strong> ${estimate.estimateNumber}</p>
            <p><strong>Customer:</strong> ${estimate.customerName}</p>
            <p><strong>Total:</strong> $${estimate.total.toFixed(2)}</p>
          </div>
          
          ${additionalInfo ? `
            <div class="info">
              <p><strong>${eventType === 'commented' ? 'Comment' : 'Reason'}:</strong></p>
              <p>${additionalInfo}</p>
            </div>
          ` : ''}
          
          <p>Log in to your dashboard to view details.</p>
        </div>
      </body>
    </html>
  `;

    const response = await fetch(
        `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                from: `NewEzBoss Notifications <noreply@${MAILGUN_DOMAIN}>`,
                to: contractorEmail,
                subject: subject,
                html: htmlContent,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    return response.json();
};
