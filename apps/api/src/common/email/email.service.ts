import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    this.fromAddress =
      this.configService.get<string>("SMTP_FROM") || "noreply@nerva.app";
    this.frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    if (!host) {
      this.logger.warn(
        "SMTP_HOST is not configured. Email sending is disabled. " +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to enable emails.",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get<string>("SMTP_PORT") || "587"),
      secure:
        Number(this.configService.get<string>("SMTP_PORT") || "587") === 465,
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASS"),
      },
    });

    this.logger.log(`Email service configured with SMTP host: ${host}`);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent to ${to} (subject: "${subject}") — SMTP is not configured.`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} (subject: "${subject}")`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to} (subject: "${subject}"): ${error.message}`,
        error.stack,
      );
    }
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    tenantId: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nerva</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;font-weight:600;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your Nerva account. Click the button below to choose a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#718096;font-size:13px;line-height:1.5;">
                This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;line-height:1.5;">
                If the button above doesn't work, copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Nerva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await this.sendEmail(to, "Reset your Nerva password", html);
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendPaymentReceiptEmail(
    to: string,
    params: {
      planName: string;
      billingCycle: string;
      amountFormatted: string;
      reference: string;
      date: string;
    },
  ): Promise<void> {
    const billingUrl = `${this.frontendUrl}/settings/billing`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nerva</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;font-weight:600;">Payment Confirmed</h2>
              <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                Your payment has been successfully processed. Here are the details:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#718096;font-size:14px;">Plan</td>
                        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${params.planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#718096;font-size:14px;">Billing Cycle</td>
                        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize;">${params.billingCycle}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#718096;font-size:14px;">Amount</td>
                        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${params.amountFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#718096;font-size:14px;">Reference</td>
                        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${params.reference}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#718096;font-size:14px;">Date</td>
                        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${params.date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${billingUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      View Billing
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Nerva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await this.sendEmail(to, "Nerva Payment Confirmation", html);
  }

  async sendPaymentFailedEmail(
    to: string,
    params: {
      planName: string;
      reference: string;
    },
  ): Promise<void> {
    const billingUrl = `${this.frontendUrl}/settings/billing`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nerva</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;font-weight:600;">Payment Failed</h2>
              <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                Your payment for the <strong>${params.planName}</strong> plan could not be processed (ref: ${params.reference}).
                Please try again or use a different payment method.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${billingUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      Retry Payment
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#718096;font-size:13px;line-height:1.5;">
                If you continue to experience issues, please contact our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Nerva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await this.sendEmail(to, "Nerva Payment Failed", html);
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    tenantId: string,
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nerva</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;font-weight:600;">Verify your email address</h2>
              <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                Thanks for signing up for Nerva! Please verify your email address by clicking the button below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${verifyUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#718096;font-size:13px;line-height:1.5;">
                This link will expire in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;line-height:1.5;">
                If the button above doesn't work, copy and paste this URL into your browser:<br>
                <a href="${verifyUrl}" style="color:#3b82f6;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Nerva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await this.sendEmail(to, "Verify your Nerva email address", html);
  }
}
