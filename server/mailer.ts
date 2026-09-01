import { Resend } from "resend";
import { ENV } from "./_core/env";

export async function sendPasswordResetEmail(recipient: string, token: string) {
  if (!ENV.resendApiKey || !ENV.resendFrom) {
    console.warn("[Auth] Password reset requested but Resend is not configured.");
    return false;
  }

  const resend = new Resend(ENV.resendApiKey);
  const resetUrl = `${ENV.appBaseUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const { error } = await resend.emails.send({
    from: ENV.resendFrom,
    to: [recipient],
    subject: "Redefinição de senha - Juventude Connect",
    text: `Use este link para redefinir sua senha: ${resetUrl}\n\nO link expira em 30 minutos.`,
  });
  if (error) throw error;

  return true;
}
