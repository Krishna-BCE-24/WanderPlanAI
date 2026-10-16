
import { Resend } from "resend";

const {
  RESEND_API_KEY,
  EMAIL_FROM = "WanderPlan AI <onboarding@resend.dev>",
  CLIENT_URL,
} = process.env;

let resendClient;

function getResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing from environment variables.");
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }

  return resendClient;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function createEmailTemplate({
  title,
  name,
  message,
  buttonText,
  actionUrl,
  expiryText,
}) {
  const safeName = escapeHtml(name || "there");
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeButtonText = escapeHtml(buttonText);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeExpiryText = escapeHtml(expiryText || "");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#102a43;">
        <div style="max-width:600px;margin:32px auto;padding:24px;">
          <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5eaf0;">
            <h1 style="margin:0 0 24px;color:#102a43;font-size:27px;">
              WanderPlan <span style="color:#3988ff;">AI</span>
            </h1>
            <h2 style="font-size:23px;margin-bottom:16px;">${safeTitle}</h2>
            <p style="font-size:16px;line-height:1.7;">Hi ${safeName},</p>
            <p style="font-size:15px;line-height:1.8;color:#486581;">${safeMessage}</p>
            <div style="margin:28px 0;">
              <a href="${safeActionUrl}" style="display:inline-block;background:#3988ff;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:9px;font-weight:bold;">
                ${safeButtonText}
              </a>
            </div>
            ${
              safeExpiryText
                ? `<p style="font-size:13px;color:#627d98;line-height:1.7;">${safeExpiryText}</p>`
                : ""
            }
            <p style="font-size:13px;color:#627d98;line-height:1.7;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size:12px;line-height:1.7;word-break:break-all;">
              <a href="${safeActionUrl}" style="color:#3988ff;">${safeActionUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e5eaf0;margin:28px 0;" />
            <p style="font-size:12px;color:#829ab1;line-height:1.7;">
              If you did not request this email, you can safely ignore it.
              Never share your password or verification codes with anyone.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error("sendEmail requires a recipient, subject and email content.");
  }

  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    });

    if (error) {
      console.error("Resend email delivery failed:", error.message);
      throw new Error("Unable to send email. Please try again later.");
    }

    return {
      messageId: data?.id,
      accepted: [to],
    };
  } catch (error) {
    console.error("Email delivery failed:", error.message);
    throw new Error("Unable to send email. Please try again later.");
  }
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
  expiresIn = "24 hours",
}) {
  if (!verificationUrl) {
    throw new Error("A verification URL is required.");
  }

  const subject = "Verify your WanderPlan AI account";
  const text = [
    `Hi ${name || "there"},`,
    "",
    "Please verify your WanderPlan AI account using the link below:",
    verificationUrl,
    "",
    `This link expires in ${expiresIn}.`,
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = createEmailTemplate({
    title: "Verify your email address",
    name,
    message:
      "Welcome to WanderPlan AI! Confirm your email address to complete your account verification.",
    buttonText: "Verify Email Address",
    actionUrl: verificationUrl,
    expiryText: `This verification link expires in ${expiresIn}.`,
  });

  return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresIn = "15 minutes",
}) {
  if (!resetUrl) {
    throw new Error("A password reset URL is required.");
  }

  const subject = "Reset your WanderPlan AI password";
  const text = [
    `Hi ${name || "there"},`,
    "",
    "We received a request to reset your WanderPlan AI password.",
    "Use the following link to choose a new password:",
    resetUrl,
    "",
    `This link expires in ${expiresIn}.`,
    "If you did not request a password reset, ignore this email.",
  ].join("\n");

  const html = createEmailTemplate({
    title: "Reset your password",
    name,
    message:
      "We received a request to reset your password. Use the button below to choose a new one.",
    buttonText: "Reset Password",
    actionUrl: resetUrl,
    expiryText: `This password reset link expires in ${expiresIn}.`,
  });

  return sendEmail({ to, subject, text, html });
}

export function createFrontendUrl(path) {
  if (!CLIENT_URL) {
    throw new Error("CLIENT_URL is missing from environment variables.");
  }

  const baseUrl = CLIENT_URL.endsWith("/") ? CLIENT_URL : `${CLIENT_URL}/`;

  return new URL(path.replace(/^\/+/, ""), baseUrl).toString();
}

export async function verifyEmailConnection() {
  // Resend is an HTTP API, so no SMTP connection verification is required.
  const resend = getResendClient();

  if (!resend) {
    throw new Error("Email service is unavailable.");
  }

  return true;
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  createFrontendUrl,
  verifyEmailConnection,
};
