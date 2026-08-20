import { Redirect } from 'expo-router';
import { useLiked } from '@/store/liked';

export default function Racine() {
  const connecte = useLiked((e) => Boolean(e.sessionId));
  return <Redirect href={connecte ? '/(tabs)' : '/bienvenue'} />;
}
