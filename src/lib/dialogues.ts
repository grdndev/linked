import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

type Dialogue = { titre:string; message?:string; confirmation?:string; destructif?:boolean; resoudre?:(value:boolean)=>void };
export const useDialogues = create<{queue:Dialogue[];fermer:(value:boolean)=>void}>((set,get)=>({
  queue:[], fermer(value) { const current=get().queue[0]; set({queue:get().queue.slice(1)}); current?.resoudre?.(value); },
}));
function ajouter(dialogue:Dialogue) { useDialogues.setState(s=>({queue:[...s.queue,dialogue]})); }
export function alerter(titre:string,message?:string) {
  if(Platform.OS==='web') ajouter({titre,message});
  else Alert.alert(titre,message);
}
export async function confirmer(titre:string,message:string,confirmation='Confirmer',destructif=false):Promise<boolean> {
  if(Platform.OS==='web') return new Promise(resoudre=>ajouter({titre,message,confirmation,destructif,resoudre}));
  return new Promise(resoudre=>Alert.alert(titre,message,[{text:'Annuler',style:'cancel',onPress:()=>resoudre(false)},{text:confirmation,style:destructif?'destructive':'default',onPress:()=>resoudre(true)}],{cancelable:true,onDismiss:()=>resoudre(false)}));
}
