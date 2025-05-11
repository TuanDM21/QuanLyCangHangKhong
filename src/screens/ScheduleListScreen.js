import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import httpApiClient from "../services";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [flightSchedules, setFlightSchedules] = useState([]);
  const [searchText, setSearchText] = useState("");
  const navigation = useNavigation();

  // Fetch cả ca trực và ca chuyến bay
  const fetchAllSchedules = async () => {
    try {
      const [shiftsRes, flightsRes] = await Promise.all([
        httpApiClient.get("shifts"),
        httpApiClient.get("user-flight-shifts"),
      ]);
      const shiftsJson = await shiftsRes.json();
      const flightsJson = await flightsRes.json();

      // Thêm type để phân biệt
      const shifts = (shiftsJson.data || []).map((item) => ({
        ...item,
        type: "shift",
      }));
      const flights = (flightsJson.data || []).map((item) => ({
        ...item,
        type: "flight",
      }));

      setSchedules(shifts);
      setFlightSchedules(flights);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllSchedules();
    }, [])
  );

  const handleDelete = async (item) => {
    if (item.type === "shift") {
      Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              await httpApiClient.delete(`shifts/${item.id}`);
              setSchedules((prev) => prev.filter((i) => i.id !== item.id));
            } catch (error) {
              console.error(error);
              Alert.alert("Lỗi", "Không thể kết nối đến server");
            }
          },
        },
      ]);
    } else if (item.type === "flight") {
      Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch chuyến bay này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              await httpApiClient.delete(
                `user-flight-shifts?flightId=${item.flightId}&shiftDate=${item.shiftDate}&userId=${item.userId}`
              );
              setFlightSchedules((prev) =>
                prev.filter(
                  (i) =>
                    !(
                      i.flightId === item.flightId &&
                      i.shiftDate === item.shiftDate &&
                      i.userId === item.userId
                    )
                )
              );
            } catch (error) {
              console.error(error);
              Alert.alert("Lỗi", "Không thể kết nối đến server");
            }
          },
        },
      ]);
    }
  };

  const handleUpdate = (item) => {
    if (item.type === "shift") {
      navigation.navigate("UpdateSchedule", { schedule: item });
    }
    // Nếu muốn cập nhật lịch chuyến bay, thêm logic ở đây
  };

  // Gộp hai loại lịch để tìm kiếm và hiển thị
  const allSchedules = [...schedules, ...flightSchedules];

  const filteredSchedules = allSchedules.filter((item) => {
    const search = searchText.toLowerCase();
    if (item.type === "shift") {
      const shiftCode = item.shiftCode ? item.shiftCode.toLowerCase() : "";
      const location = item.location ? item.location.toLowerCase() : "";
      const description = item.description ? item.description.toLowerCase() : "";
      return (
        shiftCode.includes(search) ||
        location.includes(search) ||
        description.includes(search)
      );
    } else if (item.type === "flight") {
      const flightNumber = item.flightNumber ? item.flightNumber.toLowerCase() : "";
      const userName = item.userName ? item.userName.toLowerCase() : "";
      const shiftDate = item.shiftDate ? item.shiftDate.toLowerCase() : "";
      return (
        flightNumber.includes(search) ||
        userName.includes(search) ||
        shiftDate.includes(search)
      );
    }
    return false;
  });

  const renderItem = ({ item }) => {
    if (item.type === "shift") {
      return (
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.scheduleId}>{item.shiftCode}</Text>
          </View>
          <Text style={styles.text}>
            🕒 {item.startTime} - {item.endTime}
          </Text>
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
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item.type === "flight") {
      return (
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="airplane-outline" size={24} color="#FF9500" />
            <Text style={styles.scheduleId}>{item.flightNumber}</Text>
          </View>
          <Text style={styles.text}>👤 {item.userName}</Text>
          <Text style={styles.text}>🕒 {item.shiftDate}</Text>
          <Text style={styles.text}>
            📍 {item.departureAirport?.airportCode} → {item.arrivalAirport?.airportCode}
          </Text>
          <View style={styles.buttonContainer}>
            {/* Nếu muốn cập nhật lịch chuyến bay, thêm nút cập nhật ở đây */}
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Danh sách lịch trực & chuyến bay</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo mã ca, chuyến bay, nhân viên, mô tả..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item, idx) =>
            item.type === "shift"
              ? `shift-${item.id}`
              : `flight-${item.flightId}-${item.userId}-${item.shiftDate}-${idx}`
          }
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
    justifyContent: "flex-end",
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 5,
    minWidth: 80,
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