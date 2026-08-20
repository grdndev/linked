/** Les 24 communes de La Réunion (974) — le service est exclusivement local (§2.1). */
export const COMMUNES = [
  'Les Avirons',
  'Bras-Panon',
  'Cilaos',
  'Entre-Deux',
  "L'Étang-Salé",
  'Petite-Île',
  'La Plaine-des-Palmistes',
  'Le Port',
  'La Possession',
  'Saint-André',
  'Saint-Benoît',
  'Saint-Denis',
  'Saint-Joseph',
  'Saint-Leu',
  'Saint-Louis',
  'Saint-Paul',
  'Saint-Philippe',
  'Saint-Pierre',
  'Sainte-Marie',
  'Sainte-Rose',
  'Sainte-Suzanne',
  'Salazie',
  'Le Tampon',
  'Trois-Bassins',
] as const;

/** Micro-régions, utilisées pour le tri « par communes » (§4.3). */
export const MICRO_REGIONS: Record<string, string[]> = {
  Nord: ['Saint-Denis', 'Sainte-Marie', 'Sainte-Suzanne'],
  Est: ['Saint-André', 'Bras-Panon', 'Saint-Benoît', 'Sainte-Rose', 'La Plaine-des-Palmistes', 'Salazie'],
  Sud: [
    'Saint-Pierre',
    'Le Tampon',
    'Saint-Joseph',
    'Petite-Île',
    'Saint-Philippe',
    'Saint-Louis',
    "L'Étang-Salé",
    'Les Avirons',
    'Entre-Deux',
    'Cilaos',
  ],
  Ouest: ['Saint-Paul', 'Le Port', 'La Possession', 'Saint-Leu', 'Trois-Bassins'],
};

export function microRegion(commune: string): string {
  for (const [region, liste] of Object.entries(MICRO_REGIONS)) {
    if (liste.includes(commune)) return region;
  }
  return 'Réunion';
}
