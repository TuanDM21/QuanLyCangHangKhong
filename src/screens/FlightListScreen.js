import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Layout from "./Layout";
import httpApiClient from "../services";

const FlightListScreen = () => {
  const navigation = useNavigation();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal controls
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFlightId, setCurrentFlightId] = useState(null);
  const [timeType, setTimeType] = useState(""); // "actualDepartureTime", "actualArrivalTime", "actualDepartureTimeAtArrival"
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    fetchFlights();
  }, []);

  // Lấy danh sách chuyến bay từ endpoint today
  const fetchFlights = async () => {
    setLoading(true);
    try {
      const res = await httpApiClient.get("flights/today");
      const flightsJson = await res.json();
      setFlights(flightsJson.data);
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal để nhập giờ cho trường tương ứng
  // timeType là tên trường mà bạn cần cập nhật
  const handleOpenModal = (flightId, fieldName) => {
    setCurrentFlightId(flightId);
    setTimeType(fieldName);
    setNewTime("");
    setModalVisible(true);
  };

  // Cập nhật giờ thực tế lên server
  const updateTime = async () => {
    if (!newTime) {
      Alert.alert("Lỗi", "Vui lòng nhập giờ (HH:mm)");
      return;
    }
    const flightToUpdate = flights.find((f) => f.id === currentFlightId);
    if (!flightToUpdate) {
      Alert.alert("Lỗi", "Không tìm thấy chuyến bay cần cập nhật");
      setModalVisible(false);
      return;
    }
    const updatedFlight = { ...flightToUpdate };
    updatedFlight[timeType] = newTime;

    try {
      const response = await httpApiClient.get(`flights?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("Cập nhật giờ thất bại");
      }
      const data = await response.json();
      setFlights((prev) =>
        prev.map((f) => (f.id === currentFlightId ? data : f))
      );
      Alert.alert("Thành công", "Đã cập nhật giờ!");
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setModalVisible(false);
    }
  };

  // Hàm cắt chuỗi thời gian "HH:mm:ss" thành "HH:mm"
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
  };

  // Live Tracking: nếu actualDepartureTime đã có và khác "00:00" (sau khi được format)
  const renderLiveTracking = (flight) => {
    if (
      flight.actualDepartureTime &&
      formatTime(flight.actualDepartureTime) !== "00:00"
    ) {
      return (
        <TouchableOpacity
          style={styles.liveBtn}
          onPress={() =>
            navigation.navigate("LiveTrackingScreen", { flight: flight })
          }
        >
          <Text style={styles.liveBtnText}>Live Tracking</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  // Render từng item chuyến bay – luôn hiển thị nút "Sửa" cho mỗi trường
  const renderFlightItem = ({ item }) => {
    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons name="airplane-outline" size={24} color="#007AFF" />
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
        </View>
        <Text style={styles.infoText}>Ngày bay: {item.flightDate || ""}</Text>
        <Text style={styles.infoText}>
          {item.departureAirport} → {item.arrivalAirport}
        </Text>
        {/* Thời gian kế hoạch (dự kiến) */}
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Kế hoạch:</Text>
          <Text style={styles.planTime}>
            {formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}
          </Text>
        </View>

        {/* Cất cánh thực tế tại sân bay đi */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.departureAirport}:
          </Text>
          <Text style={styles.timeValue}>
            {formatTime(item.actualDepartureTime)}
          </Text>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => handleOpenModal(item.id, "actualDepartureTime")}
          >
            <Text style={styles.btnText}>Cập nhật</Text>
          </TouchableOpacity>
        </View>

        {/* Hạ cánh thực tế tại sân bay đến */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Hạ cánh thực tế tại {item.arrivalAirport}:
          </Text>
          <Text style={styles.timeValue}>
            {formatTime(item.actualArrivalTime)}
          </Text>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => handleOpenModal(item.id, "actualArrivalTime")}
          >
            <Text style={styles.btnText}>Cập nhật</Text>
          </TouchableOpacity>
        </View>

        {/* Cất cánh thực tế tại sân bay đến */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.arrivalAirport}:
          </Text>
          <Text style={styles.timeValue}>
            {formatTime(item.actualDepartureTimeAtArrival)}
          </Text>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() =>
              handleOpenModal(item.id, "actualDepartureTimeAtArrival")
            }
          >
            <Text style={styles.btnText}>Cập nhật</Text>
          </TouchableOpacity>
        </View>

        {/* Live Tracking */}
        {renderLiveTracking(item)}
      </View>
    );
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Danh Sách Chuyến Bay</Text>
        {loading ? (
          <ActivityIndicator
            color="#007AFF"
            size="large"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={flights}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderFlightItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}

        {/* Modal để nhập giờ */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Nhập giờ thực tế (HH:mm)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: 18:30"
                value={newTime}
                onChangeText={setNewTime}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={updateTime}>
                  <Text style={styles.btnText}>Lưu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Layout>
  );
};

export default FlightListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#007AFF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  flightNumber: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  infoText: {
    fontSize: 15,
    marginBottom: 4,
    color: "#333",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    color: "#444",
  },
  planTime: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    color: "#D2691E",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  label: {
    flex: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timeValue: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
    color: "#8B0000",
  },
  updateBtn: {
    backgroundColor: "#FFA500",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 5,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  infoTextSmall: {
    fontSize: 13,
    color: "#888",
    marginLeft: 5,
  },
  liveBtn: {
    backgroundColor: "#007AFF",
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  liveBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "80%",
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
});
