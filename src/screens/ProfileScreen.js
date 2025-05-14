import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "./Layout";

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu người dùng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
      </View>
    );
  }

  return (
    <Layout>
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.info}>📧 {user.email}</Text>
        <Text style={styles.info}>🎭 Vai trò: {user.roleName}</Text>
        <Text style={ styles.info}>🛡️ Đội: {user.teamName}</Text>
        <Text style={styles.info}>🏢 Tổ: {user.unitName}</Text>
      </View>
    </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f7",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    width: "90%",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#3498db",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  info: {
    fontSize: 16,
    color: "#555",
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#3498db",
  },
  errorText: {
    fontSize: 16,
    color: "red",
  },
});

export default ProfileScreen;
