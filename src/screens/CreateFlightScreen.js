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
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";

const CreateFlightScreen = () => {
  const navigation = useNavigation();
  const [flightNumber, setFlightNumber] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [flightDate, setFlightDate] = useState("");

  // State cho danh sách sân bay và lựa chọn sân bay
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [selectedArrival, setSelectedArrival] = useState("");

  // Lấy danh sách sân bay từ backend khi mở màn hình
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

  const handleCreateFlight = async () => {
    // Nếu chọn trùng sân bay, không cho phép submit
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

    const newFlight = {
      flightNumber,
      departureAirport: selectedDeparture, // lưu mã sân bay
      arrivalAirport: selectedArrival,
      departureTime, // định dạng "HH:mm"
      arrivalTime,   // định dạng "HH:mm"
      flightDate     // định dạng "YYYY-MM-DD"
    };

    try {
      const response = await fetch("http://10.0.2.2:8080/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFlight)
      });
      if (response.ok) {
        Alert.alert("Thành công", "Tạo chuyến bay thành công", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
        // Reset form
        setFlightNumber("");
        setSelectedDeparture("");
        setSelectedArrival("");
        setDepartureTime("");
        setArrivalTime("");
        setFlightDate("");
      } else {
        const errorText = await response.text();
        Alert.alert("Lỗi", errorText || "Tạo chuyến bay thất bại.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể kết nối đến server.");
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Tạo Chuyến Bay</Text>
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
        <TouchableOpacity style={styles.button} onPress={handleCreateFlight}>
          <Text style={styles.buttonText}>Tạo chuyến bay</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

export default CreateFlightScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#E0F2FE"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#007AFF"
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    fontSize: 16
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18
  }
});
