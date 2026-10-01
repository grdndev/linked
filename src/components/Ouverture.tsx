import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CoeurLiked, Logotype } from './Logo';
import { useMouvementReduit } from './Mouvement';
import { colors } from '@/theme';

/** Un seul plan : logo sur vert, zoom dans son cœur, révélation de l'application. */
export function Ouverture({ pret }: { pret: boolean }) {
  const reduit=useMouvementReduit();const {width,height}=useWindowDimensions();
  const [visible,setVisible]=useState(true);
  const entree=useRef(new Animated.Value(0)).current;
  const zoom=useRef(new Animated.Value(0)).current;
  const voile=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    if(reduit===null)return;
    if(reduit){entree.setValue(1);if(pret)setVisible(false);return;}
    const animation=Animated.timing(entree,{toValue:1,duration:350,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'});
    animation.start();return()=>animation.stop();
  },[reduit,pret,entree]);
  useEffect(()=>{
    if(!pret || reduit!==false || !visible)return;
    const animation=Animated.sequence([
      Animated.delay(360),
      Animated.timing(zoom,{toValue:1,duration:850,easing:Easing.inOut(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),
      Animated.timing(voile,{toValue:0,duration:220,useNativeDriver:Platform.OS!=='web'}),
    ]);
    animation.start(({finished})=>{if(finished)setVisible(false);});
    return()=>animation.stop();
  },[pret,reduit,visible,zoom,voile]);
  if(!visible)return null;
  const maxScale=Math.hypot(width,height)/12+5;
  return <Animated.View style={[StyleSheet.absoluteFillObject,styles.fond,{opacity:voile}]} accessibilityViewIsModal>
    <Animated.View style={{opacity:Animated.multiply(entree,zoom.interpolate({inputRange:[0,.22,1],outputRange:[1,0,0]})),transform:[{scale:entree.interpolate({inputRange:[0,1],outputRange:[.94,1]})}]}}><Logotype hauteur={72} sombre sansCoeur/></Animated.View>
    <Animated.View pointerEvents="none" style={{position:'absolute',left:'50%',top:'50%',marginLeft:-71,marginTop:-33,opacity:entree,transform:[{translateX:zoom.interpolate({inputRange:[0,1],outputRange:[0,60]})},{translateY:zoom.interpolate({inputRange:[0,1],outputRange:[0,22]})},{scale:zoom.interpolate({inputRange:[0,1],outputRange:[1,maxScale]})}]}}><CoeurLiked taille={22}/></Animated.View>
    <Animated.View style={{position:'absolute',top:'60%',opacity:zoom.interpolate({inputRange:[0,.2,1],outputRange:[1,0,0]})}}><Text style={styles.signature}>Une seconde vie. Sur ton île.</Text></Animated.View>
    {pret && <Pressable onPress={()=>setVisible(false)} accessibilityRole="button" accessibilityLabel="Passer l’animation d’ouverture" style={styles.passer}><Text style={styles.signature}>Passer</Text></Pressable>}
  </Animated.View>;
}
const styles=StyleSheet.create({fond:{zIndex:1000,backgroundColor:colors.encre,alignItems:'center',justifyContent:'center',overflow:'hidden'},signature:{color:'#D3E0DC',fontSize:14,letterSpacing:.3},passer:{position:'absolute',bottom:32,right:26,padding:16}});
