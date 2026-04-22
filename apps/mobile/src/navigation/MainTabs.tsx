import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CaseIntakeScreen } from '../screens/CaseIntakeScreen';
import { SyncScreen } from '../screens/SyncScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  CaseIntake: undefined;
  Sync: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#7b2d8b',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: true,
        tabBarStyle: { height: 60, paddingBottom: 8 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="CaseIntake" component={CaseIntakeScreen} options={{ title: 'New Case' }} />
      <Tab.Screen name="Sync" component={SyncScreen} options={{ title: 'Sync' }} />
    </Tab.Navigator>
  );
}
