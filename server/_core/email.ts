// Resend API for sending emails (works on all cloud platforms)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Pulse <onboarding@resend.dev>";

export function validateEmailConfig(): { valid: boolean; error?: string } {
  if (!RESEND_API_KEY) {
    return { valid: false, error: "RESEND_API_KEY not set" };
  }
  console.log("[Email] Configuration valid. Using Resend API");
  return { valid: true };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log("[Email] DEV MODE - No API key, simulating send:");
    console.log("[Email] To:", opts.to);
    console.log("[Email] Subject:", opts.subject);
    return;
  }

  console.log("[Email] Sending via Resend to:", opts.to);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Email] Resend API error:", error);
    throw new Error(`Failed to send email: ${error}`);
  }
  
  const result = await response.json();
  console.log("[Email] Sent successfully, ID:", result.id);
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
  const webResetUrl = `${appUrl}/reset-password?token=${token}`;
  
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
        
        <a href="${webResetUrl}"
           style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">
          Reset Password
        </a>
        
        <p style="color:#6b7280;font-size:14px;margin-top:24px">
          Or copy this link: <a href="${webResetUrl}" style="color:#0d9488;word-break:break-all">${webResetUrl}</a>
        </p>
        
        <p style="color:#6b7280;font-size:14px;margin-top:24px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
