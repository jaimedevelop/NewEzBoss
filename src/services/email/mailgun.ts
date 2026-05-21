import { Estimate } from '../estimates/estimates.types';
import { buildEstimateEmailHtml, buildContractorNotificationHtml } from './estimateEmailTemplate';

const MAILGUN_API_KEY = import.meta.env.VITE_MAILGUN_API_KEY;
const MAILGUN_DOMAIN = import.meta.env.VITE_MAILGUN_DOMAIN;
const APP_URL = import.meta.env.VITE_APP_URL; // e.g., https://yourapp.com

interface SendEstimateEmailParams {
  estimate: Estimate;
  recipientEmail: string;
  recipientName: string;
  contractorName: string;
  contractorEmail: string;
  // Optional custom fields from send modal
  customSubject?: string;
  customMessage?: string;
  ccEmails?: string;
}

/**
 * Send estimate email to client via Mailgun
 */

export const sendEstimateEmail = async (params: SendEstimateEmailParams): Promise<any> => {
  const {
    estimate,
    recipientEmail,
    recipientName,
    contractorName,
    contractorEmail,
    customSubject,
    customMessage,
    ccEmails
  } = params;
  console.log('MAILGUN FILE LOADED - template version: ORANGE');
  // Validate recipient email
  if (!recipientEmail || !recipientEmail.trim()) {
    throw new Error('Missing recipient email');
  }

  if (!contractorEmail || !contractorEmail.trim()) {
    throw new Error('Missing contractor email');
  }

  const viewUrl = `${APP_URL}/client/estimate/${estimate.emailToken}`;

  // Use custom message if provided, otherwise use default template
  const messageContent = customMessage || `${contractorName} has sent you an estimate for your project.`;

  const htmlContent = buildEstimateEmailHtml({
    estimate,
    recipientName,
    contractorName,
    contractorEmail,
    messageContent,
    viewUrl,
    trackingPixelUrl: `${APP_URL}/.netlify/functions/track-email-open?token=${estimate.emailToken}`,
  });

  // Prepare email parameters
  const emailParams: Record<string, string> = {
    from: `${contractorName} <noreply@${MAILGUN_DOMAIN}>`,
    to: recipientEmail,
    subject: customSubject || `Estimate ${estimate.estimateNumber} from ${contractorName}`,
    html: htmlContent,
  };

  // Add CC if provided
  if (ccEmails && ccEmails.trim()) {
    emailParams.cc = ccEmails;
  }
  console.log('EMAIL HTML PREVIEW:', htmlContent.substring(0, 200));
  const response = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(emailParams),
    }
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If JSON parsing fails, use statusText
    }
    throw new Error(`Failed to send email: ${errorMessage}`);
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

  const htmlContent = buildContractorNotificationHtml({ estimate, eventType, additionalInfo });
  console.log('EMAIL HTML PREVIEW:', htmlContent.substring(0, 200));
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
