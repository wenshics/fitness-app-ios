import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ""); // strip spaces
    if (!user || !pass) {
      throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
    }
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return _transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const transporter = getTransporter();
  const from = `"Pulse" <${process.env.GMAIL_USER}>`;
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
  });
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Verify your Pulse account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0d9488;margin-bottom:8px">Verify your email</h2>
        <p style="color:#374151;margin-bottom:24px">
          Enter the code below in the Pulse app to verify your account.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111827">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:14px">
          If you didn't create a Pulse account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, appUrl: string): Promise<void> {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your Pulse password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0d9488;margin-bottom:8px">Reset your password</h2>
        <p style="color:#374151;margin-bottom:24px">
          Click the button below to reset your Pulse password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;
                  padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;margin-bottom:24px">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:14px">
          Or copy this link: <a href="${resetUrl}" style="color:#0d9488">${resetUrl}</a>
        </p>
        <p style="color:#6b7280;font-size:14px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
