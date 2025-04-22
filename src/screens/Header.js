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
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

// const BACKEND_URL = "http://10.0.2.2:8080"; // Thay bằng địa chỉ backend thực tế
const BACKEND_URL = "http://192.168.1.5:8080"; // Thay bằng địa chỉ backend thực tế



const Header = ({ setIsLoggedIn }) => {
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Lấy token từ AsyncStorage
  const getToken = async () => {
    return await AsyncStorage.getItem("userToken");
  };

  // Gọi API lấy notification
  const fetchNotifications = async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
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
      // Cập nhật local state để phản ánh ngay trên UI
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    } catch (e) {}
  };

  // Khi mở modal notification, fetch lại dữ liệu
  useEffect(() => {
    if (notificationModalVisible) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [notificationModalVisible]);

  // Luôn fetch số notification chưa đọc khi Header mount và khi chuyển màn hình
  useEffect(() => {
    fetchUnreadCount();
    // Polling mỗi 15s để realtime
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  // Đăng xuất
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      setIsLoggedIn(false);
    } catch (error) {
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
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#004080" }}>
            Dong Hoi Airport
          </Text>
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
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              Tài khoản
            </Text>
            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={() => {
                setUserModalVisible(false);
                navigation.navigate("ProfileScreen");
              }}
            >
              <Text>Thông tin cá nhân</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={handleLogout}
            >
              <Text>Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setUserModalVisible(false)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: "blue", textAlign: "center" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Header;