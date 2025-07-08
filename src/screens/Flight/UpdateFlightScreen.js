import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";

const UpdateFlightScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { flight } = route.params || {};

  if (!flight) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin chuyến bay.</Text>
      </View>
    );
  }

  // Helper: cắt "HH:mm:ss" → "HH:mm"
  const formatTime = (t) => (t && t.length >= 5 ? t.substring(0, 5) : "");

  // Helper: cắt "YYYY-MM-DDThh:mm:ss" hoặc "YYYY-MM-DD" → "YYYY-MM-DD"
  const formatDate = (d) => (d ? d.substring(0, 10) : "");

  // initial form state
  const [flightNumber, setFlightNumber] = useState(flight.flightNumber || "");

  const [selectedDeparture, setSelectedDeparture] = useState(
    typeof flight.departureAirport === "object"
      ? flight.departureAirport.airportCode
      : flight.departureAirport
  );
  const [selectedArrival, setSelectedArrival] = useState(
    typeof flight.arrivalAirport === "object"
      ? flight.arrivalAirport.airportCode
      : flight.arrivalAirport
  );

  const [departureTime, setDepartureTime] = useState(formatTime(flight.departureTime));
  const [arrivalTime, setArrivalTime] = useState(formatTime(flight.arrivalTime));
  const [flightDate, setFlightDate] = useState(formatDate(flight.flightDate));

  // pickers visibility
  const [showDepTimePicker, setShowDepTimePicker] = useState(false);
  const [showArrTimePicker, setShowArrTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // airports list
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingAirports(true);
        const res = await httpApiClient.get("airports");
        const json = await res.json();
        setAirports(json.data);
      } catch (e) {
        Alert.alert("Lỗi", e.message);
      } finally {
        setLoadingAirports(false);
      }
    })();
  }, []);

  // handle pickers
  const onDepTimeConfirm = (date) => {
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    setDepartureTime(`${hh}:${mm}`);
    setShowDepTimePicker(false);
  };
  const onArrTimeConfirm = (date) => {
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    setArrivalTime(`${hh}:${mm}`);
    setShowArrTimePicker(false);
  };
  const onDateConfirm = (date) => {
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    setFlightDate(`${yyyy}-${mm}-${dd}`);
    setShowDatePicker(false);
  };

  const handleUpdateFlight = async () => {
    if (selectedDeparture === selectedArrival) {
      Alert.alert("Lỗi", "Sân bay khởi hành và hạ cánh không được trùng nhau.");
      return;
    }
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

    const depObj = airports.find((a) => a.airportCode === selectedDeparture);
    const arrObj = airports.find((a) => a.airportCode === selectedArrival);
    if (!depObj || !arrObj) {
      Alert.alert("Lỗi", "Không tìm thấy sân bay đã chọn.");
      return;
    }

    const payload = {
      flightNumber,
      departureAirport: { id: depObj.id },
      arrivalAirport:   { id: arrObj.id },
      departureTime,   // "HH:mm"
      arrivalTime,     // "HH:mm"
      flightDate,      // "YYYY-MM-DD"
    };

    try {
      const res = await httpApiClient.put(`flights/${flight.id}`, { json: payload });
      if (res.ok) {
        Alert.alert("Thành công", "Cập nhật chuyến bay thành công", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert("Lỗi", err.message || "Cập nhật thất bại");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Lỗi", "Không thể kết nối đến server");
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Cập nhật chuyến bay</Text>

          {/* Flight number */}
          <Text style={styles.label}>Số hiệu chuyến bay:</Text>
          <TextInput
            style={styles.input}
            value={flightNumber}
            onChangeText={setFlightNumber}
          />

          {/* Departure airport */}
          <Text style={styles.label}>Sân bay khởi hành:</Text>
          {loadingAirports ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <SelectModal
              data={airports.map(a => ({ label: `${a.airportCode} - ${a.airportName}`, value: a.airportCode }))}
              value={selectedDeparture}
              onChange={setSelectedDeparture}
              placeholder="Chọn sân bay khởi hành"
              title="Chọn sân bay khởi hành"
            />
          )}

          {/* Arrival airport */}
          <Text style={styles.label}>Sân bay hạ cánh:</Text>
          {loadingAirports ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <SelectModal
              data={airports.map(a => ({ label: `${a.airportCode} - ${a.airportName}`, value: a.airportCode }))}
              value={selectedArrival}
              onChange={setSelectedArrival}
              placeholder="Chọn sân bay hạ cánh"
              title="Chọn sân bay hạ cánh"
            />
          )}

          {/* Departure time */}
          <Text style={styles.label}>Giờ cất cánh:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDepTimePicker(true)}
          >
            <Text style={{ color: departureTime ? "#000" : "#888" }}>
              {departureTime || "Chọn giờ"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showDepTimePicker}
            mode="time"
            onConfirm={onDepTimeConfirm}
            onCancel={() => setShowDepTimePicker(false)}
          />

          {/* Arrival time */}
          <Text style={styles.label}>Giờ hạ cánh:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowArrTimePicker(true)}
          >
            <Text style={{ color: arrivalTime ? "#000" : "#888" }}>
              {arrivalTime || "Chọn giờ"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showArrTimePicker}
            mode="time"
            onConfirm={onArrTimeConfirm}
            onCancel={() => setShowArrTimePicker(false)}
          />

          {/* Flight date */}
          <Text style={styles.label}>Ngày bay:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: flightDate ? "#000" : "#888" }}>
              {flightDate || "Chọn ngày"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={onDateConfirm}
            onCancel={() => setShowDatePicker(false)}
          />

          {/* Submit */}
          <TouchableOpacity style={styles.button} onPress={handleUpdateFlight}>
            <Text style={styles.buttonText}>Cập nhật chuyến bay</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

export default UpdateFlightScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#E0F2FE",
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
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    fontSize: 16,
  },
});
