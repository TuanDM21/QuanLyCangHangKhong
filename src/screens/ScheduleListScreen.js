import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();

  const fetchShifts = () => {
    fetch("http://10.0.2.2:8080/api/shifts")
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data);
      })
      .catch((err) => {
        console.error("Lỗi khi fetch shifts:", err);
      });
  };

  // Sử dụng useFocusEffect để refresh dữ liệu khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  const handleDelete = (id) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa lịch này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              const response = await fetch(`http://10.0.2.2:8080/api/shifts/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                setSchedules(schedules.filter((item) => item.id !== id));
              } else {
                Alert.alert("Lỗi", "Không thể xóa lịch trực");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Lỗi", "Không thể kết nối đến server");
            }
          },
        },
      ]
    );
  };

  const handleUpdate = (item) => {
    navigation.navigate("UpdateSchedule", { schedule: item });
  };

  const filteredSchedules = schedules.filter((item) => {
    const shiftCode = item.shiftCode ? item.shiftCode.toLowerCase() : "";
    const location = item.location ? item.location.toLowerCase() : "";
    const description = item.description ? item.description.toLowerCase() : "";
    const search = searchText.toLowerCase();
  
    return (
      shiftCode.includes(search) ||
      location.includes(search) ||
      description.includes(search)
    );
  });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={24} color="#007AFF" />
        <Text style={styles.scheduleId}>{item.shiftCode}</Text>
      </View>
      <Text style={styles.text}>🕒 {item.startTime} - {item.endTime}</Text>
      <Text style={styles.text}>📍 {item.location}</Text>
      <Text style={styles.text}>📝 {item.description}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={() => handleUpdate(item)}
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Cập nhật</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Danh sách lịch trực</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo ID, vị trí, mô tả..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  searchInput: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  scheduleId: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#007AFF",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 5,
    flex: 1,
    justifyContent: "center",
  },
  updateButton: {
    backgroundColor: "#007AFF",
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    marginLeft: 5,
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
});

export default ScheduleListScreen;
