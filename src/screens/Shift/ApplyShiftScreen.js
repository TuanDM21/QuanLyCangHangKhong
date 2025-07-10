import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "../Common/Layout";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Hàm fetch tách biệt, KHÔNG gọi setUnits/setShifts trực tiếp.
// Trả về { units, shifts } cho component.
const fetchUnitsAndShifts = async (teamId) => {
  const unitsRes = await httpApiClient.get(`units?teamId=${teamId}`);
  if (!unitsRes.ok) throw new Error("Không thể fetch units!");
  const unitsJson = await unitsRes.json();

  const shiftsRes = await httpApiClient.get("shifts");
  if (!shiftsRes.ok) throw new Error("Không thể fetch shifts!");
  const shiftsJson = await shiftsRes.json();

  return {
    units: unitsJson.data,
    shifts: shiftsJson.data,
  };
};

const ApplyShiftScreen = () => {
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [shiftDate, setShiftDate] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedShiftCode, setSelectedShiftCode] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userTeamId, setUserTeamId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserTeamId(user.teamId ? user.teamId.toString() : "");
          setSelectedTeam(user.teamId ? user.teamId.toString() : "");
        }
      } catch (e) {
        setUserTeamId("");
      }
    })();
  }, []);

  // 1) Fetch teams
  useEffect(() => {
    (async () => {
      try {
        const res = await httpApiClient.get("teams");
        if (!res.ok) return;
        const json = await res.json();
        setTeams(json.data);
      } catch (err) {
        console.error("Lỗi fetch teams:", err);
      }
    })();
  }, []);

  // 2) Khi chọn team => fetch units + shifts
  useEffect(() => {
    if (!selectedTeam) {
      setUnits([]);
      setUsers([]);
      return;
    }
    fetchUnitsAndShifts(selectedTeam)
      .then(({ units, shifts }) => {
        setUnits(units || []);
        setShifts(shifts || []);
      })
      .catch((err) => console.error("Lỗi fetch units và shifts:", err));
    setSelectedUnit("");
    setUsers([]);
  }, [selectedTeam]);

  // 3) (tùy) fetch tất cả shifts khi mount nếu cần
  useEffect(() => {
    (async () => {
      try {
        const res = await httpApiClient.get("shifts");
        if (!res.ok) return;
        const json = await res.json();
        setShifts(json.data);
      } catch (err) {
        console.error("Lỗi fetch shifts:", err);
      }
    })();
  }, []);

  // Hàm kiểm tra xem user đã phục vụ chuyến bay hay chưa
  const checkUserAssignment = async (userId) => {
    if (!shiftDate) return false;
    const formattedDate = shiftDate.toISOString().split("T")[0];
    const url = `user-flight-shifts/isAssigned?shiftDate=${formattedDate}&userId=${userId}`;
    try {
      const res = await httpApiClient.get(url);
      if (!res.ok) {
        const txt = await res.text();
        console.error(`Error isAssigned for ${userId}:`, txt);
        return false;
      }
      const wrapper = await res.json();
      // wrapper.data.assigned là boolean
      return !!(wrapper.data && wrapper.data.assigned);
    } catch (err) {
      console.error(`checkUserAssignment error ${userId}:`, err);
      return false;
    }
  };

  // 4) Tìm kiếm users + merge shiftCode + assignedFlight
  const handleSearchUsers = async () => {
    if (!selectedTeam) return Alert.alert("Lỗi", "Vui lòng chọn Team!");
    if (!shiftDate) return Alert.alert("Lỗi", "Vui lòng chọn ngày!");
    setLoadingUsers(true);
    try {
      const formatted = shiftDate.toISOString().split("T")[0];
      let userUrl = `users/filter?teamId=${selectedTeam}`;
      if (selectedUnit) userUrl += `&unitId=${selectedUnit}`;
      let shiftUrl = `user-shifts/filter?shiftDate=${formatted}&teamId=${selectedTeam}`;
      if (selectedUnit) shiftUrl += `&unitId=${selectedUnit}`;

      const [rUsers, rShifts] = await Promise.all([
        httpApiClient.get(userUrl),
        httpApiClient.get(shiftUrl),
      ]);
      if (!rUsers.ok) throw new Error(await rUsers.text());
      if (!rShifts.ok) throw new Error(await rShifts.text());

      const { data: usersData } = await rUsers.json();
      const { data: shiftsData } = await rShifts.json();

      // map userId → shiftCode
      const shiftMap = {};
      (Array.isArray(shiftsData) ? shiftsData : []).forEach((s) => { shiftMap[s.userId] = s.shiftCode; });

      // gộp assignedShiftCode & kiểm tra assignedFlight
      const userArr = Array.isArray(usersData?.data)
        ? usersData.data
        : Array.isArray(usersData)
        ? usersData
        : [];

      const merged = await Promise.all(
        userArr.map(async (u) => {
          const assignedShiftCode = shiftMap[u.id] || null;
          const assignedFlight = await checkUserAssignment(u.id);
          return { ...u, assignedShiftCode, assignedFlight };
        })
      );

      setUsers(merged);
      setSelectedUserIds([]);
    } catch (err) {
      console.error("Lỗi khi fetch data:", err);
      Alert.alert("Lỗi", err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserSelection = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 5) Áp dụng ca (unchanged)
  const handleApplyShift = async () => {
    if (!shiftDate) return Alert.alert("Lỗi", "Vui lòng chọn ngày!");
    if (!selectedShiftCode) return Alert.alert("Lỗi", "Vui lòng chọn ca trực!");
    if (!selectedUserIds.length)
      return Alert.alert("Lỗi", "Chọn ít nhất 1 nhân viên!");

    const payload = {
      shiftDate: shiftDate.toISOString().split("T")[0],
      userIds: selectedUserIds,
      shiftCode: selectedShiftCode,
    };
    try {
      const res = await httpApiClient.post("user-shifts/apply-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Alert.alert("Thành công", "Áp dụng ca thành công!");
      await handleSearchUsers();
    } catch (err) {
      console.error("Error applying shift:", err);
      Alert.alert("Lỗi", err.message);
    }
  };

  // Render mỗi user
  const renderUserItem = ({ item }) => {
    const isSel = selectedUserIds.includes(item.id);
    let name = item.name;
    let disabled = false;

    if (item.assignedFlight) {
      name += " [Đã phục vụ chuyến bay]";
      disabled = true;
    } else if (item.assignedShiftCode) {
      name += ` [Ca trực: ${item.assignedShiftCode}]`;
      disabled = true;
    }

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSel && styles.selectedUserItem,
          disabled && styles.assignedUser,
        ]}
        onPress={() => !disabled && toggleUserSelection(item.id)}
        disabled={disabled}
      >
        <Text style={styles.userName}>{name}</Text>
        {isSel && <Ionicons name="checkmark-circle" size={24} color="green" />}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleSection}>
        <View style={styles.titleIcon}>
          <Ionicons name="people" size={24} color="#1E3A8A" />
        </View>
        <Text style={styles.title}>Áp dụng ca làm việc</Text>
      </View>
      
      <View style={styles.formCard}>
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="business" size={16} color="#1E3A8A" /> Team hiện tại
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {teams.find(t => t.id.toString() === userTeamId)?.teamName || "(Không xác định)"}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="location" size={16} color="#1E3A8A" /> Chọn Unit
          </Text>
          <SelectModal
            label=""
            data={units.map(u => ({ label: u.unitName, value: u.id }))}
            value={selectedUnit}
            onChange={setSelectedUnit}
            placeholder="Chọn Unit"
            title="Chọn Unit"
            disabled={!userTeamId}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="calendar" size={16} color="#1E3A8A" /> Chọn ngày
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setDatePickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.dateIcon} />
            <Text style={styles.dateText}>
              {shiftDate ? shiftDate.toISOString().split("T")[0] : "Chọn ngày"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearchUsers}>
          <Ionicons name="search" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.searchButtonText}>Tìm kiếm nhân viên</Text>
        </TouchableOpacity>
        
        {loadingUsers && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>Đang tìm kiếm nhân viên...</Text>
          </View>
        )}
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d) => {
          setShiftDate(d);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <View style={styles.actionCard}>
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="time" size={16} color="#1E3A8A" /> Chọn ca trực
          </Text>
          <SelectModal
            label=""
            data={shifts.map(s => ({ label: s.shiftCode, value: s.shiftCode }))}
            value={selectedShiftCode}
            onChange={setSelectedShiftCode}
            placeholder="Chọn ca trực"
            title="Chọn ca trực"
          />
        </View>
        
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyShift}>
          <Ionicons name="checkmark-circle" size={22} color="white" style={styles.buttonIcon} />
          <Text style={styles.applyButtonText}>Áp dụng ca làm việc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Thay FlatList nhân viên bằng SelectModal multi-select
  const ListUserSelect = () => {
    const disabledUserIds = users.filter(u => u.assignedFlight || u.assignedShiftCode).map(u => u.id);
    return (
      <View style={styles.userSelectContainer}>
        <View style={styles.userSelectHeader}>
          <Ionicons name="people-outline" size={20} color="#1E3A8A" />
          <Text style={styles.userSelectTitle}>Danh sách nhân viên ({users.length})</Text>
        </View>
        <SelectModal
          label=""
          data={users.map(u => ({ 
            label: u.name + (u.assignedFlight ? ' [Đã phục vụ chuyến bay]' : u.assignedShiftCode ? ` [Ca trực: ${u.assignedShiftCode}]` : ''), 
            value: u.id 
          }))}
          multi
          selectedValues={selectedUserIds}
          onChange={setSelectedUserIds}
          placeholder="Chọn nhân viên"
          title="Chọn nhân viên"
          disabledValues={disabledUserIds}
        />
        {selectedUserIds.length > 0 && (
          <View style={styles.selectedInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.selectedText}>Đã chọn {selectedUserIds.length} nhân viên</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Layout>
      <FlatList
        data={[]}
        ListHeaderComponent={() => (
          <>
            {ListHeader()}
            {users.length > 0 && ListUserSelect()}
          </>
        )}
        ListFooterComponent={users.length > 0 ? ListFooter : null}
        contentContainerStyle={styles.listContainer}
        style={{ flex: 1 }}
      />
    </Layout>
  );
};

export default ApplyShiftScreen;

const styles = StyleSheet.create({
  // Header Container
  headerContainer: { 
    padding: 20,
    backgroundColor: "#F8FAFC"
  },
  titleSection: {
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

  // Form Cards
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  formSection: {
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

  // Info Card
  infoCard: {
    backgroundColor: "#F0F9FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  infoText: {
    fontSize: 16,
    color: "#0C4A6E",
    fontWeight: "500",
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

  // Search Button
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // User Selection
  userSelectContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userSelectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  userSelectTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E3A8A",
    marginLeft: 8,
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  selectedText: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "500",
    marginLeft: 6,
  },

  // Footer
  footerContainer: { 
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Apply Button
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // List Container
  listContainer: { 
    paddingBottom: 100,
  },

  // Legacy styles (for backward compatibility)
  userItem: { 
    padding: 16, 
    backgroundColor: "white", 
    marginBottom: 8, 
    borderRadius: 12, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedUserItem: { 
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  assignedUser: { 
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  userName: { 
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
});