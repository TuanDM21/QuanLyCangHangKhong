import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    // Giả lập dữ liệu danh sách lịch trực
    const mockData = [
      { scheduleId: "LD001", startTime: "08:00", endTime: "16:00", location: "Cổng A2", description: "Ca trực sáng" },
      { scheduleId: "LD002", startTime: "16:00", endTime: "00:00", location: "Cổng B1", description: "Ca trực chiều" },
      { scheduleId: "LD003", startTime: "00:00", endTime: "08:00", location: "Cổng C3", description: "Ca trực đêm" },
    ];
    setSchedules(mockData);
  }, []);

  const handleDelete = (id) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa lịch này?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          onPress: () => setSchedules(schedules.filter(item => item.scheduleId !== id)) 
        },
      ]
    );
  };

  const handleUpdate = (item) => {
    navigation.navigate("UpdateSchedule", { schedule: item });
  };

  const filteredSchedules = schedules.filter(item =>
    item.scheduleId.toLowerCase().includes(searchText.toLowerCase()) ||
    item.location.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={24} color="#007AFF" />
        <Text style={styles.scheduleId}>{item.scheduleId}</Text>
      </View>
      <Text style={styles.text}>🕒 {item.startTime} - {item.endTime}</Text>
      <Text style={styles.text}>📍 {item.location}</Text>
      <Text style={styles.text}>📝 {item.description}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.updateButton]} onPress={() => handleUpdate(item)}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Cập nhật</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleDelete(item.scheduleId)}>
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
          keyExtractor={(item) => item.scheduleId}
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
