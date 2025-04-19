import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
// import FlightMapScreen from "../screens/FlightMapScreen";
import FlightScreen from "../screens/FlightScreen";
import CreateFlightScreen from "../screens/CreateFlightScreen";
import FlightListScreen from "../screens/FlightListScreen";
import SearchFlightScreen from "../screens/SearchFlightScreen";
import UpdateFlightScreen from "../screens/UpdateFlightScreen";
import LiveTrackingScreen from "../screens/LiveTrackingScreen";
import ApplyFlightShiftScreen from "../screens/ApplyFlightShiftScreen";
import CreateActivityScreen from "../screens/Activity/CreateActivityScreen"
import ActivityScreen from "../screens/Activity/ActivityScreen"
import SearchActivityScreen from "../screens/Activity/SearchActivityScreen"
import EditActivityScreen from "../screens/Activity/EditActivityScreen"
import MyActivitiesScreen from "../screens/Activity/MyActivitiesScreen"
const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null); 

  useEffect(() => {
    const checkLoginStatus = async () => {
      const userToken = await AsyncStorage.getItem("userToken");
      setIsLoggedIn(userToken ? true : false);
    };
    checkLoginStatus();
  }, []);

  if (isLoggedIn === null) return null; 

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn}  />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ headerShown: false }}>
              {(props) => <HomeScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
            <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="CreateSchedule" component={CreateScheduleScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="UpdateSchedule" component={UpdateScheduleScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ScheduleListScreen" component={ScheduleListScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{headerShown: false}}/>
            <Stack.Screen name="SearchScheduleScreen" component={SearchScheduleScreen} options={{headerShown: false}}/>
            <Stack.Screen name="ApplyShiftScreen" component={ApplyShiftScreen} options={{headerShown: false}}/>
            <Stack.Screen name="UpdateUserShiftScreen" component={UpdateUserShiftScreen} options={{headerShown: false}}/>
            {/* <Stack.Screen name="FlightMapScreen" component={FlightMapScreen} /> */}
            <Stack.Screen name="FlightScreen" component={FlightScreen} options={{headerShown: false}}/>
            <Stack.Screen name="CreateFlightScreen" component={CreateFlightScreen} options={{headerShown: false}}/>
            <Stack.Screen name="FlightListScreen" component={FlightListScreen} options={{headerShown: false}}/>
            <Stack.Screen name="SearchFlightScreen" component={SearchFlightScreen} options={{headerShown: false}}/>
            <Stack.Screen name="UpdateFlightScreen" component={UpdateFlightScreen} options={{headerShown: false}}/>
            <Stack.Screen name="LiveTrackingScreen" component={LiveTrackingScreen} options={{headerShown: false}}/>
            <Stack.Screen name="ApplyFlightShiftScreen" component={ApplyFlightShiftScreen} options={{headerShown: false}}/>
            <Stack.Screen name="CreateActivityScreen" component={CreateActivityScreen} options={{headerShown: false}}/>
            <Stack.Screen name="ActivityScreen" component={ActivityScreen} options={{headerShown: false}}/>
            <Stack.Screen name="SearchActivityScreen" component={SearchActivityScreen} options={{headerShown: false}}/>
            <Stack.Screen name="EditActivityScreen" component={EditActivityScreen} options={{headerShown: false}}/>
            <Stack.Screen name="MyActivitiesScreen" component={MyActivitiesScreen} options={{headerShown: false}}/>

            </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
