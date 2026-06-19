import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { getUnreadUpdatesCount } from '../../services/database/Database';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string | any;
}) {
  return <Feather size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = () => setUnreadCount(getUnreadUpdatesCount());
    updateCount();
    
    const subscription = DeviceEventEmitter.addListener('updatesChanged', updateCount);
    return () => subscription.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarButton: (props: any) => <TouchableOpacity {...props} activeOpacity={0.6} />,
        tabBarHideOnKeyboard: true, // User friendly: hides the huge bar when typing
        tabBarStyle: {
          height: 120,
          paddingBottom: 10,
          paddingTop: 5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name="clock" color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="more-horizontal" color={color} />,
        }}
      />
    </Tabs>
  );
}
