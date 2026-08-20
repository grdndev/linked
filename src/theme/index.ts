/**
 * Identité de marque Liked — cahier des charges §3.
 * Le corail est la couleur d'action UNIQUE : boutons d'achat, coeur favori,
 * liens actifs. Il ne sert jamais de fond de page entier.
 */
export const colors = {
  encre: '#0B3B3C',
  encre80: '#3D6465',
  encre60: '#6E8D8D',
  encre40: '#9EB5B6',
  encre15: '#DCE5E5',
  corail: '#FF5E5B',
  corailPresse: '#E54F4C',
  corailDoux: '#FFE9E8',
  sable: '#F6F2EC',
  sableFonce: '#EAE3D9',
  blanc: '#FFFFFF',
  succes: '#1F8A5B',
  succesDoux: '#E4F3EC',
  alerte: '#B4761A',
  alerteDoux: '#FBF0DE',
  danger: '#C0392B',
  dangerDoux: '#FBE9E7',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const shadow = {
  carte: {
    shadowColor: '#0B3B3C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flottant: {
    shadowColor: '#0B3B3C',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/** Outfit 300 → 600, cf. §3.3 */
export const font = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
} as const;

export const type = {
  titre: { fontFamily: font.semibold, fontSize: 26, lineHeight: 32, color: colors.encre },
  soustitre: { fontFamily: font.semibold, fontSize: 19, lineHeight: 25, color: colors.encre },
  section: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.encre },
  corps: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.encre },
  corpsDoux: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.encre80 },
  petit: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.encre80 },
  micro: { fontFamily: font.medium, fontSize: 11, lineHeight: 15, color: colors.encre60 },
  prix: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: colors.encre },
} as const;
