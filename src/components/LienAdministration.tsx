import { Linking, Platform, View } from 'react-native';
import { Ecran, EnTete, Texte, Bouton } from '@/components';
const url='https://liked-beta-reunion.jayan-codialis.chatgpt.site/dashboard/';
export default function LienAdministration(){return <Ecran><EnTete titre="Administration sur le web"/><View style={{padding:24,gap:20}}><Texte variante="titre">Ton espace de gestion est séparé.</Texte><Texte>Le dashboard s’ouvre dans ton navigateur. Connecte-toi avec ton adresse administrateur et ton code e-mail.</Texte><Bouton titre="Ouvrir le dashboard web ↗" onPress={()=>{if(Platform.OS==='web')window.open(url,'_blank','noopener,noreferrer');else return Linking.openURL(url);}}/></View></Ecran>;}
