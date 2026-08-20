import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Texte } from '@/components';
import { colors, font, shadow } from '@/theme';
import { useNonLus } from '@/store/selecteurs';

export default function DispositionOnglets() {
  const nonLus = useNonLus();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.corail,
        tabBarInactiveTintColor: colors.encre60,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.blanc,
          borderTopColor: colors.encre15,
          height: 82,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vendre"
        options={{
          title: 'Vendre',
          tabBarIcon: () => (
            <View
              style={[
                {
                  width: 52, height: 34, borderRadius: 17, backgroundColor: colors.corail,
                  alignItems: 'center', justifyContent: 'center', marginTop: -2,
                },
                shadow.carte,
              ]}
            >
              <Ionicons name="add" size={24} color={colors.blanc} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discussions"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={23} color={color} />
              {nonLus > 0 ? (
                <View
                  style={{
                    position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16,
                    borderRadius: 8, backgroundColor: colors.corail,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                  }}
                >
                  <Texte style={{ fontFamily: font.semibold, fontSize: 10, color: colors.blanc }}>
                    {nonLus}
                  </Texte>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
