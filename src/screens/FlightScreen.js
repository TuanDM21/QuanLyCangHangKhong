import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout"; 
import { useNavigation } from "@react-navigation/native";

const FlightScreen = () => {
  const navigation = useNavigation();

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Chuyến bay</Text>
        
        <View style={styles.menu}>
          {/* Tạo chuyến bay */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("CreateFlightScreen")}
          >
            <Ionicons name="airplane-outline" size={40} color="white" />
            <Text style={styles.menuText}>Tạo chuyến bay</Text>
          </TouchableOpacity>

          {/* Danh sách chuyến bay */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("FlightListScreen")}
          >
            <Ionicons name="list-outline" size={40} color="white" />
            <Text style={styles.menuText}>Danh sách chuyến bay trong ngày</Text>
          </TouchableOpacity>

          {/* Tìm kiếm */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("SearchFlightScreen")}
          >
            <Ionicons name="search-outline" size={40} color="white" />
            <Text style={styles.menuText}>Tìm kiếm</Text>
          </TouchableOpacity>

          {/* Nếu cần 4 nút thì mở lại Tracking */}
          {/* <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("FlightTrackingScreen")}
          >
            <Ionicons name="location-outline" size={40} color="white" />
            <Text style={styles.menuText}>Theo dõi</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Layout>
  );
};

export default FlightScreen;

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
  // Menu sẽ chia làm 2 cột
  menu: {
    flexDirection: "row",
    flexWrap: "wrap",       // Cho phép xuống dòng
    justifyContent: "center", 
    // Có thể chỉnh alignItems, margin, padding nếu muốn
  },
  menuItem: {
    backgroundColor: "#007AFF",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 15,
    margin: 10,
    // width "40%" để 2 nút / hàng (cộng với margin => 2 cột)
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
    // Elevation / shadow
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
