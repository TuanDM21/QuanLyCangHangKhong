import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const ScheduleScreen = () => {
  const navigation = useNavigation();

  return (
    <Layout>
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.title}>Lịch trực</Text>
        
        <View style={styles.menu}>
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
    // Đổ bóng cho Android & iOS
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
