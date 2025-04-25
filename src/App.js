import React, { useEffect, useRef } from "react";
import AppNavigator from "./navigation/AppNavigator";
import { AuthProvider } from "./context/AuthContext";
import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";
import { saveNotification } from "./ultis/notificationStorage";

// Cấu hình để notification luôn hiển thị alert khi foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // BẮT BUỘC để foreground hiện alert
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log("=== [Notification Received] ===");
        console.log(JSON.stringify(notification, null, 2));
        if (notification && notification.request && notification.request.content) {
          const { title, body, data } = notification.request.content;
          console.log("=== [Notification Content] ===");
          console.log("title:", title);
          console.log("body:", body);
          console.log("data:", data);
          if (title || body) {
            Alert.alert(title || "Thông báo", body || "");
          }
        }
        await saveNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log("=== [Notification Response] ===");
        console.log(JSON.stringify(response, null, 2));
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}