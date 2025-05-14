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
  Animated,
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

  // Animated value cho hiệu ứng nhấp nháy LIVE
  const liveAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchFlights();
    // Lặp animation nhấp nháy
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveAnim, {
          toValue: 0.2,
          duration: 1000, // 1 giây nhấp nháy
          useNativeDriver: true,
        }),
        Animated.timing(liveAnim, {
          toValue: 1,
          duration: 1000, // 1 giây nhấp nháy
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [liveAnim]);

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
const confirmSendNotification = async () => {
  const { flightId, field } = notifyDialog;
  // Lấy giá trị actual time từ flights state
  const flight = flights.find(f => f.id === flightId);
  let actualTime = "";
  let eventType = "";
  if (field === "actualArrivalTime") {
    actualTime = flight?.actualArrivalTime;
    eventType = "actualArrivalTime";
  }
  if (field === "actualDepartureTimeAtArrival") {
    actualTime = flight?.actualDepartureTimeAtArrival;
    eventType = "actualDepartureTimeAtArrival";
  }
  if (!actualTime) {
    Alert.alert("Lỗi", "Chưa có giờ thực tế để gửi thông báo!");
    setNotifyDialog({ visible: false, flightId: null, field: "" });
    return;
  }
  try {
    // Gửi PATCH với payload đúng field và eventType
    const payload = { [field]: actualTime, eventType };
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

  // Live Tracking (nếu actualDepartureTime khác null và chưa có actualDepartureTimeAtArrival)
  const isLiveTracking = (flight) => {
    return (
      flight.actualDepartureTime &&
      formatTime(flight.actualDepartureTime) !== "00:00" &&
      !flight.actualDepartureTimeAtArrival
    );
  };

  // Render badge LIVE nhấp nháy
  const renderLiveBadge = () => (
    <Animated.View style={[styles.liveBadgeAnimated, { opacity: liveAnim }]}> 
      <Ionicons name="radio" size={16} color="#fff" style={{marginRight: 4}} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </Animated.View>
  );

  // Render từng item chuyến bay
  const renderFlightItem = ({ item }) => {
    const live = isLiveTracking(item);
    return (
      <View style={[styles.card, live && styles.cardLive]}> 
        <View style={styles.headerRow}>
          <Ionicons name="airplane" size={28} color="#007AFF" style={{marginRight: 8}} />
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
          {live && (
            <View style={styles.liveBadgeWrapper}>
              {renderLiveBadge()}
            </View>
          )}
        </View>
        {/* Calendar và chuyến bay: mỗi dòng 1 thông tin, icon và chữ cùng dòng */}
        <View style={styles.infoRowInline}>
          <Ionicons name="calendar" size={18} color="#888" style={{marginRight: 4}} />
          <Text style={styles.infoText}>{item.flightDate ? `${item.flightDate}` : ""}</Text>
        </View>
        <View style={styles.infoRowInline}>
          <Ionicons name="airplane-outline" size={20} color="#007AFF" style={{marginRight: 4}} />
          <Text style={styles.airportText}>{item.departureAirport?.airportCode || "---"}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FF3B30" style={{marginHorizontal: 6}} />
          <Ionicons name="airplane" size={20} color="#28a745" style={{marginRight: 4}} />
          <Text style={styles.airportText}>{item.arrivalAirport?.airportCode || "---"}</Text>
        </View>
        <View style={styles.planRow}>
          <Ionicons name="time" size={18} color="#D2691E" style={{marginRight: 4}} />
          <Text style={styles.planLabel}>Kế hoạch:</Text>
          <Text style={styles.planTime}>
            {formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}
          </Text>
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="airplane-outline" size={18} color="#007AFF" style={{marginRight: 4}} />
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.departureAirport?.airportCode ?? "Chưa xác định"}:
          </Text>
          <Text style={styles.timeValue}>{formatTime(item.actualDepartureTime)}</Text>
          <TouchableOpacity style={styles.updateBtn} onPress={() => handleOpenModal(item.id, "actualDepartureTime")}> 
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="airplane" size={18} color="#28a745" style={{marginRight: 4}} />
          <Text style={styles.label}>
            Hạ cánh thực tế tại {item.arrivalAirport?.airportCode ?? "Chưa xác định"}:
          </Text>
          <Text style={styles.timeValue}>{formatTime(item.actualArrivalTime)}</Text>
          <TouchableOpacity style={styles.updateBtn} onPress={() => handleOpenModal(item.id, "actualArrivalTime")}> 
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
          {item.actualArrivalTime && formatTime(item.actualArrivalTime) !== "00:00" && (
            <TouchableOpacity style={styles.bellBtn} onPress={() => handleSendNotification(item.id, "actualArrivalTime")} disabled={notifiedFlights[`${item.id}_actualArrivalTime`]}> 
              <MaterialIcons name="notifications-active" size={24} color={notifiedFlights[`${item.id}_actualArrivalTime`] ? "#bdbdbd" : "#28a745"} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="airplane" size={18} color="#FF3B30" style={{marginRight: 4}} />
          <Text style={styles.label}>
            Cất cánh thực tế tại {item.arrivalAirport?.airportCode ?? "Chưa xác định"}:
          </Text>
          <Text style={styles.timeValue}>{formatTime(item.actualDepartureTimeAtArrival)}</Text>
          <TouchableOpacity style={styles.updateBtn} onPress={() => handleOpenModal(item.id, "actualDepartureTimeAtArrival")}> 
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
          {item.actualDepartureTimeAtArrival && formatTime(item.actualDepartureTimeAtArrival) !== "00:00" && (
            <TouchableOpacity style={styles.bellBtn} onPress={() => handleSendNotification(item.id, "actualDepartureTimeAtArrival")} disabled={notifiedFlights[`${item.id}_actualDepartureTimeAtArrival`]}> 
              <MaterialIcons name="notifications-active" size={24} color={notifiedFlights[`${item.id}_actualDepartureTimeAtArrival`] ? "#bdbdbd" : "#28a745"} />
            </TouchableOpacity>
          )}
        </View>
        {live && (
          <TouchableOpacity style={styles.liveBtnModern} onPress={() => navigation.navigate("LiveTrackingScreen", { flight: item })}>
            <Ionicons name="locate" size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.liveBtnText}>Xem Live Tracking</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Danh Sách Chuyến Bay</Text>
        <Text style={{textAlign: 'center', fontWeight: 'bold', color: '#007AFF', marginBottom: 2}}>
          Tổng số chuyến bay: {flights.length}
        </Text>
        <Text style={{textAlign: 'center', color: '#FF9500', fontWeight: '600', fontSize: 16, marginBottom: 8}}>
          {(() => {
            const now = new Date();
            const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear();
            const weekday = weekdays[now.getDay()];
            return `${weekday}, ngày ${day}/${month}/${year}`;
          })()}
        </Text>
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    position: 'relative',
  },
  cardLive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
    height: 22,
  },
  liveBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
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
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 5,
    flexDirection: 'row',
    alignItems: 'center',
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
  liveBtnModern: {
    backgroundColor: '#FF3B30',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
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
  liveBadgeWrapper: {
    // Để nhấp nháy
    marginLeft: 10,
    height: 22,
    justifyContent: 'center',
  },
  '@keyframes blink': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.2 },
    '100%': { opacity: 1 },
  },
  liveBadgeAnimated: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 22,
    // Nhấp nháy bằng cách dùng animation (sẽ dùng Animated.View ở dưới)
  },
  infoRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  infoRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  airportText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22223b',
    letterSpacing: 1.2,
    marginRight: 2,
  },
});