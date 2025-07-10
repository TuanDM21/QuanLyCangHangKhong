import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Ionicons name="airplane" size={28} color="#1565C0" />
          <Text style={styles.title}>Quản Lý Chuyến Bay</Text>
        </View>
        
        <View style={styles.menuGrid}>
          {/* Tạo chuyến bay */}
          {hasPermission("CAN_CREATE_FLIGHT") && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("CreateFlightScreen")}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle" size={32} color="#1565C0" />
              </View>
              <Text style={styles.menuText}>Tạo chuyến bay</Text>
            </TouchableOpacity>
          )}

          {/* Danh sách chuyến bay */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("FlightListScreen")}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="list" size={32} color="#1565C0" />
            </View>
            <Text style={styles.menuText}>Danh sách chuyến bay trong ngày</Text>
          </TouchableOpacity>

          {/* Tìm kiếm */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("SearchFlightScreen")}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="search" size={32} color="#1565C0" />
            </View>
            <Text style={styles.menuText}>Tìm kiếm</Text>
          </TouchableOpacity>

          {/* Bản đồ Live Tracking */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("LiveTrackingMapScreen")}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={32} color="#1565C0" />
            </View>
            <Text style={styles.menuText}>Bản đồ Live Tracking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Layout>
  );
};

export default FlightScreen;

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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1565C0",
    marginLeft: 12,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    padding: 20,
    gap: 16,
  },
  menuItem: {
    backgroundColor: "white",
    width: "45%",
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e3f2fd",
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    textAlign: "center",
    lineHeight: 18,
  },
});
