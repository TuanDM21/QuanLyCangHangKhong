import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "../Common/Layout";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../../services";
import { useNavigation, useRoute } from "@react-navigation/native";
import SelectModal from "../../components/SelectModal";
import { Ionicons } from "@expo/vector-icons";

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
  const [isLoading, setIsLoading] = useState(false);

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
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.titleIcon}>
            <Ionicons name="airplane" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.title}>Cập nhật chuyến bay trực</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <Ionicons name="person" size={20} color="#1E3A8A" />
            <Text style={styles.userTitle}>Thông tin nhân viên</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{schedule.userName || "N/A"}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Date Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="calendar" size={16} color="#1E3A8A" /> Chọn ngày
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={showDatePicker}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.dateIcon} />
              <Text style={[styles.dateText, !shiftDate && styles.placeholderText]}>
                {shiftDate || "Chọn ngày"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Flight Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="airplane" size={16} color="#1E3A8A" /> Chọn chuyến bay
            </Text>
            <SelectModal
              data={flights.map(f => ({ 
                label: `${f.flightNumber} (${f.departureAirport?.airportCode} → ${f.arrivalAirport?.airportCode})`, 
                value: f.id?.toString() 
              }))}
              value={selectedFlightId}
              onChange={setSelectedFlightId}
              placeholder="Chọn chuyến bay"
              title="Chọn chuyến bay"
            />
          </View>

          {/* Flight Info Display */}
          {flightInfo && (
            <View style={styles.flightInfoCard}>
              <View style={styles.flightInfoHeader}>
                <Ionicons name="information-circle" size={20} color="#10B981" />
                <Text style={styles.flightInfoTitle}>Chi tiết chuyến bay</Text>
              </View>
              
              <View style={styles.flightDetails}>
                <View style={styles.flightDetailRow}>
                  <Ionicons name="bookmark" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Số hiệu:</Text>
                  <Text style={styles.detailValue}>{flightInfo.flightNumber}</Text>
                </View>
                
                <View style={styles.flightDetailRow}>
                  <Ionicons name="airplane" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Sân bay đi:</Text>
                  <Text style={styles.detailValue}>
                    {flightInfo.departureAirport?.airportCode} - {flightInfo.departureAirport?.airportName}
                  </Text>
                </View>
                
                <View style={styles.flightDetailRow}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Sân bay đến:</Text>
                  <Text style={styles.detailValue}>
                    {flightInfo.arrivalAirport?.airportCode} - {flightInfo.arrivalAirport?.airportName}
                  </Text>
                </View>
                
                <View style={styles.flightDetailRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Giờ cất cánh:</Text>
                  <Text style={styles.detailValue}>{flightInfo.departureTime}</Text>
                </View>
                
                <View style={styles.flightDetailRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Giờ hạ cánh:</Text>
                  <Text style={styles.detailValue}>{flightInfo.arrivalTime}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" style={styles.buttonIcon} />
            <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.updateButton, isLoading && styles.disabledButton]} 
            onPress={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" style={styles.buttonIcon} />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="white" style={styles.buttonIcon} />
            )}
            <Text style={styles.updateButtonText}>
              {isLoading ? "Đang cập nhật..." : "Cập nhật chuyến bay"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
        />
      </ScrollView>
    </Layout>
  );
};

export default UpdateUserFlightShiftScreen;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },

  // Header Section
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E3A8A",
    flex: 1,
  },

  // User Card
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  userTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E3A8A",
    marginLeft: 8,
  },
  userInfo: {
    backgroundColor: "#F0F9FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0C4A6E",
  },

  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },

  // Input Sections
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  // Date Button
  dateButton: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  placeholderText: {
    color: "#9CA3AF",
  },

  // Flight Info Card
  flightInfoCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  flightInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D1FAE5",
  },
  flightInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#065F46",
    marginLeft: 8,
  },
  flightDetails: {
    gap: 8,
  },
  flightDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 8,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "500",
    flex: 1,
  },

  // Action Section
  actionSection: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  updateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 8,
  },
});