import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import CreateScheduleScreen from "../screens/CreateScheduleScreen";
import UpdateScheduleScreen from "../screens/UpdateScheduleScreen";
import ScheduleListScreen from "../screens/ScheduleListScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScheduleScreen from "../screens/SearchScheduleScreen";
import ApplyShiftScreen from "../screens/ApplyShiftScreen";
import UpdateUserShiftScreen from "../screens/UpdateUserShiftScreen";
import FlightScreen from "../screens/FlightScreen";
import CreateFlightScreen from "../screens/CreateFlightScreen";
import FlightListScreen from "../screens/FlightListScreen";
import SearchFlightScreen from "../screens/SearchFlightScreen";
import UpdateFlightScreen from "../screens/UpdateFlightScreen";
import LiveTrackingScreen from "../screens/LiveTrackingScreen";
import ApplyFlightShiftScreen from "../screens/ApplyFlightShiftScreen";
import CreateActivityScreen from "../screens/Activity/CreateActivityScreen";
import ActivityScreen from "../screens/Activity/ActivityScreen";
import SearchActivityScreen from "../screens/Activity/SearchActivityScreen";
import EditActivityScreen from "../screens/Activity/EditActivityScreen";
import MyActivitiesScreen from "../screens/Activity/MyActivitiesScreen";
import NotificationScreen from "../screens/NotificationScreen";
import UpdateUserFlightShiftScreen from "../screens/UpdateUserFlightShiftScreen";
import LiveTrackingMapScreen from "../screens/LiveTrackingMapScreen";
import MyShiftScreen from "../screens/MyShiftScreen";
import NotificationCenterScreen from "../screens/NotificationCenterScreen";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn === null) return null; 

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="CreateSchedule" component={CreateScheduleScreen} />
            <Stack.Screen name="UpdateSchedule" component={UpdateScheduleScreen} />
            <Stack.Screen name="ScheduleListScreen" component={ScheduleListScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="SearchScheduleScreen" component={SearchScheduleScreen} />
            <Stack.Screen name="ApplyShiftScreen" component={ApplyShiftScreen} />
            <Stack.Screen name="UpdateUserShiftScreen" component={UpdateUserShiftScreen} />
            <Stack.Screen name="FlightScreen" component={FlightScreen} />
            <Stack.Screen name="CreateFlightScreen" component={CreateFlightScreen} />
            <Stack.Screen name="FlightListScreen" component={FlightListScreen} />
            <Stack.Screen name="SearchFlightScreen" component={SearchFlightScreen} />
            <Stack.Screen name="UpdateFlightScreen" component={UpdateFlightScreen} />
            <Stack.Screen name="LiveTrackingScreen" component={LiveTrackingScreen} />
            <Stack.Screen name="ApplyFlightShiftScreen" component={ApplyFlightShiftScreen} />
            <Stack.Screen name="CreateActivityScreen" component={CreateActivityScreen} />
            <Stack.Screen name="ActivityScreen" component={ActivityScreen} />
            <Stack.Screen name="SearchActivityScreen" component={SearchActivityScreen} />
            <Stack.Screen name="EditActivityScreen" component={EditActivityScreen} />
            <Stack.Screen name="MyActivitiesScreen" component={MyActivitiesScreen} />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
            <Stack.Screen name="UpdateUserFlightShiftScreen" component={UpdateUserFlightShiftScreen} />
            <Stack.Screen name="LiveTrackingMapScreen" component={LiveTrackingMapScreen} />
            <Stack.Screen name="MyShiftScreen" component={MyShiftScreen} />
            <Stack.Screen name="NotificationCenterScreen" component={NotificationCenterScreen} />

            
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;