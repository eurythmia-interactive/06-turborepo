interface InvitationTemplateProps {
  invitationLink: string;
  tenantName: string;
  inviterName: string;
}

export function invitationTemplate({
  invitationLink,
  tenantName,
  inviterName,
}: InvitationTemplateProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #3b82f6; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">You're Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">
                ${inviterName ? `Hi there! ${inviterName} has invited you to join ` : 'You have been invited to join '}<strong>${tenantName}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #333333;">
                Click the button below to accept your invitation and get started.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; color: #666666;">
                Or copy and paste this link into your browser:<br>
                <a href="${invitationLink}" style="color: #3b82f6; word-break: break-all;">${invitationLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This invitation will expire in 7 days.<br>
                If you didn't expect this invitation, you can safely ignore this email.
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
}
