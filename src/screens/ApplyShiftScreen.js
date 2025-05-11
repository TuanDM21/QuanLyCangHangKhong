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
      <Text style={styles.label}>Chọn Team:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedTeam}
          onValueChange={(v) => setSelectedTeam(v)}
        >
          <Picker.Item label="(Chọn Team)" value="" />
          {teams.map((t) => (
            <Picker.Item key={t.id} label={t.teamName} value={t.id.toString()} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Chọn Unit:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedUnit}
          onValueChange={(v) => setSelectedUnit(v)}
          enabled={!!selectedTeam}
        >
          <Picker.Item label="(Chọn Unit)" value="" />
          {units.map((u) => (
            <Picker.Item key={u.id} label={u.unitName} value={u.id.toString()} />
          ))}
        </Picker>
      </View>

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

      <Button title="Tìm kiếm nhân viên" onPress={handleSearchUsers} />
      {loadingUsers && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <Picker
        selectedValue={selectedShiftCode}
        onValueChange={(v) => setSelectedShiftCode(v)}
      >
        <Picker.Item label="(Chọn ca)" value="" />
        {shifts.map((s) => (
          <Picker.Item key={s.id} label={s.shiftCode} value={s.shiftCode} />
        ))}
      </Picker>
      <Button title="Áp dụng ca" onPress={handleApplyShift} />
    </View>
  );

  return (
    <Layout>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={users.length ? ListFooter : null}
        contentContainerStyle={styles.listContainer}
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
});