import React, { useState } from "react";
import { View, Text, TextInput, Alert, Image, StyleSheet, TouchableOpacity } from "react-native";
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

  const handleGuestLogin = () => {
    // TODO: Xử lý đăng nhập với tư cách khách (guest)
    setIsLoggedIn(true); // Hoặc chuyển hướng tới màn hình guest
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Text style={styles.systemTitle}>Hệ thống quản lý</Text>
        <Text style={styles.systemSubtitle}>Cảng Hàng Không Đồng Hới</Text>
        <View style={styles.logoWrapper}>
          <Image source={require("../../assets/LogoACV.png")} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.formBlock}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
            <Text style={styles.guestButtonText}>Đăng nhập với tư cách khách</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f8fb",
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  systemTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1976D2",
    marginTop: 60,
    marginBottom: 0,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  systemSubtitle: {
    fontSize: 16,
    color: "#1565c0",
    marginBottom: 24,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  logoWrapper: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 90,
    borderRadius: 16,
  },
  formBlock: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 8,
    width: 260,
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  loginButton: {
    width: 260,
    backgroundColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  guestButton: {
    width: 260,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  guestButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default LoginScreen;