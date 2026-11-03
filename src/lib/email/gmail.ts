import nodemailer from "nodemailer";

export function isEmailConfigured() {
  return Boolean(
    process.env.GMAIL_USER?.trim() &&
      process.env.GMAIL_APP_PASSWORD?.trim() &&
      (process.env.NOTIFY_EMAIL?.trim() || process.env.GMAIL_USER?.trim())
  );
}

export function notifyInbox(): string {
  return (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER || "").trim();
}

function transporter() {
  const user = process.env.GMAIL_USER!.trim();
  const pass = process.env.GMAIL_APP_PASSWORD!.trim().replace(/\s+/g, "");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass },
  });
}

export async function sendMailWithPdf(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  filename: string;
  pdf: Buffer;
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Gmail not configured" };
  }
  try {
    const fromName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "NAVRIT";
    const fromUser = process.env.GMAIL_USER!.trim();
    const info = await transporter().sendMail({
      from: `"${fromName} Portal" <${fromUser}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: [
        {
          filename: opts.filename,
          content: opts.pdf,
          contentType: "application/pdf",
        },
      ],
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}
