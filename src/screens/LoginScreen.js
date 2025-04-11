import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginScreen = ({ navigation, setIsLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch("http://10.0.2.2:8080/api/users/login", {
        // const response = await fetch("http://192.168.1.2:8080/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const textData = await response.text(); // Lấy dữ liệu thô trước khi parse JSON
      console.log("Raw Response:", textData); // In ra console để kiểm tra
  
      const data = JSON.parse(textData); // Parse JSON sau khi kiểm tra
  
      if (response.status === 200) {
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        setIsLoggedIn(true);
      } else {
        Alert.alert("Đăng nhập thất bại", data.message);
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
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
