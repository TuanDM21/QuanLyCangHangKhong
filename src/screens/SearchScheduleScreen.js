import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import httpApiClient from "../services";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import SelectModal from "../components/SelectModal";
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
      Alert.alert("Lỗi", "Vui lòng nhập ngày (YYYY-MM-DD)!");
      return;
    }
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
      <Text style={styles.resultText}>
        <Text style={styles.label}>Nhân viên: </Text>
        {item.userName || "N/A"}
      </Text>
      <Text style={styles.resultText}>
        <Text style={styles.label}>Team: </Text>
        {item.teamName || "N/A"}
      </Text>
      <Text style={styles.resultText}>
        <Text style={styles.label}>Unit: </Text>
        {item.unitName || "N/A"}
      </Text>
      <Text style={styles.resultText}>
        <Text style={styles.label}>Ngày: </Text>
        {item.shiftDate || "N/A"}
      </Text>
      {scheduleType === "user-shifts" ? (
        <>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Ca: </Text>
            {item.shiftCode || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Thời gian: </Text>
            {item.startTime && item.endTime
              ? `${item.startTime} - ${item.endTime}`
              : "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Vị trí: </Text>
            {item.location || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Mô tả: </Text>
            {item.description || "N/A"}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Chuyến bay: </Text>
            {item.flightNumber || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Sân bay đi: </Text>
            {item.departureAirportCode || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Sân bay đến: </Text>
            {item.arrivalAirportCode || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Giờ cất cánh: </Text>
            {item.departureTime || "N/A"}
          </Text>
          <Text style={styles.resultText}>
            <Text style={styles.label}>Giờ hạ cánh: </Text>
            {item.arrivalTime || "N/A"}
          </Text>
        </>
      )}
      <View style={styles.actionContainer}>
        {canEditAndDelete && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#007AFF" }]}
              onPress={() => handleUpdate(item)}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#FF3B30", marginTop: 8 }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Xóa</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <Layout>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
      />

      <View style={styles.headerContainer}>
        <Text style={styles.title}>Tìm kiếm lịch trực</Text>

        {/* Chọn loại lịch trực */}
        <Text style={styles.label}>Loại lịch trực:</Text>
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

        <TouchableOpacity onPress={showDatePicker} activeOpacity={1}>
          <View style={styles.input}>
            <Text style={{ color: shiftDate ? "#222" : "#aaa" }}>
              {shiftDate || "Nhập ngày (YYYY-MM-DD)"}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Team:</Text>
        <View style={styles.input}>
          <Text style={{ color: '#222' }}>
            {teams.find(t => t.id.toString() === userTeamId)?.teamName || "(Không xác định)"}
          </Text>
        </View>
        <Text style={styles.label}>Chọn Unit (ID):</Text>
        <SelectModal
          data={units.map(u => ({ label: u.unitName, value: u.id.toString() }))}
          value={selectedUnit}
          onChange={setSelectedUnit}
          placeholder="(Chọn Unit)"
          title="Chọn Unit"
          disabled={!selectedTeam}
        />

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>TÌM KIẾM</Text>
        </TouchableOpacity>

        {/* Hiển thị số lượng kết quả */}
        {shiftDate !== "" && (
          <Text style={styles.resultCountText}>
            {searchResults.length > 0
              ? `Tìm thấy ${searchResults.length} kết quả`
              : "Không có kết quả"}
          </Text>
        )}
      </View>

      {/* Danh sách kết quả */}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item, idx) => (item.scheduleId || item.flightId || idx).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </Layout>
  );
};

export default SearchScheduleScreen;

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: "#CFE2FF",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
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
  label: {
    fontWeight: "600",
    marginBottom: 5,
  },
  resultCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    margin: 10,
    position: "relative",
    paddingRight: 20,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  actionContainer: {
    position: "absolute",
    top: "50%",
    right: 10,
    transform: [{ translateY: -20 }],
    flexDirection: "column",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "600",
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 1,
  },
  resultCountText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
});