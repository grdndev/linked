import Stripe from 'stripe';
import { HttpError } from './security';

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, 'Stripe n’est pas encore configuré. Aucun débit effectué.');
  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new HttpError(503, 'Cette bêta accepte uniquement les clés Stripe de test.');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
}
export async function sendEmail(message: { to: string; subject: string; textContent: string; htmlContent?: string }) {
  const key = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;
  if (!key || !sender) throw new HttpError(503, 'L’envoi des e-mails n’est pas encore configuré.');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: sender, name: process.env.BREVO_SENDER_NAME || 'Liked' },
      to: [{ email: message.to }], subject: message.subject,
      textContent: message.textContent, htmlContent: message.htmlContent }),
  });
  if (!response.ok) throw new HttpError(502, 'L’e-mail n’a pas pu être envoyé. Réessaie plus tard.');
}
export async function sendCode(email: string, code: string) {
  await sendEmail({ to: email, subject: '[TEST] Ton code de connexion Liked', textContent: `Ton code Liked : ${code}. Il expire dans 10 minutes. Ne le partage avec personne. Si tu n’as pas demandé ce code, ignore cet e-mail.` });
}
