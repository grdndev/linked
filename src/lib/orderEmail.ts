import type { Commande } from '../types';
export type OrderEmail = 'achat' | 'expedition' | 'livraison' | 'remboursement' | 'versement';
const titles: Record<OrderEmail,string> = { achat: 'Paiement confirmé', expedition: 'Ton colis est en route', livraison: 'Livraison confirmée', remboursement: 'Remboursement confirmé', versement: 'Transaction terminée' };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function orderEmail(c: Commande, title: string, event: OrderEmail, seller: boolean, live=false) {
  const amount = ((event === 'versement' && seller ? c.prixArticleCents : c.totalCents)/100).toFixed(2).replace('.',',')+' €';
  let details = { achat: `Le paiement de test de ${amount} a été confirmé. ${c.mode === 'main_propre' ? 'Organisez la remise dans la messagerie Liked.' : 'Le vendeur peut préparer l’expédition simulée.'}`, expedition: `Expédition simulée. Suivi : ${c.numeroSuivi}. Aucun colis réel n’est transporté.`, livraison: 'La livraison de test est confirmée. L’acheteur dispose de 48 h pour ouvrir un litige avant le versement automatique.', remboursement: `Le remboursement de test de ${amount} a été confirmé par Stripe.`, versement: seller ? `Le transfert de test de ${amount} vers ton compte Stripe est confirmé.` : 'Merci ! La transaction de test est terminée.' }[event];
  if(live)details=details.replaceAll(' de test','');
  const subject = `${live?'':'[TEST] '}${titles[event]} · ${c.reference}`;
  const textContent = `${titles[event]}\n${title}\nCommande ${c.reference}\n${details}\nOuvre Liked pour consulter la commande.\n${live?'':'Environnement de test : aucun mouvement d’argent réel.'}`;
  const htmlContent = `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F3ED;font-family:Arial,sans-serif;color:#0B3B3C"><div style="max-width:560px;margin:32px auto;background:white;border-radius:24px;padding:36px"><div style="font-size:30px;font-weight:bold">liked<span style="color:#F27961">.</span></div><p style="font-size:11px;letter-spacing:2px;color:#777">${live?'LIKED':'ENVIRONNEMENT DE TEST'}</p><h1 style="font-size:26px">${titles[event]}</h1><p>${escapeHtml(title)}</p><p style="font-weight:bold">${escapeHtml(c.reference)}</p><p style="line-height:1.7">${escapeHtml(details)}</p><hr style="border:0;border-top:1px solid #eee"><p style="font-size:13px;line-height:1.6">Ouvre Liked pour consulter la commande.${live?'':'<br>Aucun mouvement d’argent réel.'}</p></div></body></html>`;
  return { subject,textContent,htmlContent };
}
