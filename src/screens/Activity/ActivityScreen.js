import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ActivityScreen = () => {
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
        <Text style={styles.title}>Hoạt động</Text>
        
        <View style={styles.menu}>
          {/* Tạo hoạt động */}
          {hasPermission("CAN_CREATE_ACTIVITY") && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("CreateActivityScreen")}
            >
              <Ionicons name="add-circle-outline" size={40} color="white" />
              <Text style={styles.menuText}>Tạo hoạt động</Text>
            </TouchableOpacity>
          )}

          {/* Hoạt động của tôi */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("MyActivitiesScreen")}
          >
            <Ionicons name="person-outline" size={40} color="white" />
            <Text style={styles.menuText}>Hoạt động của tôi</Text>
          </TouchableOpacity>

          {/* Tìm kiếm hoạt động */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("SearchActivityScreen")}
          >
            <Ionicons name="search-outline" size={40} color="white" />
            <Text style={styles.menuText}>Tìm kiếm hoạt động</Text>
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

export default ActivityScreen;