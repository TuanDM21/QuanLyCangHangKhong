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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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
  const [timeType, setTimeType] = useState("");
  const [newTime, setNewTime] = useState("");

  // Bell notification state
  const [notifiedFlights, setNotifiedFlights] = useState({});
  const [notifyDialog, setNotifyDialog] = useState({ visible: false, flightId: null, field: "" });

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
  const handleOpenModal = (flightId, fieldName) => {
    setCurrentFlightId(flightId);
    setTimeType(fieldName);
    setNewTime("");
    setModalVisible(true);
  };

  // Cập nhật giờ thực tế lên server
  const updateTime = async () => {
    if (!/^\d\d:\d\d$/.test(newTime)) {
      return Alert.alert("Lỗi", "Hãy nhập giờ theo định dạng HH:mm");
    }
    const payload = { [timeType]: newTime + ":00" };
    try {
      const res = await httpApiClient.patch(
        `flights/${currentFlightId}/times`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `HTTP ${res.status}`);
      }
      Alert.alert("Thành công", json.message || "Đã cập nhật giờ");
      setModalVisible(false);
      fetchFlights();
    } catch (e) {
      Alert.alert("Lỗi", e.message);
    }
  };

  // Hiện dialog xác nhận gửi thông báo
  const handleSendNotification = (flightId, field) => {
    setNotifyDialog({ visible: true, flightId, field });
  };

  // Xác nhận gửi thông báo
// Xác nhận gửi thông báo
const confirmSendNotification = async () => {
  const { flightId, field } = notifyDialog;
  // Lấy giá trị actual time từ flights state
  const flight = flights.find(f => f.id === flightId);
  let actualTime = "";
  if (field === "actualArrivalTime") actualTime = flight?.actualArrivalTime;
  if (field === "actualDepartureTimeAtArrival") actualTime = flight?.actualDepartureTimeAtArrival;
  if (!actualTime) {
    Alert.alert("Lỗi", "Chưa có giờ thực tế để gửi thông báo!");
    setNotifyDialog({ visible: false, flightId: null, field: "" });
    return;
  }
  try {
    // Gửi PATCH với payload đúng field
    const payload = { [field]: actualTime };
    const res = await httpApiClient.patch(
      `flights/${flightId}/actual-time-notify`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    Alert.alert("Thành công", json.message || "Đã gửi thông báo!");
    setNotifiedFlights(prev => ({
      ...prev,
      [`${flightId}_${field}`]: true,
    }));
  } catch (e) {
    Alert.alert("Lỗi", e.message);
  } finally {
    setNotifyDialog({ visible: false, flightId: null, field: "" });
  }
};

  // Hàm cắt chuỗi thời gian "HH:mm:ss" thành "HH:mm"
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
  };

  // Live Tracking (nếu actualDepartureTime khác null)
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

  // Render từng item chuyến bay
  const renderFlightItem = ({ item }) => {
    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons name="airplane-outline" size={24} color="#007AFF" />
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
        </View>

        <Text style={styles.infoText}>Ngày bay: {item.flightDate || ""}</Text>

        {/* Hiển thị mã sân bay (không render object) */}
        <Text style={styles.infoText}>
          {item.departureAirport?.airportCode ?? "Chưa xác định"}
          {" → "}
          {item.arrivalAirport?.airportCode ?? "Chưa xác định"}
        </Text>

        {/* Thời gian kế hoạch */}
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Kế hoạch:</Text>
          <Text style={styles.planTime}>
            {formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}
          </Text>
        </View>

        {/* Cất cánh thực tế tại sân bay đi */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.departureAirport?.airportCode ?? "Chưa xác định"}:
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
          {/* KHÔNG hiển thị chuông ở dòng này */}
        </View>

        {/* Hạ cánh thực tế tại sân bay đến */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Hạ cánh thực tế tại {item.arrivalAirport?.airportCode ?? "Chưa xác định"}:
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
          {/* Chuông chỉ hiển thị nếu đã có thời gian */}
          {item.actualArrivalTime && formatTime(item.actualArrivalTime) !== "00:00" && (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => handleSendNotification(item.id, "actualArrivalTime")}
              disabled={notifiedFlights[`${item.id}_actualArrivalTime`]}
            >
              <MaterialIcons
                name="notifications-active"
                size={24}
                color={notifiedFlights[`${item.id}_actualArrivalTime`] ? "#bdbdbd" : "#28a745"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Cất cánh thực tế tại sân bay đến (nếu turnaround) */}
        <View style={styles.timeRow}>
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.arrivalAirport?.airportCode ?? "Chưa xác định"}:
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
          {/* Chuông chỉ hiển thị nếu đã có thời gian */}
          {item.actualDepartureTimeAtArrival && formatTime(item.actualDepartureTimeAtArrival) !== "00:00" && (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => handleSendNotification(item.id, "actualDepartureTimeAtArrival")}
              disabled={notifiedFlights[`${item.id}_actualDepartureTimeAtArrival`]}
            >
              <MaterialIcons
                name="notifications-active"
                size={24}
                color={notifiedFlights[`${item.id}_actualDepartureTimeAtArrival`] ? "#bdbdbd" : "#28a745"}
              />
            </TouchableOpacity>
          )}
        </View>

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

        {/* Modal xác nhận gửi thông báo */}
        <Modal
          visible={notifyDialog.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotifyDialog({ visible: false, flightId: null, field: "" })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Gửi thông báo cho nhân viên?</Text>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={confirmSendNotification}>
                  <Text style={styles.btnText}>Gửi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setNotifyDialog({ visible: false, flightId: null, field: "" })}
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
  bellBtn: {
    marginLeft: 8,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  notifyBtn: {
    backgroundColor: "#28a745",
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  notifyBtnText: {
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