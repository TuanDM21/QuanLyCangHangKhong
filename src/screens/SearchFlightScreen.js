import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Button,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../services";

// Hàm định dạng Date thành chuỗi "YYYY-MM-DD"
const formatDate = (date) => {
  if (!date) return "";
  return date.toISOString().split("T")[0];
};

// Hàm định dạng giờ "HH:mm:ss" thành "HH:mm"
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
};

const SearchFlightScreen = () => {
  const [searchDate, setSearchDate] = useState(new Date());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const navigation = useNavigation();

  // Hàm tìm kiếm chuyến bay theo ngày và từ khóa (tìm kiếm chính xác theo ngày)
  const handleSearch = async () => {
    if (!searchDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày chuyến bay");
      return;
    }
    try {
      setLoading(true);
      const dateStr = formatDate(searchDate);
      const data = await httpApiClient.get(
        `flights/searchByDateAndKeyword?date=${dateStr}&keyword=${searchKeyword}`
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
      {/* Hiển thị mã sân bay (không render object) */}
      <Text style={styles.infoText}>
        {item.departureAirport?.airportCode ?? "Chưa xác định"}{" "}
        {"→"}{" "}
        {item.arrivalAirport?.airportCode ?? "Chưa xác định"}
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
        {/* Date Picker thay vì TextInput cho ngày */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setIsDatePickerVisible(true)}
        >
          <Text style={styles.dateText}>
            {searchDate ? formatDate(searchDate) : "Chọn ngày chuyến bay"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={(date) => {
            setSearchDate(date);
            setIsDatePickerVisible(false);
          }}
          onCancel={() => setIsDatePickerVisible(false)}
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
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
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
  dateButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
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
  infoText: {
    fontSize: 16,
    color: "#333",
    marginVertical: 4,
    fontStyle: "italic",
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
