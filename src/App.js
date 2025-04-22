import React, { useEffect, useRef } from "react";
import AppNavigator from "./navigation/AppNavigator";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Lắng nghe khi nhận notification (foreground) - KHÔNG hiện Alert
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Có thể cập nhật badge, fetch lại notification, hoặc set state ở đây nếu muốn
      // Không gọi Alert.alert ở đây!
      console.log("Notification received:", notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return <AppNavigator />;
}