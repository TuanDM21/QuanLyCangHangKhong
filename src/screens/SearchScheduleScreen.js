// ...
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  Alert, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity 
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import httpApiClient from "../services";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const SearchScheduleScreen = () => {
  // State cho ngày, team, unit
  const [shiftDate, setShiftDate] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");

  // State để điều khiển hiển thị DateTimePicker
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Kết quả tìm kiếm (ScheduleDTO)
  const [searchResults, setSearchResults] = useState([]);

  const navigation = useNavigation();

  // 1. Fetch danh sách Team
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await httpApiClient.get("teams");
        const teamsJson = await res.json();
        console.log("Fetched teams:", teamsJson);
        setTeams(teamsJson.data);
      } catch (error) {
        console.error("Error fetching teams:", error);
        Alert.alert("Error", "Unable to fetch teams");
      }
    };

    fetchTeams();
  }, []);

  // 2. Khi chọn Team => fetch Unit
  useEffect(() => {
    if (selectedTeam) {
      setSelectedUnit("");
      setSearchResults([]);
      httpApiClient
        .get(`units?teamId=${selectedTeam}`)
        .json()
        .then((data) => {
          console.log("Fetched units JSON:", data);
          if (data && Array.isArray(data.data)) {
            setUnits(data.data);
          } else {
            console.warn("Data units is not an array, got:", data);
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
  }, [selectedTeam]);

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

  // 3. Hàm handleSearch
  const handleSearch = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày (YYYY-MM-DD)!");
      return;
    }
    try {
      let url = `user-shifts/filter?shiftDate=${shiftDate}`;
      if (selectedTeam) url += `&teamId=${selectedTeam}`;
      if (selectedUnit) url += `&unitId=${selectedUnit}`;

      console.log("Fetch URL:", url);
      const data = await httpApiClient.get(url).json();
      console.log("Fetched schedules:", data.data);
      setSearchResults(data.data);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
    }
  };

  // Xử lý Sửa
  const handleUpdate = (item) => {
    navigation.navigate("UpdateUserShiftScreen", { schedule: item });
  };

  // Xử lý Xóa
  const handleDelete = async (scheduleId) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch trực này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        onPress: async () => {
          try {
            await httpApiClient.delete(`user-shifts/${scheduleId}`);
            setSearchResults(searchResults.filter((item) => item.scheduleId !== scheduleId));
          } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Alert.alert("Lỗi", error.message);
          }
        },
      },
    ]);
  };

  // Render item
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

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#007AFF" }]}
          onPress={() => handleUpdate(item)}
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#FF3B30", marginTop: 8 }]}
          onPress={() => handleDelete(item.scheduleId)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Layout>
      {/* DateTimePickerModal - đặt ngay trong component để dễ điều khiển */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date" // có thể 'date', 'time', hoặc 'datetime'
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
      />

      <FlatList
        data={searchResults}
        keyExtractor={(item, index) =>
          item.scheduleId ? item.scheduleId.toString() : index.toString()
        }
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Tìm kiếm lịch trực</Text>

            {/* TextInput này thay vì cho gõ tay, ta cho onFocus mở picker, hoặc làm Button riêng */}
            <TouchableOpacity onPress={showDatePicker} activeOpacity={1}>
  <View style={styles.input}>
    <Text style={{ color: shiftDate ? "#222" : "#aaa" }}>
      {shiftDate || "Nhập ngày (YYYY-MM-DD)"}
    </Text>
  </View>
</TouchableOpacity>

            <Text style={styles.label}>Chọn Team (ID):</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedTeam}
                onValueChange={(value) => setSelectedTeam(value)}
              >
                <Picker.Item label="(Chọn Team)" value="" />
                {teams.map((team) => (
                  <Picker.Item
                    key={team.id}
                    label={team.teamName}
                    value={team.id.toString()}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Chọn Unit (ID):</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedUnit}
                onValueChange={(value) => setSelectedUnit(value)}
                enabled={!!selectedTeam}
              >
                <Picker.Item label="(Chọn Unit)" value="" />
                {Array.isArray(units) &&
                  units.map((unit) => (
                    <Picker.Item
                      key={unit.id}
                      label={unit.unitName}
                      value={unit.id.toString()}
                    />
                  ))}
              </Picker>
            </View>

            <Button title="Tìm kiếm" onPress={handleSearch} />
          </View>
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          searchResults.length === 0 && shiftDate ? (
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              Không có kết quả
            </Text>
          ) : null
        }
      />
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
    paddingRight: 80,
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
});
