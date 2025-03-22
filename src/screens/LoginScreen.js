import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginScreen = ({ navigation, setIsLoggedIn }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (employeeId === "admin" && password === "123456") {
      await AsyncStorage.setItem("userToken", "dummy-token");
      setIsLoggedIn(true);
    } else {
      Alert.alert("Đăng nhập thất bại", "Sai Employee ID hoặc mật khẩu!");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Đăng nhập</Text>
      <TextInput
        placeholder="Employee ID"
        value={employeeId}
        onChangeText={setEmployeeId}
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
