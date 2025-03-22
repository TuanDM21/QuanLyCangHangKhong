import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StatusBar, SafeAreaView } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const Header = () => {
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const navigation = useNavigation();

  // Danh sách thông báo
  const notifications = [
    "Bạn có lịch họp vào 10:00 AM",
    "Chuyến bay VN123 bị hoãn",
    "Báo cáo tháng đã sẵn sàng",
    "Nhắc nhở: Kiểm tra lịch trình hôm nay",
    "Hệ thống sẽ bảo trì vào 23:00"
  ];

  const handleLogout = async () => {
    await AsyncStorage.clear(); // Xóa toàn bộ dữ liệu
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    }); // Reset navigation stack về màn hình Login
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
        {/* Logo */}
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#004080" }}>Dong Hoi Airport</Text>

        {/* Bell & User Icon */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Bell Icon */}
          <TouchableOpacity onPress={() => setNotificationModalVisible(true)} style={{ marginRight: 15 }}>
            <MaterialIcons name="notifications" size={28} color="#ffcc00" />
            {notifications.length > 0 && (
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
                <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{notifications.length}</Text>
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
      <Modal visible={notificationModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "white", margin: 20, padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Thông báo</Text>
            <FlatList
              data={notifications}
              renderItem={({ item }) => <Text style={{ paddingVertical: 5 }}>- {item}</Text>}
              keyExtractor={(item, index) => index.toString()}
            />
            <TouchableOpacity onPress={() => setNotificationModalVisible(false)} style={{ marginTop: 15 }}>
              <Text style={{ color: "blue", textAlign: "center" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal hiển thị menu tài khoản */}
      <Modal visible={userModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "white", margin: 20, padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Tài khoản</Text>
            <TouchableOpacity style={{ paddingVertical: 10 }}>
              <Text>Thông tin cá nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 10 }}>
              <Text>Đổi mật khẩu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 10 }} onPress={handleLogout}>
  <Text>Đăng xuất</Text>
</TouchableOpacity>
            <TouchableOpacity onPress={() => setUserModalVisible(false)} style={{ marginTop: 15 }}>
              <Text style={{ color: "blue", textAlign: "center" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Header;
