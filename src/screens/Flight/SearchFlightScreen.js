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
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../../services";

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
  const [isSearched, setIsSearched] = useState(false);
  const navigation = useNavigation();

  // Hàm tìm kiếm chuyến bay theo ngày và từ khóa (tìm kiếm chính xác theo ngày)
  const handleSearch = async () => {
    if (!searchDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày chuyến bay");
      return;
    }
    try {
      setLoading(true);
      setIsSearched(true);
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
        <View style={{flexDirection:'row',alignItems:'center'}}>
          <Ionicons name="airplane-outline" size={26} color="#007AFF" />
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
          <View style={styles.flightBadge}><Text style={styles.flightBadgeText}>{item.status || 'Đang hoạt động'}</Text></View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#bbb" />
      </View>
      <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
        <Ionicons name="time-outline" size={18} color="#007AFF" style={{marginRight:4}} />
        <Text style={styles.flightText}>{formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}</Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
        <Ionicons name="calendar-outline" size={18} color="#007AFF" style={{marginRight:4}} />
        <Text style={styles.flightText}>{item.flightDate}</Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
        <Ionicons name="location-outline" size={18} color="#007AFF" style={{marginRight:4}} />
        <Text style={styles.flightText}>{item.departureAirport?.airportCode ?? "?"} → {item.arrivalAirport?.airportCode ?? "?"}</Text>
      </View>
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
        <View style={styles.searchBarModern}>
          <TouchableOpacity
            style={styles.dateButtonModern}
            onPress={() => setIsDatePickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{marginRight:6}} />
            <Text style={styles.dateTextModern}>
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
          <View style={styles.inputWrapperModern}>
            <Ionicons name="search-outline" size={20} color="#007AFF" style={{marginRight:6}} />
            <TextInput
              style={styles.inputModern}
              placeholder="Nhập từ khóa (số hiệu, sân bay...)"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholderTextColor="#aaa"
            />
          </View>
          <TouchableOpacity style={styles.searchButtonModern} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.searchButtonTextModern}>Tìm kiếm</Text>
          </TouchableOpacity>
        </View>
        {/* Tổng số chuyến bay */}
        {isSearched && (
          <View style={styles.summaryRow}>
            <Ionicons name="airplane" size={20} color="#007AFF" style={{marginRight:6}} />
            <Text style={styles.summaryText}>Tìm thấy {flights.length} chuyến bay</Text>
          </View>
        )}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={flights}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            style={{ flex: 1 }}
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
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3e8ef',
    shadowColor: '#007AFF',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginHorizontal: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  flightNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#007AFF',
    letterSpacing: 1.1,
  },
  flightBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  flightBadgeText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  flightText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    marginVertical: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 7,
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
    marginTop: 20,
  },
  searchBarModern: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'column',
    shadowColor: '#007AFF',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  dateButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  dateTextModern: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputWrapperModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f8fa',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  inputModern: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  searchButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    marginTop: 2,
  },
  searchButtonTextModern: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  summaryText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
});
