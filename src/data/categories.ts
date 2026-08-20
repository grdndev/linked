import type { EtatArticle } from '@/types';

export interface Categorie {
  slug: string;
  nom: string;
  tailles: string[];
}

export interface Univers {
  cle: 'femme' | 'homme' | 'enfant';
  nom: string;
  emoji: string;
  categories: Categorie[];
}

const TAILLES_HAUT = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TAILLES_BAS = ['32', '34', '36', '38', '40', '42', '44', '46', '48'];
const TAILLES_CHAUSSURES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const TAILLES_ENFANT = ['0-3 m', '3-6 m', '6-12 m', '1 an', '2 ans', '3 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans'];
const UNIQUE = ['Taille unique'];

export const UNIVERS: Univers[] = [
  {
    cle: 'femme',
    nom: 'Femme',
    emoji: '👗',
    categories: [
      { slug: 'femme-hauts', nom: 'Hauts & t-shirts', tailles: TAILLES_HAUT },
      { slug: 'femme-robes', nom: 'Robes', tailles: TAILLES_BAS },
      { slug: 'femme-jupes', nom: 'Jupes', tailles: TAILLES_BAS },
      { slug: 'femme-pantalons', nom: 'Pantalons & jeans', tailles: TAILLES_BAS },
      { slug: 'femme-vestes', nom: 'Vestes & manteaux', tailles: TAILLES_HAUT },
      { slug: 'femme-maillots', nom: 'Maillots de bain', tailles: TAILLES_HAUT },
      { slug: 'femme-chaussures', nom: 'Chaussures', tailles: TAILLES_CHAUSSURES },
      { slug: 'femme-sacs', nom: 'Sacs & accessoires', tailles: UNIQUE },
    ],
  },
  {
    cle: 'homme',
    nom: 'Homme',
    emoji: '👕',
    categories: [
      { slug: 'homme-tshirts', nom: 'T-shirts & polos', tailles: TAILLES_HAUT },
      { slug: 'homme-chemises', nom: 'Chemises', tailles: TAILLES_HAUT },
      { slug: 'homme-pantalons', nom: 'Pantalons & jeans', tailles: TAILLES_BAS },
      { slug: 'homme-shorts', nom: 'Shorts & bermudas', tailles: TAILLES_HAUT },
      { slug: 'homme-vestes', nom: 'Vestes & manteaux', tailles: TAILLES_HAUT },
      { slug: 'homme-chaussures', nom: 'Chaussures', tailles: TAILLES_CHAUSSURES },
      { slug: 'homme-accessoires', nom: 'Accessoires', tailles: UNIQUE },
    ],
  },
  {
    cle: 'enfant',
    nom: 'Enfant',
    emoji: '🧸',
    categories: [
      { slug: 'enfant-bebe', nom: 'Bébé (0-24 mois)', tailles: TAILLES_ENFANT },
      { slug: 'enfant-fille', nom: 'Fille', tailles: TAILLES_ENFANT },
      { slug: 'enfant-garcon', nom: 'Garçon', tailles: TAILLES_ENFANT },
      { slug: 'enfant-chaussures', nom: 'Chaussures', tailles: ['18', '20', '22', '24', '26', '28', '30', '32', '34'] },
      { slug: 'enfant-accessoires', nom: 'Accessoires', tailles: UNIQUE },
    ],
  },
];

export function categorieParSlug(slug: string): { univers: Univers; categorie: Categorie } | null {
  for (const univers of UNIVERS) {
    const categorie = univers.categories.find((c) => c.slug === slug);
    if (categorie) return { univers, categorie };
  }
  return null;
}

export const LIBELLES_ETAT: Record<EtatArticle, { nom: string; aide: string }> = {
  neuf_avec_etiquette: { nom: 'Neuf avec étiquette', aide: "Jamais porté, étiquette d'origine" },
  neuf_sans_etiquette: { nom: 'Neuf sans étiquette', aide: 'Jamais porté, sans étiquette' },
  tres_bon: { nom: 'Très bon état', aide: 'Porté quelques fois, aucun défaut' },
  bon: { nom: 'Bon état', aide: 'Porté régulièrement, défauts légers' },
  satisfaisant: { nom: 'Satisfaisant', aide: 'Usé mais fonctionnel, défauts visibles' },
};

export const COULEURS: { nom: string; hex: string }[] = [
  { nom: 'Noir', hex: '#111111' },
  { nom: 'Blanc', hex: '#FFFFFF' },
  { nom: 'Gris', hex: '#9AA0A6' },
  { nom: 'Beige', hex: '#E4D5BF' },
  { nom: 'Marron', hex: '#7A4E2D' },
  { nom: 'Rouge', hex: '#D63A34' },
  { nom: 'Rose', hex: '#F2A2C0' },
  { nom: 'Orange', hex: '#EE7B34' },
  { nom: 'Jaune', hex: '#F2CE49' },
  { nom: 'Vert', hex: '#3E9160' },
  { nom: 'Bleu', hex: '#2F6FB5' },
  { nom: 'Violet', hex: '#7C5CBF' },
  { nom: 'Multicolore', hex: 'multi' },
];
