import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.title}>Lịch trực</Text>
        <View style={styles.menu}>
          {isFullAccess ? (
            <>
              {/* Tạo lịch trực */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("CreateSchedule")}
              >
                <Ionicons name="add-circle-outline" size={40} color="white" />
                <Text style={styles.menuText}>Tạo lịch trực</Text>
              </TouchableOpacity>
              {/* Danh sách lịch trực */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("ScheduleListScreen")}
              >
                <Ionicons name="list-outline" size={40} color="white" />
                <Text style={styles.menuText}>Danh sách lịch trực</Text>
              </TouchableOpacity>
              {/* Tìm kiếm */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("SearchScheduleScreen")}
              >
                <Ionicons name="search-outline" size={40} color="white" />
                <Text style={styles.menuText}>Tìm kiếm</Text>
              </TouchableOpacity>
              {/* Áp dụng ca */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("ApplyShiftScreen")}
              >
                <Ionicons name="checkmark-done-outline" size={40} color="white" />
                <Text style={styles.menuText}>Áp dụng ca</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("ApplyFlightShiftScreen")}
              >
                <Ionicons name="checkmark-done-outline" size={40} color="white" />
                <Text style={styles.menuText}>Áp dụng ca theo chuyến bay</Text>
              </TouchableOpacity>
              {/* Lịch trực của tôi */}
              {!isHideMySchedule && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate("MyShiftScreen")}
                >
                  <Ionicons name="person-outline" size={40} color="white" />
                  <Text style={styles.menuText}>Lịch trực của tôi</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* Danh sách lịch trực */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("ScheduleListScreen")}
              >
                <Ionicons name="list-outline" size={40} color="white" />
                <Text style={styles.menuText}>Danh sách lịch trực</Text>
              </TouchableOpacity>
              {/* Tìm kiếm */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("SearchScheduleScreen")}
              >
                <Ionicons name="search-outline" size={40} color="white" />
                <Text style={styles.menuText}>Tìm kiếm</Text>
              </TouchableOpacity>
              {/* Lịch trực của tôi */}
              {!isHideMySchedule && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate("MyScheduleScreen")}
                >
                  <Ionicons name="person-outline" size={40} color="white" />
                  <Text style={styles.menuText}>Lịch trực của tôi</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
    color: "#007AFF",
  },
  menu: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  menuItem: {
    backgroundColor: "#007AFF",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 15,
    margin: 10,
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  menuText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
});

export default ScheduleScreen;