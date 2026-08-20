/** Base d'autocomplétion marque (§4.2). En production, servie par l'API. */
export const MARQUES = [
  'Adidas', 'Aigle', 'American Vintage', 'Armani', 'Asics', 'Bershka', 'Bizzbee', 'Bonpoint',
  'Boss', 'Burton', 'C&A', 'Calvin Klein', 'Camaïeu', 'Carhartt', 'Caroll', 'Celio',
  'Champion', 'Chipie', 'Comptoir des Cotonniers', 'Converse', 'Cyrillus', 'Decathlon',
  'Desigual', 'Dickies', 'Diesel', 'Dr. Martens', 'Ellesse', 'Etam', 'Fila', 'Gap',
  'Guess', 'Gémo', 'H&M', 'Hollister', 'Hugo', 'IKKS', 'Jack & Jones', 'Jennyfer',
  'Jott', 'Kaporal', 'Kiabi', 'Lacoste', 'Le Coq Sportif', "Levi's", 'Mango',
  'Massimo Dutti', 'Michael Kors', 'Monoprix', 'Morgan', 'New Balance', 'New Era', 'Nike',
  'Obaïbi', 'Okaïdi', 'Only', 'Oxbow', 'Petit Bateau', 'Pimkie', 'Polo Ralph Lauren',
  'Promod', 'Puma', 'Pull & Bear', 'Quiksilver', 'Reebok', 'Ripcurl', 'Roxy', 'Sandro',
  'Sergent Major', 'Sessùn', 'Sheego', 'Shein', 'Stradivarius', 'Superdry', 'The Kooples',
  'The North Face', 'Timberland', 'Tommy Hilfiger', 'Uniqlo', 'Vans', 'Vero Moda',
  'Volcom', 'Zara', 'Zeeman', 'Sans marque', 'Fait main',
].sort((a, b) => a.localeCompare(b, 'fr'));

export function chercherMarques(saisie: string, limite = 8): string[] {
  const q = saisie.trim().toLowerCase();
  if (!q) return MARQUES.slice(0, limite);
  const commence = MARQUES.filter((m) => m.toLowerCase().startsWith(q));
  const contient = MARQUES.filter((m) => !commence.includes(m) && m.toLowerCase().includes(q));
  return [...commence, ...contient].slice(0, limite);
}
