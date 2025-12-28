import { Resend } from 'resend';
import { config } from './config';

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface TeamInviteEmailParams {
  to: string;
  teamName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('[Email] Resend API key not configured, skipping email');
    return false;
  }

  const { to, teamName, inviterName, inviteLink, role } = params;
  const fullInviteLink = `${config.baseUrl}${inviteLink}`;

  const safeTeamName = escapeHtml(teamName);
  const safeInviterName = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);

  try {
    const { error } = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to,
      subject: `You've been invited to join ${safeTeamName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Team Invitation</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${safeInviterName}</strong> has invited you to join <strong>${safeTeamName}</strong> as a <strong>${safeRole}</strong>.
              </p>
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
                Join the team to collaborate on conversations and share AI-powered insights with your colleagues.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${fullInviteLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; text-align: center;">
                This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${fullInviteLink}" style="color: #667eea; word-break: break-all;">${fullInviteLink}</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send team invite:', error);
      return false;
    }

    const maskedTo = to.split('@')[0].substring(0, 2) + '***@' + to.split('@')[1];
    console.log(`[Email] Team invite sent to ${maskedTo} for team ${teamName}`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending team invite:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}
