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

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null để xác định trạng thái loading

  useEffect(() => {
    const checkLoginStatus = async () => {
      const userToken = await AsyncStorage.getItem("userToken");
      setIsLoggedIn(userToken ? true : false); // Đảm bảo state được cập nhật chính xác
    };
    checkLoginStatus();
  }, []);
  
  if (isLoggedIn === null) return null; // Đợi kiểm tra xong rồi render

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="CreateSchedule" component={CreateScheduleScreen} />
            <Stack.Screen name="UpdateSchedule" component={UpdateScheduleScreen} />
            <Stack.Screen name="ScheduleListScreen" component={ScheduleListScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
 