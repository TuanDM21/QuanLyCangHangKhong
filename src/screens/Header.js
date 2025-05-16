import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

const BACKEND_URL = "http://10.0.10.32:8080";

const Header = () => {
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { setIsLoggedIn } = useAuth();

  // Lấy token từ AsyncStorage
  const getToken = async () => {
    return await AsyncStorage.getItem("userToken");
  };

  // Gọi API lấy notification
  const fetchNotifications = async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
      else setNotifications([]);
    } catch (e) {
      setNotifications([]);
    }
    setLoading(false);
  };

  // Gọi API lấy số lượng chưa đọc
  const fetchUnreadCount = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUnreadCount(data.data || 0);
      else setUnreadCount(0);
    } catch (e) {
      setUnreadCount(0);
    }
  };

  // Đánh dấu đã đọc notification
  const markAsRead = async (id) => {
    const token = await getToken();
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/api/notifications/read/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    } catch (e) {}
  };

  // Chỉ fetch khi mở modal hoặc khi focus màn hình
  useEffect(() => {
    if (notificationModalVisible) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [notificationModalVisible]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  // Đăng xuất
  const handleLogout = async () => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");
      if (userToken) {
        try {
          await fetch(`${BACKEND_URL}/api/users/logout-cleanup`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          });
        } catch (err) {}
      }
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("expoPushToken");
      setIsLoggedIn(false);
    } catch (error) {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("expoPushToken");
      setIsLoggedIn(false);
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "white" }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: StatusBar.currentHeight || 10,
          paddingHorizontal: 15,
          height: 60,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#ddd",
        }}
      >
        {/* Logo: Bấm vào logo để về trang chủ */}
        <TouchableOpacity onPress={() => navigation.navigate("Home")}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Image
            source={require("../../assets/LogoDHA.png")}
            style={{ width: 150, height: 80, resizeMode: 'contain', marginRight: 8 }}
          />
          {/* Nếu muốn giữ text bên cạnh logo, bỏ comment dòng dưới */}
          {/* <Text style={{ fontSize: 20, fontWeight: "bold", color: "#004080" }}>
            Dong Hoi Airport
          </Text> */}
        </TouchableOpacity>

        {/* Bell & User Icon */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Bell Icon */}
          <TouchableOpacity
            onPress={() => setNotificationModalVisible(true)}
            style={{ marginRight: 15 }}
          >
            <MaterialIcons name="notifications" size={28} color="#ffcc00" />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -2,
                  backgroundColor: "red",
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Icon */}
          <TouchableOpacity onPress={() => setUserModalVisible(true)}>
            <MaterialIcons name="person" size={28} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal hiển thị thông báo */}
      <Modal
        visible={notificationModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              margin: 20,
              padding: 20,
              borderRadius: 10,
              maxHeight: "80%",
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              Thông báo
            </Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <FlatList
                data={notifications}
                renderItem={({ item }) => (
                  <View
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#eee",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: item.isRead ? "normal" : "bold",
                        color: item.isRead ? "#333" : "#007bff",
                        fontSize: 16,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                      {item.content}
                    </Text>
                    {!item.isRead ? (
                      <TouchableOpacity
                        onPress={() => markAsRead(item.id)}
                        style={{
                          alignSelf: "flex-end",
                          backgroundColor: "#007bff",
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "white" }}>Đã đọc</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text
                        style={{
                          alignSelf: "flex-end",
                          color: "green",
                          fontStyle: "italic",
                          fontSize: 13,
                        }}
                      >
                        Đã đọc
                      </Text>
                    )}
                  </View>
                )}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={<Text>Không có thông báo</Text>}
              />
            )}
            <TouchableOpacity
              onPress={() => setNotificationModalVisible(false)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: "blue", textAlign: "center" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal hiển thị menu tài khoản */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              margin: 20,
              padding: 20,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 18, color: "#1976D2", textAlign: 'center', letterSpacing: 0.5 }}>
              Quản lý tài khoản
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              onPress={() => {
                setUserModalVisible(false);
                navigation.navigate("ProfileScreen");
              }}
            >
              <Ionicons name="person-circle-outline" size={24} color="#1976D2" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#222' }}>Thông tin cá nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              onPress={() => {
                setUserModalVisible(false);
                navigation.navigate("NotificationCenterScreen");
              }}
            >
              <Ionicons name="notifications-outline" size={24} color="#1976D2" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#222' }}>Trung tâm thông báo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#FF3B30' }}>Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setUserModalVisible(false)}
              style={{ marginTop: 18 }}
            >
              <Text style={{ color: "#1976D2", textAlign: "center", fontWeight: '600', fontSize: 15 }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Header;