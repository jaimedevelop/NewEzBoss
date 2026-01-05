import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * Netlify serverless function to serve tracking pixel for email opens
 * 
 * This function returns a 1x1 transparent PNG pixel.
 * The actual tracking happens when the client clicks "View Estimate" 
 * and visits the ClientEstimateView page, which calls trackEmailOpen().
 * 
 * This pixel serves as a backup tracking method for email clients that
 * load images automatically.
 * 
 * Route: /.netlify/functions/track-email-open
 * Called as: <img src="https://easierboss.netlify.app/.netlify/functions/track-email-open?token=xxx" />
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Extract token from query parameters
  const token = event.queryStringParameters?.token;

  if (token) {
    // Log the tracking event (visible in Netlify function logs)
    console.log(`[Email Tracking] Email opened for token: ${token} at ${new Date().toISOString()}`);
    
    // Note: We don't update the database here because:
    // 1. It would require Firebase Admin SDK setup in serverless function
    // 2. The ClientEstimateView already handles tracking when user clicks link
    // 3. This is just a backup/supplementary tracking method
    
    // In the future, you could:
    // - Store tracking events in a separate analytics service
    // - Use Firebase Admin SDK to update the estimate
    // - Send webhook to another service
  }

  // Return 1x1 transparent PNG pixel
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    },
    body: pixel.toString('base64'),
    isBase64Encoded: true
  };
};
