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
import Layout from "./Layout";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../services";
import SelectModal from "../components/SelectModal";

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
      <Text style={styles.title}>Áp dụng ca làm việc</Text>
      <SelectModal
        label="Chọn Team"
        data={teams.map(t => ({ label: t.teamName, value: t.id }))}
        value={selectedTeam}
        onChange={setSelectedTeam}
        placeholder="Chọn Team"
        title="Chọn Team"
      />
      <SelectModal
        label="Chọn Unit"
        data={units.map(u => ({ label: u.unitName, value: u.id }))}
        value={selectedUnit}
        onChange={setSelectedUnit}
        placeholder="Chọn Unit"
        title="Chọn Unit"
        disabled={!selectedTeam}
      />
      <Text style={styles.label}>Chọn ngày:</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setDatePickerVisible(true)}
      >
        <Text style={styles.dateText}>
          {shiftDate ? shiftDate.toISOString().split("T")[0] : "Chọn ngày"}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d) => {
          setShiftDate(d);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSearchUsers}>
        <Ionicons name="search" size={20} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.primaryButtonText}>Tìm kiếm nhân viên</Text>
      </TouchableOpacity>
      {loadingUsers && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <SelectModal
        label="Chọn ca trực"
        data={shifts.map(s => ({ label: s.shiftCode, value: s.shiftCode }))}
        value={selectedShiftCode}
        onChange={setSelectedShiftCode}
        placeholder="Chọn ca trực"
        title="Chọn ca trực"
      />
      <TouchableOpacity style={[styles.primaryButton, { marginTop: 10 }]} onPress={handleApplyShift}>
        <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.primaryButtonText}>Áp dụng ca</Text>
      </TouchableOpacity>
    </View>
  );

  // Thay FlatList nhân viên bằng SelectModal multi-select
  const ListUserSelect = () => {
    const disabledUserIds = users.filter(u => u.assignedFlight || u.assignedShiftCode).map(u => u.id);
    return (
      <SelectModal
        label="Chọn nhân viên"
        data={users.map(u => ({ label: u.name + (u.assignedFlight ? ' [Đã phục vụ chuyến bay]' : u.assignedShiftCode ? ` [Ca trực: ${u.assignedShiftCode}]` : ''), value: u.id }))}
        multi
        selectedValues={selectedUserIds}
        onChange={setSelectedUserIds}
        placeholder="Chọn nhân viên"
        title="Chọn nhân viên"
        disabledValues={disabledUserIds}
      />
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
  headerContainer: { padding: 16, backgroundColor: "#CFE2FF" },
  footerContainer: { padding: 16, backgroundColor: "#CFE2FF" },
  listContainer: { paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: "#007AFF" },
  label: { fontSize: 14, marginVertical: 5, fontWeight: "600" },
  pickerContainer: { borderWidth: 1, borderColor: "#ddd", borderRadius: 5, backgroundColor: "white", marginBottom: 10 },
  dateButton: { backgroundColor: "white", padding: 10, borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  dateText: { fontSize: 16, color: "#333" },
  userItem: { padding: 10, backgroundColor: "white", marginBottom: 5, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16 },
  selectedUserItem: { backgroundColor: "#d0f0c0" },
  assignedUser: { backgroundColor: "#ffe4b5" },
  userName: { fontSize: 16 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 13,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});