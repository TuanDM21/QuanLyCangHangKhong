import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../services";

/** Utility để format Date thành chuỗi **/
function formatTime(date) {
  if (!date) return "";
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const M = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${M}-${d}`;
}

const CreateFlightScreen = () => {
  const navigation = useNavigation();

  // form state
  const [flightNumber, setFlightNumber] = useState("");
  const [departureTime, setDepartureTime] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [flightDate, setFlightDate] = useState(null);

  const [isDepartureTimePickerVisible, setDepartureTimePickerVisible] = useState(false);
  const [isArrivalTimePickerVisible, setArrivalTimePickerVisible] = useState(false);
  const [isFlightDatePickerVisible, setFlightDatePickerVisible] = useState(false);

  // airports
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [selectedArrival, setSelectedArrival] = useState("");

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

  const handleCreateFlight = async () => {
    if (selectedDeparture === selectedArrival) {
      Alert.alert("Lỗi", "Sân bay khởi hành và hạ cánh không được trùng nhau.");
      return;
    }
    if (!flightNumber || !selectedDeparture || !selectedArrival || !departureTime || !arrivalTime || !flightDate) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const depId = parseInt(selectedDeparture, 10);
    const arrId = parseInt(selectedArrival, 10);
    const newFlight = {
      flightNumber,
      departureAirport: depId,
      arrivalAirport: arrId,
      departureTime: formatTime(departureTime),
      arrivalTime: formatTime(arrivalTime),
      flightDate: formatDate(flightDate),
    };

    try {
      const res = await httpApiClient.post("flights", { json: newFlight });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Tạo chuyến bay thất bại.");
      }
      Alert.alert("Thành công", "Tạo chuyến bay thành công", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      // reset
      setFlightNumber("");
      setSelectedDeparture("");
      setSelectedArrival("");
      setDepartureTime(null);
      setArrivalTime(null);
      setFlightDate(null);
    } catch (e) {
      Alert.alert("Lỗi", e.message || "Không thể kết nối đến server.");
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
                onValueChange={setSelectedDeparture}
              >
                <Picker.Item label="(Chọn sân bay khởi hành)" value="" />
                {airports.map((a) => (
                  <Picker.Item
                    key={a.id}
                    label={`${a.airportCode} – ${a.airportName}`}
                    value={a.id.toString()}
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
                onValueChange={setSelectedArrival}
              >
                <Picker.Item label="(Chọn sân bay hạ cánh)" value="" />
                {airports.map((a) => (
                  <Picker.Item
                    key={a.id}
                    label={`${a.airportCode} – ${a.airportName}`}
                    value={a.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          )}

          <TouchableOpacity
            style={[styles.input, { justifyContent: "center" }]}
            onPress={() => setDepartureTimePickerVisible(true)}
          >
            <Text style={{ color: departureTime ? "#000" : "#aaa" }}>
              {departureTime ? `Giờ khởi hành: ${formatTime(departureTime)}` : "Chọn giờ khởi hành"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isDepartureTimePickerVisible}
            mode="time"
            onConfirm={(d) => {
              setDepartureTime(d);
              setDepartureTimePickerVisible(false);
            }}
            onCancel={() => setDepartureTimePickerVisible(false)}
          />

          <TouchableOpacity
            style={[styles.input, { justifyContent: "center" }]}
            onPress={() => setArrivalTimePickerVisible(true)}
          >
            <Text style={{ color: arrivalTime ? "#000" : "#aaa" }}>
              {arrivalTime ? `Giờ hạ cánh: ${formatTime(arrivalTime)}` : "Chọn giờ hạ cánh"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isArrivalTimePickerVisible}
            mode="time"
            onConfirm={(d) => {
              setArrivalTime(d);
              setArrivalTimePickerVisible(false);
            }}
            onCancel={() => setArrivalTimePickerVisible(false)}
          />

          <TouchableOpacity
            style={[styles.input, { justifyContent: "center" }]}
            onPress={() => setFlightDatePickerVisible(true)}
          >
            <Text style={{ color: flightDate ? "#000" : "#aaa" }}>
              {flightDate ? `Ngày bay: ${formatDate(flightDate)}` : "Chọn ngày bay"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isFlightDatePickerVisible}
            mode="date"
            onConfirm={(d) => {
              setFlightDate(d);
              setFlightDatePickerVisible(false);
            }}
            onCancel={() => setFlightDatePickerVisible(false)}
          />

          <TouchableOpacity style={styles.button} onPress={handleCreateFlight}>
            <Text style={styles.buttonText}>Tạo chuyến bay</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

export default CreateFlightScreen;

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
    marginBottom: 5,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
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
    padding: 15,
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
