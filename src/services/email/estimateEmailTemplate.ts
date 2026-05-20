import { Estimate } from '../estimates/estimates.types';

interface EstimateEmailTemplateParams {
    estimate: Estimate;
    recipientName: string;
    contractorName: string;
    contractorEmail: string;
    messageContent: string;
    viewUrl: string;
    trackingPixelUrl: string;
}

interface ContractorNotificationTemplateParams {
    estimate: Estimate;
    eventType: 'opened' | 'approved' | 'rejected' | 'commented' | 'on-hold';
    additionalInfo?: string;
}

const ORANGE = '#ea580c';
const ORANGE_DARK = '#c2410c';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#fed7aa';

export const buildEstimateEmailHtml = ({
    estimate,
    recipientName,
    contractorName,
    contractorEmail,
    messageContent,
    viewUrl,
    trackingPixelUrl,
}: EstimateEmailTemplateParams): string => {
    const isChangeOrder = estimate.estimateState === 'change-order';
    const label = isChangeOrder ? 'Change Order' : 'Estimate';

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${label} ${estimate.estimateNumber}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background-color:${ORANGE};border-radius:8px 8px 0 0;padding:28px 40px;">
                <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#fed7aa;">
                  ${contractorName}
                </p>
                <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#ffffff;">
                  ${label} ${estimate.estimateNumber}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background-color:#ffffff;padding:36px 40px;">
                <p style="margin:0 0 16px;font-size:15px;color:#374151;">
                  Hello ${recipientName},
                </p>
                <p style="margin:0 0 28px;font-size:15px;color:#374151;white-space:pre-wrap;line-height:1.7;">
                  ${messageContent}
                </p>

                <!-- Estimate Summary Card -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background-color:${ORANGE_LIGHT};border:1px solid ${ORANGE_BORDER};border-radius:8px;margin-bottom:28px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${ORANGE};">
                        ${label} Summary
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:14px;color:#374151;padding:4px 0;">
                            <strong>Total</strong>
                          </td>
                          <td align="right" style="font-size:18px;font-weight:700;color:#111827;padding:4px 0;">
                            $${estimate.total.toFixed(2)}
                          </td>
                        </tr>
                        ${estimate.validUntil ? `
                        <tr>
                          <td style="font-size:14px;color:#374151;padding:4px 0;">
                            <strong>Valid Until</strong>
                          </td>
                          <td align="right" style="font-size:14px;color:#374151;padding:4px 0;">
                            ${new Date(estimate.validUntil).toLocaleDateString()}
                          </td>
                        </tr>` : ''}
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background-color:${ORANGE};border-radius:6px;">
                      <a href="${viewUrl}"
                        style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                        View ${label} →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:14px;color:#6b7280;">
                  If you have questions, please reply to
                  <a href="mailto:${contractorEmail}" style="color:${ORANGE};text-decoration:none;">${contractorEmail}</a>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 40px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                  Sent via <strong style="color:${ORANGE};">EzBoss</strong> · You received this because ${contractorName} sent you a ${label.toLowerCase()}.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

    <!-- Tracking pixel -->
    <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;" />
  </body>
</html>
  `.trim();
};

export const buildContractorNotificationHtml = ({
    estimate,
    eventType,
    additionalInfo,
}: ContractorNotificationTemplateParams): string => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
        approved: { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
        rejected: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' },
        'on-hold': { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
        opened: { bg: ORANGE_LIGHT, border: ORANGE_BORDER, text: ORANGE_DARK },
        commented: { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
    };

    const eventLabels: Record<string, string> = {
        opened: 'opened',
        approved: 'APPROVED ✅',
        rejected: 'rejected',
        commented: 'commented on',
        'on-hold': 'put on hold',
    };

    const colors = colorMap[eventType] ?? colorMap.opened;
    const label = estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate';
    const eventLabel = eventLabels[eventType];

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background-color:${ORANGE};border-radius:8px 8px 0 0;padding:24px 40px;">
                <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#fed7aa;">
                  EzBoss Notification
                </p>
                <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">
                  Client ${eventLabel} ${label} ${estimate.estimateNumber}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background-color:#ffffff;padding:36px 40px;">

                <!-- Event card -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background-color:${colors.bg};border:1px solid ${colors.border};border-radius:8px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:14px;color:#374151;padding:4px 0;"><strong>${label} #</strong></td>
                          <td align="right" style="font-size:14px;color:#374151;padding:4px 0;">${estimate.estimateNumber}</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px;color:#374151;padding:4px 0;"><strong>Customer</strong></td>
                          <td align="right" style="font-size:14px;color:#374151;padding:4px 0;">${estimate.customerName}</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px;color:#374151;padding:4px 0;"><strong>Total</strong></td>
                          <td align="right" style="font-size:16px;font-weight:700;color:#111827;padding:4px 0;">$${estimate.total.toFixed(2)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${additionalInfo ? `
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">
                        ${eventType === 'commented' ? 'Comment' : 'Reason'}
                      </p>
                      <p style="margin:0;font-size:14px;color:#374151;">${additionalInfo}</p>
                    </td>
                  </tr>
                </table>` : ''}

                <p style="margin:0;font-size:14px;color:#6b7280;">
                  Log in to your EzBoss dashboard to view full details.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 40px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                  <strong style="color:${ORANGE};">EzBoss</strong> · This is an automated notification.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
};