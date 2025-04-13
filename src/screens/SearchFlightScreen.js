import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout"; // Component Layout bọc chung giao diện ứng dụng của bạn
import { useNavigation } from "@react-navigation/native";
import httpApiClient from "../services";

const SearchFlightScreen = () => {
  const [searchDate, setSearchDate] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Hàm tìm kiếm chuyến bay theo ngày và từ khóa (tìm kiếm chính xác theo ngày)
  const handleSearch = async () => {
    if (!searchDate) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày chuyến bay (YYYY-MM-DD)");
      return;
    }
    try {
      setLoading(true);
      const data = await httpApiClient.get(
        `flights/searchByDateAndKeyword?date=${searchDate}&keyword=${searchKeyword}`
      );
      const dataJson = await data.json();
      setFlights(dataJson.data);
    } catch (error) {
      console.error("Error fetching flights: ", error);
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm formatTime: cắt chuỗi thời gian thành định dạng "HH:mm"
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    // Nếu timeStr có dạng "HH:mm:ss", chỉ lấy phần "HH:mm"
    return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
  };

  // Hàm xử lý cập nhật chuyến bay
  const handleUpdate = (flight) => {
    // Điều hướng sang màn hình UpdateFlightScreen và truyền dữ liệu chuyến bay qua params
    navigation.navigate("UpdateFlightScreen", { flight });
  };

  // Hàm xử lý xóa chuyến bay
  const handleDelete = (id) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa chuyến bay này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        onPress: async () => {
          try {
            await httpApiClient.delete(`flights/${id}`);
            setFlights(flights.filter((item) => item.id !== id));
          } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể kết nối đến server");
          }
        },
      },
    ]);
  };

  // Render từng item (chuyến bay) trong FlatList
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="airplane-outline" size={24} color="#007AFF" />
        <Text style={styles.flightNumber}>{item.flightNumber}</Text>
      </View>
      <Text style={styles.flightText}>
        🕒 {formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}
      </Text>
      <Text style={styles.flightText}>📅 {item.flightDate}</Text>
      <Text style={styles.flightText}>
        📍 {item.departureAirport} → {item.arrivalAirport}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={() => handleUpdate(item)}
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Sửa</Text>
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
        <Text style={styles.title}>Tìm kiếm chuyến bay</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập ngày chuyến bay (YYYY-MM-DD)"
          value={searchDate}
          onChangeText={setSearchDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Nhập từ khóa (số hiệu, sân bay...)"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Tìm kiếm</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={flights}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Không có chuyến bay nào được tìm thấy.
              </Text>
            }
          />
        )}
      </View>
    </Layout>
  );
};

export default SearchFlightScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#007AFF",
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  flightNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#007AFF",
  },
  flightText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  updateButton: {
    backgroundColor: "#007AFF",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
    marginTop: 20,
  },
});
