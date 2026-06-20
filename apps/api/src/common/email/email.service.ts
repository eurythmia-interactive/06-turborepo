import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { invitationTemplate } from './templates/invitation.js';
import { welcomeTemplate } from './templates/welcome.js';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      console.warn('[EmailService] RESEND_API_KEY not set - emails will be logged to console');
    }
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resend) {
      console.log(`[Email] To: ${to}`);
      console.log(`[Email] Subject: ${subject}`);
      console.log(`[Email] Body: ${html.substring(0, 200)}...`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  async sendInvitation(
    to: string,
    invitationLink: string,
    tenantName: string,
    inviterName: string,
  ): Promise<boolean> {
    const html = invitationTemplate({ invitationLink, tenantName, inviterName });
    return this.send(to, `You're invited to join ${tenantName}`, html);
  }

  async sendWelcome(to: string, userName: string): Promise<boolean> {
    const html = welcomeTemplate({ userName });
    return this.send(to, 'Welcome to our platform!', html);
  }
}
