interface WelcomeTemplateProps {
  userName: string;
}

export function welcomeTemplate({ userName }: WelcomeTemplateProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome Aboard!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">
                Hi ${userName}!
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">
                Welcome to our platform! Your account has been successfully created.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #333333;">
                You can now log in and start exploring all the features we have to offer.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${process.env.WEB_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                If you have any questions, feel free to reach out to our support team.
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
