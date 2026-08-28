import { Platform } from 'react-native';

/**
 * Écriture puis partage d'un fichier généré (export RGPD, export DAC7).
 * Sur mobile on passe par le système de fichiers puis la feuille de partage ;
 * sur le web, le navigateur télécharge directement le fichier.
 */
export async function partagerFichier(
  nomFichier: string,
  contenu: string,
  typeMime: string,
): Promise<{ ok: boolean; emplacement?: string }> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contenu], { type: typeMime });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const fichier = new File(Paths.cache, nomFichier);
  fichier.create({ overwrite: true });
  fichier.write(contenu);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fichier.uri);
    return { ok: true, emplacement: fichier.uri };
  }
  return { ok: false, emplacement: fichier.uri };
}
