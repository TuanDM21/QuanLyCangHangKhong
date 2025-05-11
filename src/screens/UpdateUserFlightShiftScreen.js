import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../services";
import { useNavigation, useRoute } from "@react-navigation/native";

const UpdateUserFlightShiftScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule } = route.params;

  // Lấy id thực sự của lịch trực chuyến bay (có thể là id hoặc scheduleId)
  const scheduleId = schedule.id || schedule.scheduleId;

  const [shiftDate, setShiftDate] = useState(schedule.shiftDate || "");
  const [flights, setFlights] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState(
    schedule.flightId ? schedule.flightId.toString() : ""
  );
  const [flightInfo, setFlightInfo] = useState(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Lấy danh sách chuyến bay khi đổi ngày
  useEffect(() => {
    if (shiftDate) {
      httpApiClient
        .get(`flights/searchByDate?date=${shiftDate}`)
        .json()
        .then((data) => setFlights(data.data || []))
        .catch(() => setFlights([]));
    } else {
      setFlights([]);
    }
    setSelectedFlightId("");
    setFlightInfo(null);
  }, [shiftDate]);

  // Lấy thông tin chuyến bay khi chọn chuyến bay
  useEffect(() => {
    if (selectedFlightId) {
      const info = flights.find(
        (f) => f.id?.toString() === selectedFlightId
      );
      setFlightInfo(info || null);
    } else {
      setFlightInfo(null);
    }
  }, [selectedFlightId, flights]);

  // Date picker
  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirmDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setShiftDate(`${year}-${month}-${day}`);
    hideDatePicker();
  };

  // Cập nhật lịch trực chuyến bay cho nhân viên
  const handleUpdate = async () => {
    if (!shiftDate || !selectedFlightId) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày và chuyến bay!");
      return;
    }
    // Log giá trị truyền lên backend
    console.log("=== DEBUG UPDATE USER FLIGHT SHIFT ===");
    console.log("scheduleId:", scheduleId, "typeof:", typeof scheduleId);
    console.log("shiftDate:", shiftDate, "typeof:", typeof shiftDate);
    console.log("selectedFlightId:", selectedFlightId, "typeof:", typeof selectedFlightId);
    console.log("Payload gửi lên:", {
      shiftDate,
      flightId: Number(selectedFlightId),
    });
    if (!scheduleId || scheduleId === "undefined") {
      Alert.alert("Lỗi", "Không tìm thấy ID lịch trực chuyến bay!");
      return;
    }
    try {
        await httpApiClient.put(`user-flight-shifts/${Number(scheduleId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shiftDate,
              flightId: Number(selectedFlightId),
            }),
          });
      Alert.alert("Thành công", "Cập nhật chuyến bay thành công!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Cập nhật thất bại");
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật chuyến bay trực</Text>

        {/* Hiển thị tên nhân viên */}
        <Text style={styles.label}>Nhân viên:</Text>
        <View style={styles.input}>
          <Text style={{ color: "#222" }}>
            {schedule.userName || "N/A"}
          </Text>
        </View>

        <Text style={styles.label}>Chọn ngày:</Text>
        <TouchableOpacity onPress={showDatePicker} activeOpacity={1}>
          <View style={styles.input}>
            <Text style={{ color: shiftDate ? "#222" : "#aaa" }}>
              {shiftDate || "Chọn ngày"}
            </Text>
          </View>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
        />

        <Text style={styles.label}>Chọn chuyến bay:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedFlightId}
            onValueChange={(value) => setSelectedFlightId(value)}
            enabled={flights.length > 0}
          >
            <Picker.Item label="(Chọn chuyến bay)" value="" />
            {flights.map((flight) => (
              <Picker.Item
                key={flight.id}
                label={`${flight.flightNumber} (${flight.departureAirport?.airportCode} → ${flight.arrivalAirport?.airportCode})`}
                value={flight.id.toString()}
              />
            ))}
          </Picker>
        </View>

        {flightInfo && (
          <View style={styles.flightInfo}>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Số hiệu: </Text>
              {flightInfo.flightNumber}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Sân bay đi: </Text>
              {flightInfo.departureAirport?.airportCode} - {flightInfo.departureAirport?.airportName}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Sân bay đến: </Text>
              {flightInfo.arrivalAirport?.airportCode} - {flightInfo.arrivalAirport?.airportName}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Giờ cất cánh: </Text>
              {flightInfo.departureTime}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Giờ hạ cánh: </Text>
              {flightInfo.arrivalTime}
            </Text>
          </View>
        )}

        <Button title="CẬP NHẬT" onPress={handleUpdate} />
      </View>
    </Layout>
  );
};

export default UpdateUserFlightShiftScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#CFE2FF",
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 10,
  },
  flightInfo: {
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: "600",
  },
});