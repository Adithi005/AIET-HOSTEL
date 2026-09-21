import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, Alert } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Home as HomeIcon,
  Utensils as MessIcon,
  Wrench as CareIcon,
  History as HistoryIcon,
} from 'lucide-react-native';

import { colors } from './src/theme/colors';
import { HomeScreen } from './src/screens/HomeScreen';
import { MessScreen } from './src/screens/MessScreen';
import { GrievanceScreen } from './src/screens/GrievanceScreen';
import { LeaveScreen } from './src/screens/LeaveScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AdminPortalScreen } from './src/screens/AdminPortalScreen';
import { DocumentScreen } from './src/screens/DocumentScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="MessTab"
        component={MessScreen}
        options={{
          tabBarLabel: 'Mess',
          tabBarIcon: ({ color }) => <MessIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="GrievanceTab"
        component={GrievanceScreen}
        options={{
          tabBarLabel: 'Hostel Care',
          tabBarIcon: ({ color }) => <CareIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="LeaveTab"
        component={LeaveScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <HistoryIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // Enforce app-wide screenshot protection under hostel digital pass policy
  usePreventScreenCapture();

  useEffect(() => {
    let subscription: ScreenCapture.Subscription | null = null;
    try {
      ScreenCapture.preventScreenCaptureAsync();
      subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert(
          'Security Policy Notice',
          'Screenshots and screen recordings are strictly prohibited on AIETIVA for student privacy and gate pass security.'
        );
      });
    } catch (err) {
      console.warn('ScreenCapture init error:', err);
    }

    // Web-level screenshot blocking (PrintScreen key and right-click)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'S'))) {
          e.preventDefault();
          Alert.alert('Screenshot Disabled', 'Screenshots are disabled for AIETIVA security passes.');
        }
      };
      window.addEventListener('keyup', handleKeyDown);
      return () => {
        subscription?.remove();
        window.removeEventListener('keyup', handleKeyDown);
      };
    }

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AdminPortal" component={AdminPortalScreen} />
            <Stack.Screen name="Documents" component={DocumentScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 58,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
});
