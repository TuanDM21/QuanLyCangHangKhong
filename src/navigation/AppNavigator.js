import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

// Auth screens
import LoginScreen from "../screens/Auth/LoginScreen";

// Common screens
import HomeScreen from "../screens/Common/HomeScreen";

// Schedule screens
import ScheduleScreen from "../screens/Schedule/ScheduleScreen";
import CreateScheduleScreen from "../screens/Schedule/CreateScheduleScreen";
import UpdateScheduleScreen from "../screens/Schedule/UpdateScheduleScreen";
import ScheduleListScreen from "../screens/Schedule/ScheduleListScreen";
import SearchScheduleScreen from "../screens/Schedule/SearchScheduleScreen";
import MyScheduleScreen from "../screens/Schedule/MyScheduleScreen";

// Profile screens
import ProfileScreen from "../screens/Profile/ProfileScreen";

// Shift screens
import ApplyShiftScreen from "../screens/Shift/ApplyShiftScreen";
import UpdateUserShiftScreen from "../screens/Shift/UpdateUserShiftScreen";
import MyShiftScreen from "../screens/Shift/MyShiftScreen";
import UpdateUserFlightShiftScreen from "../screens/Shift/UpdateUserFlightShiftScreen";

// Flight screens
import FlightScreen from "../screens/Flight/FlightScreen";
import CreateFlightScreen from "../screens/Flight/CreateFlightScreen";
import FlightListScreen from "../screens/Flight/FlightListScreen";
import SearchFlightScreen from "../screens/Flight/SearchFlightScreen";
import UpdateFlightScreen from "../screens/Flight/UpdateFlightScreen";
import ApplyFlightShiftScreen from "../screens/Flight/ApplyFlightShiftScreen";

// Tracking screens
import LiveTrackingScreen from "../screens/Tracking/LiveTrackingScreen";
import LiveTrackingMapScreen from "../screens/Tracking/LiveTrackingMapScreen";

// Activity screens
import CreateActivityScreen from "../screens/Activity/CreateActivityScreen";
import ActivityScreen from "../screens/Activity/ActivityScreen";
import SearchActivityScreen from "../screens/Activity/SearchActivityScreen";
import EditActivityScreen from "../screens/Activity/EditActivityScreen";
import MyActivitiesScreen from "../screens/Activity/MyActivitiesScreen";

// Job screens
import JobScreen from "../screens/Job/JobScreen";
import CreateJobScreen from "../screens/Job/CreateJobScreen";
import MyJobsScreen from "../screens/Job/MyJobsScreen";
import SearchJobScreen from "../screens/Job/SearchJobScreen";
import JobReportsScreen from "../screens/Job/JobReportsScreen";

// Notification screens
import NotificationScreen from "../screens/Notification/NotificationScreen";
import NotificationCenterScreen from "../screens/Notification/NotificationCenterScreen";

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
            <Stack.Screen name="JobScreen" component={JobScreen} />
            <Stack.Screen name="CreateJobScreen" component={CreateJobScreen} />
            <Stack.Screen name="MyJobsScreen" component={MyJobsScreen} />
            <Stack.Screen name="SearchJobScreen" component={SearchJobScreen} />
            <Stack.Screen name="JobReportsScreen" component={JobReportsScreen} />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
            <Stack.Screen name="MyScheduleScreen" component={MyScheduleScreen} />
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