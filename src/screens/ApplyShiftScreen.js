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

const ApplyShiftScreen = () => {
  // --- State cho danh sách Team, Unit ---
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);

  // Lựa chọn Team/Unit
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // Ngày (kiểu Date) – chọn bằng DateTimePickerModal
  const [shiftDate, setShiftDate] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Danh sách Users
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Danh sách Shift (ca trực)
  const [shifts, setShifts] = useState([]);
  const [selectedShiftCode, setSelectedShiftCode] = useState("");

  // Loading state
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 1. Fetch danh sách Team khi mount
  useEffect(() => {
    const fetchTeams = async () => {
      const teamsResponse = await httpApiClient.get("teams");
      if (!teamsResponse.ok) {
        console.error("Lỗi fetch teams:", teamsResponse.status);
        return;
      }
      const teamsJson = await teamsResponse.json();
      setTeams(teamsJson.data);
    };

    fetchTeams();
  }, []);

  // 2. Khi chọn Team, fetch Unit
  useEffect(() => {
    if (selectedTeam) {
      fetchUnitsAndShifts(selectedTeam)
        .then(({ units, shifts }) => {
          setUnits(units);
          setShifts(shifts);
        })
        .catch((err) => console.error("Lỗi fetch units và shifts:", err));
    } else {
      setUnits([]);
      setUsers([]);
    }
  }, [selectedTeam]);

  // 3. Fetch danh sách Shift khi mount
  useEffect(() => {
    httpApiClient
      .get("shifts")
      .then(setShifts)
      .catch((err) => console.error("Lỗi fetch shifts:", err));
  }, []);

  // Hàm kiểm tra nếu 1 user đã phục vụ chuyến bay (dựa trên shiftDate và userId)
  const checkUserAssignment = async (userId) => {
    if (!shiftDate) return false;
    const formattedDate = shiftDate.toISOString().split("T")[0];
    const url = `user-flight-shifts/isAssigned?shiftDate=${formattedDate}&userId=${userId}`;
    try {
      const res = await httpApiClient.get(url);
      console.log(
        `checkUserAssignment: userId=${userId}, status=${res.status}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error response for userId=${userId}:`, errorText);
        throw new Error("Lỗi kiểm tra ca chuyến bay");
      }
      const data = await res.json();
      console.log(`isAssigned data for userId=${userId}:`, data);
      return data.assigned; // true nếu đã phục vụ chuyến bay, false nếu chưa
    } catch (error) {
      console.error(`checkUserAssignment error for userId=${userId}:`, error);
      return false;
    }
  };

  // 4. Tìm kiếm user & lấy thông tin ca trực (assignedShiftCode), sau đó với mỗi user, kiểm tra assignment chuyến bay
  const handleSearchUsers = async () => {
    if (!selectedTeam) {
      Alert.alert("Lỗi", "Vui lòng chọn Team!");
      return;
    }
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày!");
      return;
    }
    setLoadingUsers(true);
    try {
      const formattedDate = shiftDate.toISOString().split("T")[0];

      // API lấy danh sách user theo Team/Unit
      let userUrl = `users/filter?teamId=${selectedTeam}`;
      if (selectedUnit) userUrl += `&unitId=${selectedUnit}`;

      // API lấy danh sách user-shift (để lấy ca trực)
      let shiftUrl = `user-shifts/filter?shiftDate=${formattedDate}&teamId=${selectedTeam}`;
      if (selectedUnit) shiftUrl += `&unitId=${selectedUnit}`;

      console.log("Fetch userUrl:", userUrl);
      console.log("Fetch shiftUrl:", shiftUrl);

      const [resUsers, resUserShifts] = await Promise.all([
        httpApiClient.get(userUrl),
        httpApiClient.get(shiftUrl),
      ]);
      if (!resUsers.ok) {
        throw new Error(
          (await resUsers.text()) || "Không thể lấy danh sách nhân viên"
        );
      }
      if (!resUserShifts.ok) {
        throw new Error(
          (await resUserShifts.text()) || "Không thể lấy danh sách ca trực"
        );
      }

      const dataUsers = await resUsers.json();
      const dataUserShifts = await resUserShifts.json();

      // Xây dựng map: userId => shiftCode
      const shiftMap = {};
      dataUserShifts.forEach((item) => {
        shiftMap[item.userId] = item.shiftCode;
      });

      let mergedUsers = dataUsers.map((u) => {
        const assignedShiftCode = shiftMap[u.id] || null;
        return {
          ...u,
          assignedShiftCode,
          assignedFlight: false, // Ban đầu chưa phục vụ chuyến bay
        };
      });

      // Với mỗi user, kiểm tra xem đã phục vụ chuyến bay hay chưa thông qua endpoint isAssigned
      const updatedUsers = await Promise.all(
        mergedUsers.map(async (user) => {
          const assigned = await checkUserAssignment(user.id);
          return { ...user, assignedFlight: assigned };
        })
      );

      console.log("Merged Users:", updatedUsers);
      setUsers(updatedUsers);
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Lỗi khi fetch data:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
    } finally {
      setLoadingUsers(false);
    }
  };

  // 5. Toggle user selection (chỉ cho phép chọn nếu chưa có ca trực và chưa phục vụ chuyến bay)
  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // 6. Ví dụ hàm áp dụng ca (giữ nguyên logic gửi payload)
  const handleApplyShift = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày!");
      return;
    }
    if (selectedUserIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một nhân viên!");
      return;
    }
    if (!selectedShiftCode) {
      Alert.alert("Lỗi", "Vui lòng chọn ca trực!");
      return;
    }
    const formattedDate = shiftDate.toISOString().split("T")[0];
    const payload = {
      shiftDate: formattedDate,
      userIds: selectedUserIds,
      shiftCode: selectedShiftCode,
    };
    console.log("Applying shift with payload:", payload);
    try {
      const response = await httpApiClient.post("user-shifts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Không thể áp dụng ca");
      }
      Alert.alert("Thành công", "Áp dụng ca thành công!");
      setSelectedUserIds([]);
      await handleSearchUsers(); // Refresh danh sách user sau khi áp dụng
    } catch (error) {
      console.error("Error applying shift:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    }
  };

  // --- Render item ---
  // Nếu user đã có assignedShiftCode hoặc đã phục vụ chuyến bay, disable chọn và hiển thị thông báo tương ứng.
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);
    let displayName = item.name;
    let disableSelection = false;
    if (item.assignedFlight) {
      displayName += " [Đã phục vụ chuyến bay]";
      disableSelection = true;
    } else if (item.assignedShiftCode) {
      displayName += ` [Ca trực: ${item.assignedShiftCode}]`;
      disableSelection = true;
    }
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.selectedUserItem,
          (item.assignedFlight || item.assignedShiftCode) &&
            styles.assignedUser,
        ]}
        onPress={() => {
          if (!disableSelection) toggleUserSelection(item.id);
        }}
        disabled={disableSelection}
      >
        <Text style={styles.userName}>{displayName}</Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="green" />
        )}
      </TouchableOpacity>
    );
  };

  // --- Render Header ---
  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Áp dụng ca làm việc</Text>
      <Text style={styles.label}>Chọn Team:</Text>
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
      <Text style={styles.label}>Chọn Unit:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedUnit}
          onValueChange={(value) => setSelectedUnit(value)}
          enabled={!!selectedTeam}
        >
          <Picker.Item label="(Chọn Unit)" value="" />
          {units.map((unit) => (
            <Picker.Item
              key={unit.id}
              label={unit.unitName}
              value={unit.id.toString()}
            />
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
        onConfirm={(date) => {
          setShiftDate(date);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
      <Button title="Tìm kiếm nhân viên" onPress={handleSearchUsers} />
      {loadingUsers && (
        <ActivityIndicator
          size="small"
          color="#007AFF"
          style={{ marginTop: 10 }}
        />
      )}
    </View>
  );

  // --- Render Footer ---
  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <Button title="Áp dụng ca" onPress={handleApplyShift} />
    </View>
  );

  return (
    <Layout>
      <FlatList
        data={users}
        keyExtractor={(item) => (item.id ? item.id.toString() : String(item))}
        renderItem={renderUserItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={users.length > 0 ? ListFooter : null}
        contentContainerStyle={styles.listContainer}
      />
    </Layout>
  );
};

export default ApplyShiftScreen;

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    backgroundColor: "#CFE2FF",
  },
  footerContainer: {
    padding: 16,
    backgroundColor: "#CFE2FF",
  },
  listContainer: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#007AFF",
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  userItem: {
    padding: 10,
    backgroundColor: "white",
    marginBottom: 5,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
  },
  selectedUserItem: {
    backgroundColor: "#d0f0c0",
  },
  assignedUser: {
    backgroundColor: "#ffe4b5",
  },
  userName: {
    fontSize: 16,
  },
});

const fetchUnitsAndShifts = async (teamId) => {
  const units = await httpApiClient.get(`units?teamId=${teamId}`);
  const unitsJson = await units.json();
  setUnits(unitsJson.data);

  const shifts = await httpApiClient.get("shifts");
  const shiftsJson = await shifts.json();
  setShifts(shiftsJson.data);
};
