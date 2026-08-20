/**
 * Vérification e-mail / téléphone à l'inscription (§4.1, §7).
 * Cibles : Brevo ou Postmark pour l'e-mail, Twilio ou Vonage pour le SMS.
 */
export interface ServiceVerification {
  envoyerCode(destination: string, canal: 'email' | 'sms'): Promise<{ envoye: boolean }>;
  verifierCode(destination: string, code: string): Promise<boolean>;
}

const codes = new Map<string, string>();

export const verification: ServiceVerification = {
  async envoyerCode(destination) {
    // Driver local : code fixe pour la recette. En production, code aléatoire
    // à 6 chiffres envoyé par le prestataire, jamais renvoyé au client.
    codes.set(destination, '123456');
    await new Promise((r) => setTimeout(r, 600));
    return { envoye: true };
  },
  async verifierCode(destination, code) {
    await new Promise((r) => setTimeout(r, 400));
    return codes.get(destination) === code;
  },
};

export const CODE_DEMO = '123456';
