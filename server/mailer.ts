import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

export async function sendPasswordResetEmail(recipient: string, token: string) {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPassword || !ENV.smtpFrom) {
    console.warn("[Auth] Password reset requested but SMTP is not configured.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPassword },
  });
  const resetUrl = `${ENV.appBaseUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: ENV.smtpFrom,
    to: recipient,
    subject: "Redefinição de senha - Juventude Connect",
    text: `Use este link para redefinir sua senha: ${resetUrl}\n\nO link expira em 30 minutos.`,
  });
  return true;
}
