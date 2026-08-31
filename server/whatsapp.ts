export type WhatsAppSendResult = { ok: true; messageId?: string } | { ok: false; error: string };

export async function sendWhatsAppTemplate(input: { token: string; phoneNumberId: string; recipient: string; templateName: string; languageCode: string; parameters: string[] }): Promise<WhatsAppSendResult> {
  if (!input.token || !input.phoneNumberId) return { ok: false, error: "Integração do WhatsApp não configurada." };
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${input.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: input.recipient, type: "template", template: { name: input.templateName, language: { code: input.languageCode }, components: [{ type: "body", parameters: input.parameters.map(text => ({ type: "text", text })) }] } }),
    });
    const payload = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
    if (!response.ok) return { ok: false, error: payload.error?.message ?? "O provedor recusou o envio." };
    return { ok: true, messageId: payload.messages?.[0]?.id };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Falha de rede ao chamar o provedor." }; }
}
