import React, { useState, useEffect } from "react";
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

const SearchScheduleScreen = () => {
  // State cho ngày, team, unit
  const [shiftDate, setShiftDate] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");

  // Kết quả tìm kiếm (ScheduleDTO)
  const [searchResults, setSearchResults] = useState([]);

  const navigation = useNavigation();

  // 1. Fetch danh sách Team
  useEffect(() => {
    fetch("http://10.0.2.2:8080/api/teams")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched teams:", data);
        setTeams(data);
      })
      .catch((err) => console.error("Lỗi khi fetch teams:", err));
  }, []);

  // 2. Khi chọn Team => fetch Unit
  useEffect(() => {
    if (selectedTeam) {
      setSelectedUnit("");
      setSearchResults([]);
      fetch(`http://10.0.2.2:8080/api/units?teamId=${selectedTeam}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched units:", data);
          setUnits(data);
        })
        .catch((err) => console.error("Lỗi khi fetch units:", err));
    } else {
      setUnits([]);
      setSearchResults([]);
    }
  }, [selectedTeam]);

  // 3. Hàm handleSearch
  const handleSearch = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày (YYYY-MM-DD)!");
      return;
    }
    try {
      let url = `http://10.0.2.2:8080/api/user-shifts/filter?shiftDate=${shiftDate}`;
      if (selectedTeam) url += `&teamId=${selectedTeam}`;
      if (selectedUnit) url += `&unitId=${selectedUnit}`;

      console.log("Fetch URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Không thể tìm kiếm lịch trực");
      }
      const data = await response.json();
      console.log("Fetched schedules:", data);
      setSearchResults(data);
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
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa lịch trực này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              const res = await fetch(`http://10.0.2.2:8080/api/user-shifts/${scheduleId}`, {
                method: "DELETE"
              });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Không thể xóa lịch trực");
              }
              // Xóa thành công => cập nhật lại danh sách
              setSearchResults(searchResults.filter((item) => item.scheduleId !== scheduleId));
            } catch (error) {
              console.error("Lỗi khi xóa:", error);
              Alert.alert("Lỗi", error.message);
            }
          }
        }
      ]
    );
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
        {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : "N/A"}
      </Text>
      <Text style={styles.resultText}>
        <Text style={styles.label}>Vị trí: </Text>
        {item.location || "N/A"}
      </Text>
      <Text style={styles.resultText}>
        <Text style={styles.label}>Mô tả: </Text>
        {item.description || "N/A"}
      </Text>

      {/* Nút Sửa và Xóa nằm dọc góc dưới bên phải */}
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
      <FlatList
        data={searchResults}
        keyExtractor={(item, index) => (item.scheduleId ? item.scheduleId.toString() : index.toString())}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Tìm kiếm lịch trực</Text>

            {/* Nhập ngày */}
            <TextInput
              style={styles.input}
              placeholder="Nhập ngày (YYYY-MM-DD)"
              value={shiftDate}
              onChangeText={setShiftDate}
            />

            {/* Picker Team */}
            <Text style={styles.label}>Chọn Team (ID):</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedTeam}
                onValueChange={(value) => setSelectedTeam(value)}
              >
                <Picker.Item label="(Chọn Team)" value="" />
                {teams.map((team) => (
                  <Picker.Item key={team.id} label={team.teamName} value={team.id.toString()} />
                ))}
              </Picker>
            </View>

            {/* Picker Unit */}
            <Text style={styles.label}>Chọn Unit (ID):</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedUnit}
                onValueChange={(value) => setSelectedUnit(value)}
                enabled={!!selectedTeam}
              >
                <Picker.Item label="(Chọn Unit)" value="" />
                {units.map((unit) => (
                  <Picker.Item key={unit.id} label={unit.unitName} value={unit.id.toString()} />
                ))}
              </Picker>
            </View>

            <Button title="Tìm kiếm" onPress={handleSearch} />
          </View>
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          searchResults.length === 0 && shiftDate ? (
            <Text style={{ textAlign: "center", marginTop: 20 }}>Không có kết quả</Text>
          ) : null
        }
      />
    </Layout>
  );
};

export default SearchScheduleScreen;

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20
  },
  headerContainer: {
    padding: 20,
    backgroundColor: "#CFE2FF"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center"
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 10
  },
  label: {
    fontWeight: "600",
    marginBottom: 5
  },
  resultCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    margin: 10,
    position: "relative"
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4
  },
  actionContainer: {
    position: "absolute",
    top: "50%", // Đặt ở giữa theo chiều dọc
    right: 10,  // Cách mép phải 10 đơn vị
    transform: [{ translateY: -20 }], // Dịch lên để căn giữa (điều chỉnh giá trị này tùy theo kích thước nút)
    flexDirection: "column",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8, // Khoảng cách giữa các nút
  },
  actionButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "600"
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
    // Cho phép xuống dòng nếu quá dài
    flexWrap: "wrap",
  },

  // Nếu cần, cập nhật thêm cho label hoặc container
  label: {
    fontWeight: "600",
    marginBottom: 5,
    flexWrap: "wrap",
    // width: "100%", // Nếu cần
  },
  resultCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    margin: 10,
    position: "relative",
    // Chừa khoảng trống bên phải để tránh chữ bị che
    paddingRight: 80, // Tùy chỉnh con số này phù hợp kích thước nút
  },
});
