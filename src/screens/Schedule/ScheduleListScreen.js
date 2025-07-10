import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const fetchSchedules = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await httpApiClient.get("shifts");
      const json = await res.json();
      setSchedules(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch trực");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules(true);
  }, []);

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
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={20} color="#007AFF" />
          </View>
          <Text style={styles.scheduleId}>{item.shiftCode}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Hoạt động</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#34C759" />
          <Text style={styles.infoText}>{item.startTime} - {item.endTime}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#FF9500" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="document-text" size={16} color="#8E8E93" />
          <Text style={styles.infoText}>{item.description}</Text>
        </View>
      </View>

      {(canEdit || canDelete) && (
        <View style={styles.actionBar}>
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleUpdate(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cập nhật</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.actionButtonText}>Xóa</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Layout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="list" size={28} color="#007AFF" />
            <Text style={styles.title}>Danh sách lịch trực</Text>
          </View>
          <Text style={styles.subtitle}>Quản lý và theo dõi ca trực</Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo mã ca, địa điểm, mô tả..."
              placeholderTextColor="#8E8E93"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchText("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.resultInfo}>
            <Text style={styles.resultText}>
              {filteredSchedules.length > 0
                ? `${filteredSchedules.length} kết quả`
                : 'Không có kết quả'}
            </Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* List Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSchedules}
            keyExtractor={(item, idx) => `shift-${item.id}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#007AFF"]}
                tintColor="#007AFF"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>Không có lịch trực</Text>
                <Text style={styles.emptyDescription}>
                  {searchText ? "Thử tìm kiếm với từ khóa khác" : "Chưa có lịch trực nào được tạo"}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Layout>
  );
};

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
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1D1D1F",
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  resultInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  resultText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginLeft: 12,
  },
  statusBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "600",
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: "#1D1D1F",
    marginLeft: 8,
    flex: 1,
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
    minWidth: 80,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default ScheduleListScreen;