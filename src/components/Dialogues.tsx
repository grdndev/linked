import { Modal, Pressable, View } from 'react-native';
import { useDialogues } from '@/lib/dialogues';
import { colors, radius } from '@/theme';
import { Texte } from './Texte';
export function Dialogues() {
  const dialogue=useDialogues(s=>s.queue[0]); const fermer=useDialogues(s=>s.fermer);
  if(!dialogue) return null;
  return <Modal transparent visible animationType="fade" onRequestClose={()=>fermer(false)}><View style={{flex:1,backgroundColor:'rgba(11,59,60,0.52)',alignItems:'center',justifyContent:'center',padding:24}}><View accessibilityRole="alert" style={{backgroundColor:colors.blanc,borderRadius:radius.lg,padding:24,gap:18,width:'100%',maxWidth:380}}><Texte variante="soustitre">{dialogue.titre}</Texte><Texte variante="corpsDoux">{dialogue.message}</Texte><Pressable accessibilityRole="button" onPress={()=>fermer(true)} style={{padding:16,borderRadius:24,backgroundColor:dialogue.destructif?colors.danger:colors.encre}}><Texte centre couleur={colors.blanc}>{dialogue.confirmation || 'Compris'}</Texte></Pressable>{dialogue.confirmation && <Pressable accessibilityRole="button" onPress={()=>fermer(false)} style={{padding:12}}><Texte centre>Revenir</Texte></Pressable>}</View></View></Modal>;
}
