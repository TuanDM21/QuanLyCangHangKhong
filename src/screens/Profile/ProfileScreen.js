import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "../Common/Layout";

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
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
          <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Ionicons name="person-circle" size={28} color="#1565C0" />
          <Text style={styles.headerTitle}>Thông Tin Cá Nhân</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color="#1565C0" />
            </View>
          </View>
          
          <Text style={styles.name}>{user.name}</Text>
          
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color="#1565C0" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#1565C0" />
              <Text style={styles.infoLabel}>Vai trò:</Text>
              <Text style={styles.infoValue}>{user.roleName}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color="#1565C0" />
              <Text style={styles.infoLabel}>Đội:</Text>
              <Text style={styles.infoValue}>{user.teamName}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={20} color="#1565C0" />
              <Text style={styles.infoLabel}>Tổ:</Text>
              <Text style={styles.infoValue}>{user.unitName}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1565C0",
    marginLeft: 12,
  },
  profileCard: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1565C0",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1565C0",
    textAlign: "center",
    marginBottom: 24,
  },
  infoSection: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginLeft: 12,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 16,
    color: "#212529",
    flex: 1,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    marginTop: 16,
    textAlign: "center",
  },
});

export default ProfileScreen;
