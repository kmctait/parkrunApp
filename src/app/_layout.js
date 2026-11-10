import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F3D2E',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F4F6F4' },
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
