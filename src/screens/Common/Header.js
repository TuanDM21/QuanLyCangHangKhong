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
  StyleSheet,
  Dimensions,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get('window');

const BACKEND_URL = "http://10.0.10.32:8080";
// const BACKEND_URL = "http://192.168.1.17:8080";

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <View style={styles.headerContainer}>
        {/* Logo Section - ACV Dong Hoi Airport Text Design */}
        <TouchableOpacity 
          onPress={() => navigation.navigate("Home")}
          style={styles.logoContainer}
          activeOpacity={0.8}
        >
          <View style={styles.logoDesign}>
            <View style={styles.acvBrand}>
              {/* First Line: ACV */}
              <Text style={styles.acvMainText}>ACV</Text>
              
              {/* Second Line: Company Info */}
              <View style={styles.companyInfo}>
                <Text style={styles.companyVietText}>CẢNG HÀNG KHÔNG ĐÔNG HÓI</Text>
                <View style={styles.dividerLine} />
                <Text style={styles.companyEngText}>DONG HOI AIRPORT</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          {/* Notification Bell */}
          <TouchableOpacity
            onPress={() => setNotificationModalVisible(true)}
            style={styles.actionButton}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.notificationButton]}>
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* User Profile */}
          <TouchableOpacity 
            onPress={() => setUserModalVisible(true)}
            style={styles.actionButton}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.profileButton]}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Modal */}
      <Modal
        visible={notificationModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="notifications" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.modalTitle}>Thông báo</Text>
              </View>
              <TouchableOpacity
                onPress={() => setNotificationModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Đang tải thông báo...</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={({ item }) => (
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationTitle,
                          { fontWeight: item.isRead ? "500" : "600" }
                        ]}>
                          {item.title}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationText}>
                        {item.content}
                      </Text>
                      <View style={styles.notificationActions}>
                        {!item.isRead ? (
                          <TouchableOpacity
                            onPress={() => markAsRead(item.id)}
                            style={styles.markReadButton}
                          >
                            <Text style={styles.markReadButtonText}>Đánh dấu đã đọc</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.readStatus}>
                            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                            <Text style={styles.readStatusText}>Đã đọc</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyNotifications}>
                    <Ionicons name="notifications-outline" size={48} color="#C7C7CC" />
                    <Text style={styles.emptyNotificationsText}>Không có thông báo</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* User Menu Modal */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="person" size={24} color="#10B981" />
                </View>
                <Text style={styles.modalTitle}>Tài khoản</Text>
              </View>
              <TouchableOpacity
                onPress={() => setUserModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.userMenuContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setUserModalVisible(false);
                  navigation.navigate("ProfileScreen");
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="person" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>Thông tin cá nhân</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setUserModalVisible(false);
                  navigation.navigate("NotificationCenterScreen");
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="notifications" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.menuItemText}>Trung tâm thông báo</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Đăng xuất</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#1E3A8A",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E3A8A",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logoContainer: {
    flex: 1,
    marginRight: 16,
  },
  logoDesign: {
    flexDirection: "column",
    justifyContent: "center",
  },
  acvBrand: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  acvMainText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  companyInfo: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  companyVietText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 12,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: "#60A5FA",
    width: 120,
    marginVertical: 1,
  },
  companyEngText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#E0E7FF",
    lineHeight: 11,
    letterSpacing: 0.6,
    marginTop: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationButton: {
    backgroundColor: "#F59E0B",
    borderWidth: 2,
    borderColor: "#FCD34D",
  },
  profileButton: {
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#6EE7B7",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  notificationModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  userModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FAFBFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  notificationItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
    fontWeight: "600",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: 8,
  },
  notificationText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationActions: {
    alignItems: "flex-end",
  },
  markReadButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markReadButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  readStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  readStatusText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyNotifications: {
    padding: 40,
    alignItems: "center",
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 12,
    fontWeight: "500",
  },
  userMenuContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginVertical: 2,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
    marginHorizontal: 4,
  },
});

export default Header;