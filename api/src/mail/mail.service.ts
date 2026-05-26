import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<string>('MAIL_ENABLED') === 'true';
  }

  private getTransporter(): Transporter | null {
    if (!this.isEnabled()) {
      return null;
    }
    if (!this.transporter) {
      const host = this.config.get<string>('SMTP_HOST');
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      if (!host) {
        this.logger.warn('MAIL_ENABLED=true mais SMTP_HOST manquant');
        return null;
      }
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
    return this.transporter;
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    const transport = this.getTransporter();
    if (!transport) {
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'noreply@vifaa.local';
    const frontUrl = this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '');
    const html = `
      <p>${text.replace(/\n/g, '<br>')}</p>
      ${frontUrl ? `<p><a href="${frontUrl}/dashboard">Ouvrir l’ERP VIFAA</a></p>` : ''}
    `;

    try {
      await transport.sendMail({
        from,
        to,
        subject: `[VIFAA ERP] ${subject}`,
        text,
        html,
      });
    } catch (err) {
      this.logger.error(`Échec envoi e-mail à ${to}`, err);
    }
  }
}
