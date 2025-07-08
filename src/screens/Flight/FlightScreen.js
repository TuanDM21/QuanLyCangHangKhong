import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "../Common/Layout"; 
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FlightScreen = () => {
  const navigation = useNavigation();
  const [permissions, setPermissions] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setPermissions(user.permissions || []);
        }
      } catch (e) {
        setPermissions([]);
      }
    })();
  }, []);

  const hasPermission = (perm) => Array.isArray(permissions) && permissions.includes(perm);

  return (
    <Layout>
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.title}>Chuyến bay</Text>
        
        <View style={styles.menu}>
          {/* Tạo chuyến bay */}
          {hasPermission("CAN_CREATE_FLIGHT") && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("CreateFlightScreen")}
            >
              <Ionicons name="airplane-outline" size={40} color="white" />
              <Text style={styles.menuText}>Tạo chuyến bay</Text>
            </TouchableOpacity>
          )}

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

          {/* Bản đồ Live Tracking */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("LiveTrackingMapScreen")}
          >
            <Ionicons name="locate-outline" size={40} color="white" />
            <Text style={styles.menuText}>Bản đồ Live Tracking</Text>
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
