import nodemailer from "nodemailer";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load env
const dotenv = require("dotenv");
dotenv.config({ path: join(__dirname, "../.env") });

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
const appUrl = process.env.APP_URL;

console.log("GMAIL_USER:", user);
console.log("APP_URL:", appUrl);
console.log("GMAIL_APP_PASSWORD set:", !!pass, "(last 4:", pass?.slice(-4) + ")");

if (!user || !pass) {
  console.error("ERROR: Gmail credentials not set in .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

// Verify connection first
try {
  await transporter.verify();
  console.log("SMTP connection: OK");
} catch (err) {
  console.error("SMTP verify error:", err.message);
  process.exit(1);
}

// Send test email
try {
  const info = await transporter.sendMail({
    from: `"Pulse" <${user}>`,
    to: user,
    subject: `Password Reset Test - ${new Date().toISOString()}`,
    html: `<p>Reset link: <a href="${appUrl}/reset-password?token=TEST123">Click here to reset</a></p>
           <p>URL: ${appUrl}/reset-password?token=TEST123</p>`,
    text: `Reset link: ${appUrl}/reset-password?token=TEST123`,
  });
  console.log("Email SENT OK!");
  console.log("MessageId:", info.messageId);
  console.log("Response:", info.response);
} catch (err) {
  console.error("Send error:", err.message);
  console.error("Code:", err.code);
  console.error("Full error:", err);
}
