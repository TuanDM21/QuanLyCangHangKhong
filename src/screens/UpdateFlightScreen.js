import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator 
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import Layout from "./Layout";

const UpdateFlightScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { flight } = route.params;

  // Debug: In ra giá trị flight nhận được
  useEffect(() => {
    console.log("Flight nhận được trong UpdateFlightScreen:", flight);
  }, [flight]);

  // Hàm cắt chuỗi thời gian, chỉ lấy "HH:mm"
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
  };

  // State khởi tạo với dữ liệu nhận được
  const [flightNumber, setFlightNumber] = useState(flight.flightNumber || "");
  const [selectedDeparture, setSelectedDeparture] = useState(flight.departureAirport || "");
  const [selectedArrival, setSelectedArrival] = useState(flight.arrivalAirport || "");
  const [departureTime, setDepartureTime] = useState(
    flight.departureTime ? formatTime(flight.departureTime) : ""
  );
  const [arrivalTime, setArrivalTime] = useState(
    flight.arrivalTime ? formatTime(flight.arrivalTime) : ""
  );
  const [flightDate, setFlightDate] = useState(flight.flightDate || "");

  // State cho danh sách sân bay từ backend và trạng thái loading
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);

  // Lấy danh sách sân bay từ backend khi màn hình mở
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        setLoadingAirports(true);
        const response = await fetch("http://10.0.2.2:8080/api/airports");
        if (!response.ok) {
          throw new Error("Không thể lấy dữ liệu sân bay");
        }
        const data = await response.json();
        setAirports(data);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", error.message);
      } finally {
        setLoadingAirports(false);
      }
    };
    fetchAirports();
  }, []);

  const handleUpdateFlight = async () => {
    // Kiểm tra nếu chọn trùng sân bay
    if (selectedDeparture === selectedArrival) {
      Alert.alert("Lỗi", "Sân bay khởi hành và hạ cánh không được trùng nhau.");
      return;
    }
    // Validate đầy đủ các trường
    if (
      !flightNumber ||
      !selectedDeparture ||
      !selectedArrival ||
      !departureTime ||
      !arrivalTime ||
      !flightDate
    ) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const updatedFlight = {
      flightNumber,
      departureAirport: selectedDeparture,
      arrivalAirport: selectedArrival,
      departureTime, // định dạng "HH:mm"
      arrivalTime,   // định dạng "HH:mm"
      flightDate     // định dạng "YYYY-MM-DD"
    };

    try {
      const response = await fetch(`http://10.0.2.2:8080/api/flights/${flight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFlight)
      });

      if (response.ok) {
        Alert.alert("Thành công", "Cập nhật chuyến bay thành công", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        const errorText = await response.text();
        Alert.alert("Lỗi", errorText || "Cập nhật chuyến bay thất bại");
      }
    } catch (error) {
      console.error("Update flight error:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến server");
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật chuyến bay</Text>

        <TextInput
          style={styles.input}
          placeholder="Số hiệu chuyến bay"
          value={flightNumber}
          onChangeText={setFlightNumber}
        />

        <Text style={styles.label}>Sân bay khởi hành:</Text>
        {loadingAirports ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDeparture}
              onValueChange={(itemValue) => setSelectedDeparture(itemValue)}
            >
              <Picker.Item label="Chọn sân bay khởi hành" value="" />
              {airports.map((airport) => (
                <Picker.Item
                  key={airport.id}
                  label={`${airport.airportCode} - ${airport.airportName}`}
                  value={airport.airportCode}
                />
              ))}
            </Picker>
          </View>
        )}

        <Text style={styles.label}>Sân bay hạ cánh:</Text>
        {loadingAirports ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedArrival}
              onValueChange={(itemValue) => setSelectedArrival(itemValue)}
            >
              <Picker.Item label="Chọn sân bay hạ cánh" value="" />
              {airports.map((airport) => (
                <Picker.Item
                  key={airport.id}
                  label={`${airport.airportCode} - ${airport.airportName}`}
                  value={airport.airportCode}
                />
              ))}
            </Picker>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Giờ khởi hành (HH:mm)"
          value={departureTime}
          onChangeText={setDepartureTime}
        />
        <TextInput
          style={styles.input}
          placeholder="Giờ hạ cánh (HH:mm)"
          value={arrivalTime}
          onChangeText={setArrivalTime}
        />
        <TextInput
          style={styles.input}
          placeholder="Ngày bay (YYYY-MM-DD)"
          value={flightDate}
          onChangeText={setFlightDate}
        />

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdateFlight}>
          <Text style={styles.buttonText}>Cập nhật chuyến bay</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

export default UpdateFlightScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#007AFF",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
  },
  updateButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});
