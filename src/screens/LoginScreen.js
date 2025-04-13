import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import httpApiClient from "../services";

const LoginScreen = ({ navigation, setIsLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const loginResponse = await httpApiClient.post("auth/login", {
      json: {
        email,
        password,
      },
    });

    const loginJson = await loginResponse.json();

    if (loginJson.success) {
      const { accessToken } = loginJson.data;
      await AsyncStorage.setItem("userToken", accessToken);

      const profileResponse = await httpApiClient.get("users/me");
      const profileJson = await profileResponse.json();
      if (!profileJson.success) {
        Alert.alert("Lỗi", "Không thể lấy thông tin người dùng");
        return;
      }
      await AsyncStorage.setItem("user", JSON.stringify(profileJson.data));

      setIsLoggedIn(true);
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
