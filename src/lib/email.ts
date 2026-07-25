import prisma from '@/lib/prisma';

export interface EmailNotificationPayload {
  to?: string;
  subject: string;
  body: string;
  type?: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'NEW_TENANT' | 'TENANT_CHECKOUT' | 'RENT_DUE' | 'NEW_COMPLAINT' | 'IMPORTANT_SCHEDULE' | 'CONTRACT_EXPIRING' | 'IMPORTANT_DATA_CHANGE';
}

/**
 * Sends email notifications to the owner (or specified recipient).
 * Supports standard SMTP environment variables.
 * Falls back to logging gracefully if SMTP credentials are not configured.
 */
export async function sendEmailNotification(payload: EmailNotificationPayload): Promise<boolean> {
  const { subject, body, type = 'IMPORTANT_DATA_CHANGE' } = payload;
  
  try {
    // Resolve Owner email from database or env
    let targetEmail = payload.to;
    if (!targetEmail) {
      if (process.env.OWNER_EMAIL) {
        targetEmail = process.env.OWNER_EMAIL;
      } else {
        const owner = await prisma.user.findFirst({
          where: { role: 'OWNER' },
          select: { email: true }
        });
        targetEmail = owner?.email || 'owner@kostrij.com';
      }
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Kos Tri J System" <no-reply@kostrij.com>';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px; backgroundColor: #ffffff;">
        <div style="background-color: #1e293b; padding: 16px 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #38bdf8; margin: 0; font-size: 20px; font-weight: 700;">Kos Tri J — System Notification</h2>
        </div>
        <div style="padding: 24px;">
          <div style="display: inline-block; padding: 4px 12px; background-color: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;">
            ${type.replace(/_/g, ' ')}
          </div>
          <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">${subject}</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${body}</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px; margin: 0;">Email otomatis ini dikirim oleh Sistem Manajemen Kos Tri J pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}.</p>
        </div>
      </div>
    `;

    if (host && user && pass) {
      // SMTP logic using nodemailer if available, or direct SMTP transport
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user, pass },
        });

        await transporter.sendMail({
          from,
          to: targetEmail,
          subject: `[Kos Tri J] ${subject}`,
          html: htmlBody,
          text: body,
        });

        console.log(`[Email System] Notification email sent successfully to ${targetEmail} for subject: "${subject}"`);
        return true;
      } catch (err) {
        console.warn('[Email System] SMTP configured but nodemailer transport failed:', err);
      }
    }

    // Graceful fallback logging when SMTP is not active
    console.log(`[Email System Mock/Fallback] Target: ${targetEmail} | Subject: "${subject}" | Content: ${body.substring(0, 100)}...`);
    return true;

  } catch (error) {
    console.error('[Email System] Exception in sendEmailNotification:', error);
    return false;
  }
}
