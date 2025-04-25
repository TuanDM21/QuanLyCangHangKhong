import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import httpApiClient from "../services";
import * as Notifications from "expo-notifications";
import { useAuth } from "../context/AuthContext";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setIsLoggedIn } = useAuth();

  // Hàm gửi expoPushToken lên backend
  const saveExpoPushTokenToBackend = async (expoPushToken, userToken) => {
    try {
      await httpApiClient.post("users/expo-push-token", {
        headers: { Authorization: `Bearer ${userToken}` },
        json: expoPushToken,
      });
    } catch (e) {
      console.log("Lưu expoPushToken thất bại:", e);
    }
  };

  const handleLogin = async () => {
    const loginResponse = await httpApiClient.post("auth/login", {
      json: { email, password },
    });

    const loginJson = await loginResponse.json();

    if (loginJson.success) {
      const { accessToken } = loginJson.data;
      await AsyncStorage.setItem("userToken", accessToken);

      // Lấy expoPushToken và gửi lên backend
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          const expoPushToken = tokenData.data;
          await saveExpoPushTokenToBackend(expoPushToken, accessToken);
        }
      } catch (e) {
        console.log("Không lấy được expoPushToken:", e);
      }

      const profileResponse = await httpApiClient.get("users/me");
      const profileJson = await profileResponse.json();
      if (!profileJson.success) {
        Alert.alert("Lỗi", "Không thể lấy thông tin người dùng");
        return;
      }
      await AsyncStorage.setItem("user", JSON.stringify(profileJson.data));

      setIsLoggedIn(true); // Dùng context, không dùng prop
    } else {
      Alert.alert("Đăng nhập thất bại", loginJson.message || "Có lỗi xảy ra");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Đăng nhập</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, width: 200, marginBottom: 10, padding: 5 }}
      />
      <TextInput
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, width: 200, marginBottom: 10, padding: 5 }}
      />
      <Button title="Đăng nhập" onPress={handleLogin} />
    </View>
  );
};

export default LoginScreen;