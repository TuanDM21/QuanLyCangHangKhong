import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "../Common/Layout";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import httpApiClient from "../../services";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [permissions, setPermissions] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setPermissions(user.permissions || []);
        }
      } catch (e) {
        setPermissions([]);
      }
    })();
  }, []);

  const canEdit = permissions.includes("CAN_EDIT_SHIFT");
  const canDelete = permissions.includes("CAN_DELETE_SHIFT");

  // Chỉ fetch ca trực
  const fetchSchedules = async () => {
    try {
      const res = await httpApiClient.get("shifts");
      const json = await res.json();
      setSchedules(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [])
  );

  const handleDelete = async (item) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa lịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        onPress: async () => {
          try {
            await httpApiClient.delete(`shifts/${item.id}`);
            setSchedules((prev) => prev.filter((i) => i.id !== item.id));
          } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể kết nối đến server");
          }
        },
      },
    ]);
  };

  const handleUpdate = (item) => {
    navigation.navigate("UpdateSchedule", { schedule: item });
  };

  // Chỉ filter ca trực
  const filteredSchedules = schedules.filter((item) => {
    const search = searchText.toLowerCase();
    const shiftCode = item.shiftCode ? item.shiftCode.toLowerCase() : "";
    const location = item.location ? item.location.toLowerCase() : "";
    const description = item.description ? item.description.toLowerCase() : "";
    return (
      shiftCode.includes(search) ||
      location.includes(search) ||
      description.includes(search)
    );
  });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={24} color="#007AFF" />
        <Text style={styles.scheduleId}>{item.shiftCode}</Text>
      </View>
      <Text style={styles.text}>
        🕒 {item.startTime} - {item.endTime}
      </Text>
      <Text style={styles.text}>📍 {item.location}</Text>
      <Text style={styles.text}>📝 {item.description}</Text>
      <View style={styles.buttonContainer}>
        {canEdit && (
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={() => handleUpdate(item)}
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Cập nhật</Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Xóa</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Danh sách lịch trực</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo mã ca, địa điểm, mô tả..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <Text style={{textAlign: 'center', color: '#007AFF', fontWeight: '600', marginBottom: 8}}>
          {filteredSchedules.length > 0
            ? `Tìm thấy ${filteredSchedules.length} lịch trực`
            : 'Không có kết quả'}
        </Text>
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item, idx) => `shift-${item.id}`}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#888'}}>Không có kết quả</Text>}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  searchInput: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  scheduleId: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#007AFF",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 5,
    minWidth: 80,
    justifyContent: "center",
  },
  updateButton: {
    backgroundColor: "#007AFF",
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    marginLeft: 5,
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
  },
});

export default ScheduleListScreen;