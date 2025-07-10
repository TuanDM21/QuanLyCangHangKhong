import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "../Common/Layout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import httpApiClient from "../../services";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import SelectModal from "../../components/SelectModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SearchScheduleScreen = () => {
  // State cho ngày, team, unit
  const [shiftDate, setShiftDate] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");

  // Loại lịch trực: "user-shifts" hoặc "user-flight-shifts"
  const [scheduleType, setScheduleType] = useState("user-shifts");

  // State để điều khiển hiển thị DateTimePicker
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Kết quả tìm kiếm
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const navigation = useNavigation();

  const [permissions, setPermissions] = useState([]);
  const [userTeamId, setUserTeamId] = useState("");

  // Lấy quyền và teamId từ user
  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setPermissions(user.permissions || []);
          setUserTeamId(user.teamId ? user.teamId.toString() : "");
          setSelectedTeam(user.teamId ? user.teamId.toString() : "");
        }
      } catch (e) {
        setPermissions([]);
        setUserTeamId("");
      }
    })();
  }, []);

  // Chỉ cho phép sửa/xóa nếu có đủ 2 quyền
  const canEditAndDelete = permissions.includes("CAN_EDIT_SHIFT") && permissions.includes("CAN_DELETE_SHIFT");

  // 1. Fetch danh sách Team (chỉ fetch để lấy tên team, không cho chọn team khác)
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await httpApiClient.get("teams");
        const teamsJson = await res.json();
        setTeams(teamsJson.data);
      } catch (error) {
        console.error("Error fetching teams:", error);
        Alert.alert("Error", "Unable to fetch teams");
      }
    };
    fetchTeams();
  }, []);

  // 2. Khi userTeamId thay đổi => fetch Unit
  useEffect(() => {
    if (userTeamId) {
      setSelectedUnit("");
      setSearchResults([]);
      httpApiClient
        .get(`units?teamId=${userTeamId}`)
        .json()
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            setUnits(data.data);
          } else {
            setUnits([]);
          }
        })
        .catch((err) => {
          console.error("Lỗi khi fetch units:", err);
          Alert.alert("Lỗi", "Không thể lấy danh sách đơn vị");
        });
    } else {
      setUnits([]);
      setSearchResults([]);
    }
  }, [userTeamId]);

  // Hiển thị modal DatePicker
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  // Ẩn modal DatePicker
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  // Hàm xử lý khi user confirm ngày trên picker
  const handleConfirmDate = (date) => {
    // Format thành yyyy-MM-dd
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    setShiftDate(formattedDate);
    hideDatePicker();
  };

  // Hàm handleSearch: chỉ search theo team của user
  const handleSearch = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày tìm kiếm!");
      return;
    }
    
    setSearching(true);
    setHasSearched(true);
    
    try {
      let url = "";
      if (scheduleType === "user-shifts") {
        url = `user-shifts/filter?shiftDate=${shiftDate}`;
        if (userTeamId) url += `&teamId=${userTeamId}`;
        if (selectedUnit) url += `&unitId=${selectedUnit}`;
      } else {
        url = `user-flight-shifts/filter-schedules?shiftDate=${shiftDate}`;
        if (userTeamId) url += `&teamId=${userTeamId}`;
        if (selectedUnit) url += `&unitId=${selectedUnit}`;
      }
      const data = await httpApiClient.get(url).json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
    } finally {
      setSearching(false);
    }
  };

  // Xử lý Xóa cho cả hai loại lịch trực
  const handleDelete = async (item) => {
    const isUserShift = scheduleType === "user-shifts";
    if (isUserShift) {
      // Xóa lịch trực theo ca (theo id)
      const id = item.scheduleId;
      if (!id || isNaN(Number(id))) {
        Alert.alert("Lỗi", "ID không hợp lệ!");
        return;
      }
      const endpoint = `user-shifts/${id}`;
      Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch trực này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              await httpApiClient.delete(endpoint);
              setSearchResults(searchResults.filter((i) => Number(i.scheduleId) !== Number(id)));
            } catch (error) {
              console.error("Lỗi khi xóa:", error);
              Alert.alert("Lỗi", error.message);
            }
          },
        },
      ]);
    } else {
      // Xóa lịch trực chuyến bay (theo bộ 3)
      // Kiểm tra kỹ tên trường, có thể là flightId, shiftDate, userId hoặc viết hoa/thường khác
      const flightId = item.flightId || item.flightID || item.FlightId;
      const shiftDateVal = item.shiftDate || item.shift_date || item.ShiftDate;
      const userId = item.userId || item.userID || item.UserId;
      if (!flightId || !shiftDateVal || !userId) {
        console.log("Item khi xóa:", item); // debug
        Alert.alert("Lỗi", "Thiếu thông tin để xóa!");
        return;
      }
      const endpoint = `user-flight-shifts?flightId=${flightId}&shiftDate=${shiftDateVal}&userId=${userId}`;
      Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch trực này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              await httpApiClient.delete(endpoint);
              setSearchResults(searchResults.filter(
                (i) => !(
                  (i.flightId || i.flightID || i.FlightId) === flightId &&
                  (i.shiftDate || i.shift_date || i.ShiftDate) === shiftDateVal &&
                  (i.userId || i.userID || i.UserId) === userId
                )
              ));
            } catch (error) {
              console.error("Lỗi khi xóa:", error);
              Alert.alert("Lỗi", error.message);
            }
          },
        },
      ]);
    }
  };
  // Xử lý Sửa cho cả hai loại lịch trực
  const handleUpdate = (item) => {
    if (scheduleType === "user-shifts") {
      navigation.navigate("UpdateUserShiftScreen", { schedule: item });
    } else {
      navigation.navigate("UpdateUserFlightShiftScreen", { schedule: item });
    }
  };

  // Render item cho từng loại lịch trực
  const renderItem = ({ item }) => (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={20} color="#007AFF" />
          </View>
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{item.userName || "N/A"}</Text>
            <Text style={styles.employeeTeam}>{item.teamName || "N/A"}</Text>
          </View>
        </View>
        <View style={styles.scheduleBadge}>
          <Text style={styles.scheduleType}>
            {scheduleType === "user-shifts" ? "Ca trực" : "Chuyến bay"}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={16} color="#8E8E93" />
            <Text style={styles.infoLabel}>Đơn vị:</Text>
            <Text style={styles.infoValue}>{item.unitName || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#8E8E93" />
            <Text style={styles.infoLabel}>Ngày:</Text>
            <Text style={styles.infoValue}>{item.shiftDate || "N/A"}</Text>
          </View>
        </View>

        {scheduleType === "user-shifts" ? (
          <View style={styles.shiftDetails}>
            <View style={styles.shiftHeader}>
              <Ionicons name="time" size={18} color="#34C759" />
              <Text style={styles.shiftTitle}>{item.shiftCode || "N/A"}</Text>
            </View>
            <View style={styles.shiftInfo}>
              <View style={styles.timeInfo}>
                <Text style={styles.timeText}>
                  {item.startTime && item.endTime
                    ? `${item.startTime} - ${item.endTime}`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={14} color="#FF9500" />
                <Text style={styles.locationText}>{item.location || "N/A"}</Text>
              </View>
              {item.description && (
                <View style={styles.descriptionInfo}>
                  <Ionicons name="document-text" size={14} color="#8E8E93" />
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.flightDetails}>
            <View style={styles.flightHeader}>
              <Ionicons name="airplane" size={18} color="#007AFF" />
              <Text style={styles.flightNumber}>{item.flightNumber || "N/A"}</Text>
            </View>
            <View style={styles.routeInfo}>
              <View style={styles.airport}>
                <Text style={styles.airportCode}>{item.departureAirportCode || "N/A"}</Text>
                <Text style={styles.timeText}>{item.departureTime || "N/A"}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
              <View style={styles.airport}>
                <Text style={styles.airportCode}>{item.arrivalAirportCode || "N/A"}</Text>
                <Text style={styles.timeText}>{item.arrivalTime || "N/A"}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {canEditAndDelete && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleUpdate(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create" size={16} color="white" />
            <Text style={styles.actionButtonText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Layout>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="search" size={28} color="#007AFF" />
            <Text style={styles.title}>Tìm kiếm lịch trực</Text>
          </View>
          <Text style={styles.subtitle}>Tra cứu lịch làm việc theo điều kiện</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Search Form */}
          <View style={styles.formContainer}>
            {/* Loại lịch trực */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="grid" size={16} color="#007AFF" /> Loại lịch trực
              </Text>
              <View style={styles.selectContainer}>
                <SelectModal
                  data={[
                    { label: "Lịch trực theo ca", value: "user-shifts" },
                    { label: "Lịch trực chuyến bay", value: "user-flight-shifts" },
                  ]}
                  value={scheduleType}
                  onChange={setScheduleType}
                  placeholder="Chọn loại lịch trực"
                  title="Chọn loại lịch trực"
                />
              </View>
            </View>

            {/* Ngày tìm kiếm */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="calendar" size={16} color="#007AFF" /> Ngày tìm kiếm
              </Text>
              <TouchableOpacity 
                onPress={showDatePicker} 
                activeOpacity={0.8}
                style={styles.datePickerButton}
              >
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <Text style={[styles.dateText, { color: shiftDate ? "#1D1D1F" : "#8E8E93" }]}>
                  {shiftDate || "Chọn ngày"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Team */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="people" size={16} color="#007AFF" /> Team
              </Text>
              <View style={styles.disabledInput}>
                <Ionicons name="lock-closed" size={16} color="#8E8E93" />
                <Text style={styles.disabledText}>
                  {teams.find(t => t.id.toString() === userTeamId)?.teamName || "Không xác định"}
                </Text>
              </View>
            </View>

            {/* Unit */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="business" size={16} color="#007AFF" /> Đơn vị
              </Text>
              <View style={styles.selectContainer}>
                <SelectModal
                  data={units.map(u => ({ label: u.unitName, value: u.id.toString() }))}
                  value={selectedUnit}
                  onChange={setSelectedUnit}
                  placeholder="Tất cả đơn vị"
                  title="Chọn đơn vị"
                  disabled={!selectedTeam}
                />
              </View>
            </View>

            {/* Search Button */}
            <TouchableOpacity 
              style={[styles.searchButton, searching && styles.searchButtonDisabled]} 
              onPress={handleSearch}
              disabled={searching}
              activeOpacity={0.8}
            >
              {searching ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="search" size={20} color="white" />
              )}
              <Text style={styles.searchButtonText}>
                {searching ? "Đang tìm kiếm..." : "Tìm kiếm"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {hasSearched && (
            <View style={styles.resultsSection}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultCount}>
                  {searchResults.length > 0
                    ? `${searchResults.length} kết quả`
                    : "Không có kết quả"}
                </Text>
                {searchResults.length > 0 && (
                  <View style={styles.resultTypeBadge}>
                    <Text style={styles.resultTypeText}>
                      {scheduleType === "user-shifts" ? "Ca trực" : "Chuyến bay"}
                    </Text>
                  </View>
                )}
              </View>

              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, idx) => (item.scheduleId || item.flightId || idx).toString()}
                  renderItem={renderItem}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContainer}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={64} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>Không có kết quả</Text>
                  <Text style={styles.emptyDescription}>
                    Thử thay đổi điều kiện tìm kiếm
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

export default SearchScheduleScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  selectContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  datePickerButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  disabledInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  disabledText: {
    fontSize: 16,
    color: "#8E8E93",
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0.1,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  resultTypeBadge: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  listContainer: {
    gap: 16,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
  },
  employeeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  employeeTeam: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  scheduleBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scheduleType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34C759",
  },
  cardContent: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 8,
    width: 60,
  },
  infoValue: {
    fontSize: 14,
    color: "#1D1D1F",
    fontWeight: "500",
    flex: 1,
  },
  shiftDetails: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginLeft: 8,
  },
  shiftInfo: {
    gap: 6,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34C759",
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#FF9500",
    marginLeft: 6,
  },
  descriptionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  descriptionText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 6,
    flex: 1,
  },
  flightDetails: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 12,
  },
  flightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  flightNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  airport: {
    alignItems: "center",
    flex: 1,
  },
  airportCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1D1D1F",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#007AFF",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  actionButtonText: {
    color: "white",
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
});