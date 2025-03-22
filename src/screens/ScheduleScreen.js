import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Layout from "./Layout";

const options = [
  { id: "1", title: "Tạo lịch trực", icon: "add-circle-outline", screen: "CreateSchedule" },
  { id: "2", title: "Danh sách lịch trực", icon: "list-outline", screen: "ScheduleListScreen" }, 
  // { id: "3", title: "Xoá lịch trực", icon: "trash-outline" },
  // { id: "4", title: "Tìm kiếm", icon: "search-outline" },
  { id: "5", title: "Đổi ca trực", icon: "sync-outline" },
  { id: "6", title: "Áp dụng ca", icon: "checkbox-outline" },
];

const ScheduleScreen = () => {
  const navigation = useNavigation();

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Lịch trực</Text>
        <FlatList
          data={options}
          numColumns={3} // Hiển thị 3 cột
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.box}
              onPress={() => {
                if (item.screen) navigation.navigate(item.screen);
              }}
            >
              <Ionicons name={item.icon} size={32} color="white" />
              <Text style={styles.text}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  box: {
    flex: 1,
    maxWidth: 110, // Giới hạn kích thước hộp
    height: 110,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    padding: 10,
  },
  text: {
    color: "white",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});

export default ScheduleScreen;
