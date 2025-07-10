import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get('window');

const ScheduleScreen = () => {
  const navigation = useNavigation();
  const [roleName, setRoleName] = useState("");

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log("[ScheduleScreen] user:", user);
          console.log("[ScheduleScreen] user.roleName:", user.roleName);
          setRoleName(user.roleName); // hoặc user.role.roleName nếu backend trả về như vậy
        } else {
          console.log("[ScheduleScreen] userStr is null");
        }
      } catch (e) {
        console.log("[ScheduleScreen] error:", e);
        setRoleName("");
      }
    };
    fetchRole();
  }, []);

  // Các role được phép xem đủ 5 chức năng
  const isFullAccess = roleName === "admin" || roleName === "OFFICE";

  // Các role không được xem 'Lịch trực của tôi'
  const isHideMySchedule = ["ADMIN", "DIRECTOR", "VICE_DIRECTOR"].includes((roleName || "").toUpperCase());

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="calendar" size={32} color="#007AFF" />
            <Text style={styles.title}>Lịch trực</Text>
          </View>
          <Text style={styles.subtitle}>Quản lý lịch trình làm việc</Text>
        </View>

        {/* Menu Grid */}
        <View style={styles.menuContainer}>
          {isFullAccess ? (
            <>
              {/* Tạo lịch trực */}
              <TouchableOpacity
                style={[styles.menuItem, styles.primaryCard]}
                onPress={() => navigation.navigate("CreateSchedule")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="add-circle" size={32} color="#007AFF" />
                </View>
                <Text style={styles.menuTitle}>Tạo lịch trực</Text>
                <Text style={styles.menuDescription}>Tạo lịch trực mới</Text>
              </TouchableOpacity>

              {/* Danh sách lịch trực */}
              <TouchableOpacity
                style={[styles.menuItem, styles.secondaryCard]}
                onPress={() => navigation.navigate("ScheduleListScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="list" size={32} color="#34C759" />
                </View>
                <Text style={styles.menuTitle}>Danh sách</Text>
                <Text style={styles.menuDescription}>Xem tất cả lịch trực</Text>
              </TouchableOpacity>

              {/* Tìm kiếm */}
              <TouchableOpacity
                style={[styles.menuItem, styles.secondaryCard]}
                onPress={() => navigation.navigate("SearchScheduleScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="search" size={32} color="#FF9500" />
                </View>
                <Text style={styles.menuTitle}>Tìm kiếm</Text>
                <Text style={styles.menuDescription}>Tìm lịch trực</Text>
              </TouchableOpacity>

              {/* Áp dụng ca */}
              <TouchableOpacity
                style={[styles.menuItem, styles.secondaryCard]}
                onPress={() => navigation.navigate("ApplyShiftScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="checkmark-done" size={32} color="#5856D6" />
                </View>
                <Text style={styles.menuTitle}>Áp dụng ca</Text>
                <Text style={styles.menuDescription}>Áp dụng ca làm việc</Text>
              </TouchableOpacity>

              {/* Áp dụng ca theo chuyến bay */}
              <TouchableOpacity
                style={[styles.menuItem, styles.wideCard]}
                onPress={() => navigation.navigate("ApplyFlightShiftScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="airplane" size={32} color="#FF2D92" />
                </View>
                <Text style={styles.menuTitle}>Áp dụng ca theo chuyến bay</Text>
                <Text style={styles.menuDescription}>Quản lý ca theo từng chuyến bay</Text>
              </TouchableOpacity>

              {/* Lịch trực của tôi */}
              {!isHideMySchedule && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.wideCard]}
                  onPress={() => navigation.navigate("MyShiftScreen")}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name="person" size={32} color="#007AFF" />
                  </View>
                  <Text style={styles.menuTitle}>Lịch trực của tôi</Text>
                  <Text style={styles.menuDescription}>Xem lịch trực cá nhân</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* Danh sách lịch trực */}
              <TouchableOpacity
                style={[styles.menuItem, styles.primaryCard]}
                onPress={() => navigation.navigate("ScheduleListScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="list" size={32} color="#007AFF" />
                </View>
                <Text style={styles.menuTitle}>Danh sách lịch trực</Text>
                <Text style={styles.menuDescription}>Xem tất cả lịch trực</Text>
              </TouchableOpacity>

              {/* Tìm kiếm */}
              <TouchableOpacity
                style={[styles.menuItem, styles.secondaryCard]}
                onPress={() => navigation.navigate("SearchScheduleScreen")}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="search" size={32} color="#34C759" />
                </View>
                <Text style={styles.menuTitle}>Tìm kiếm</Text>
                <Text style={styles.menuDescription}>Tìm lịch trực</Text>
              </TouchableOpacity>

              {/* Lịch trực của tôi */}
              {!isHideMySchedule && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.wideCard]}
                  onPress={() => navigation.navigate("MyScheduleScreen")}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name="person" size={32} color="#FF9500" />
                  </View>
                  <Text style={styles.menuTitle}>Lịch trực của tôi</Text>
                  <Text style={styles.menuDescription}>Xem lịch trực cá nhân</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "500",
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3e8ef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryCard: {
    width: (width - 60) / 2,
    backgroundColor: "#F0F8FF",
    borderColor: "#007AFF20",
  },
  secondaryCard: {
    width: (width - 60) / 2,
  },
  wideCard: {
    width: width - 40,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
    lineHeight: 22,
  },
  menuDescription: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "400",
    lineHeight: 18,
  },
});

export default ScheduleScreen;