import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";

const ApplyShiftScreen = () => {
  // State cho danh sách Team, Unit
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);

  // Lựa chọn Team/Unit
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // Ngày nhập (YYYY-MM-DD)
  const [shiftDate, setShiftDate] = useState("");

  // Danh sách Users sau khi tìm kiếm
  const [users, setUsers] = useState([]);
  // Mảng userId được chọn (multi-select)
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Danh sách Shift (ca trực)
  const [shifts, setShifts] = useState([]);
  // Ca trực được chọn (theo shiftCode)
  const [selectedShiftCode, setSelectedShiftCode] = useState("");

  // 1. Fetch danh sách Team khi mount
  useEffect(() => {
    fetch("http://10.0.2.2:8080/api/teams")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched teams:", data);
        setTeams(data);
      })
      .catch((err) => console.error("Lỗi fetch teams:", err));
  }, []);

  // 2. Khi chọn Team => fetch Unit
  useEffect(() => {
    if (selectedTeam) {
      setSelectedUnit("");
      setUsers([]);
      fetch(`http://10.0.2.2:8080/api/units?teamId=${selectedTeam}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched units:", data);
          setUnits(data);
        })
        .catch((err) => console.error("Lỗi fetch units:", err));
    } else {
      setUnits([]);
      setUsers([]);
    }
  }, [selectedTeam]);

  // 3. Fetch danh sách Shift khi mount
  useEffect(() => {
    fetch("http://10.0.2.2:8080/api/shifts")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched shifts:", data);
        setShifts(data);
      })
      .catch((err) => console.error("Lỗi fetch shifts:", err));
  }, []);

  // 4. Tìm kiếm user & lấy thông tin shift đã gán
  const handleSearchUsers = async () => {
    if (!selectedTeam) {
      Alert.alert("Lỗi", "Vui lòng chọn Team!");
      return;
    }
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày (YYYY-MM-DD)!");
      return;
    }

    try {
      // API 1: Lấy danh sách user
      let userUrl = `http://10.0.2.2:8080/api/users/filter?teamId=${selectedTeam}`;
      if (selectedUnit) userUrl += `&unitId=${selectedUnit}`;

      // API 2: Lấy danh sách user-shift theo ngày
      let shiftUrl = `http://10.0.2.2:8080/api/user-shifts/filter?shiftDate=${shiftDate}&teamId=${selectedTeam}`;
      if (selectedUnit) shiftUrl += `&unitId=${selectedUnit}`;

      console.log("Fetch userUrl:", userUrl);
      console.log("Fetch shiftUrl:", shiftUrl);

      // Gọi song song 2 API
      const [resUsers, resUserShifts] = await Promise.all([
        fetch(userUrl),
        fetch(shiftUrl)
      ]);

      if (!resUsers.ok) {
        const text = await resUsers.text();
        throw new Error(text || "Không thể tìm kiếm danh sách nhân viên");
      }
      if (!resUserShifts.ok) {
        const text = await resUserShifts.text();
        throw new Error(text || "Không thể lấy danh sách ca của nhân viên");
      }

      const dataUsers = await resUsers.json();
      const dataUserShifts = await resUserShifts.json();

      console.log("Fetched users:", dataUsers);
      console.log("Fetched userShifts:", dataUserShifts);

      // Xây dựng map userId => shiftCode (nếu user đã có ca)
      // dataUserShifts là mảng ScheduleDTO => có userId, shiftCode
      const shiftMap = {};
      dataUserShifts.forEach((item) => {
        // Mỗi item đại diện cho 1 user-shift
        // userId, shiftCode
        shiftMap[item.userId] = item.shiftCode; 
      });

      // Gán assignedShiftCode cho mỗi user
      const mergedUsers = dataUsers.map((u) => {
        const assignedShiftCode = shiftMap[u.id] || null;
        return {
          ...u,
          assignedShiftCode
        };
      });

      setUsers(mergedUsers);
      setSelectedUserIds([]); // Reset lựa chọn
    } catch (error) {
      console.error("Lỗi khi fetch data:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
    }
  };

  // 5. Toggle user
  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // 6. Áp dụng ca
  const handleApplyShift = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày (YYYY-MM-DD)!");
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

    const payload = {
      shiftDate,
      userIds: selectedUserIds,
      shiftCode: selectedShiftCode
    };

    try {
      const response = await fetch("http://10.0.2.2:8080/api/user-shifts/apply-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Không thể áp dụng ca");
      }
      Alert.alert("Thành công", "Áp dụng ca thành công!");
      setSelectedUserIds([]);
      setShiftDate("");
      setSelectedShiftCode("");
      // Sau khi áp dụng thành công, bạn có thể gọi lại handleSearchUsers() 
      // nếu muốn cập nhật lại danh sách user (hiển thị shift code mới).
    } catch (error) {
      console.error("Error applying shift:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    }
  };

  // Render item
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);
    // Nếu user đã có assignedShiftCode => hiển thị code ở cuối tên
    const displayName = item.assignedShiftCode
      ? `${item.name} - ${item.assignedShiftCode}`
      : item.name;

    // Nếu user đã có assignedShiftCode => đổi màu nền 
    // (có thể dùng isAssignedStyle, tùy ý)
    const userItemStyle = [
      styles.userItem,
      isSelected && styles.selectedUserItem,
      item.assignedShiftCode && styles.assignedUser // highlight user
    ];

    return (
      <TouchableOpacity
        style={userItemStyle}
        onPress={() => toggleUserSelection(item.id)}
      >
        <Text style={styles.userName}>{displayName}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color="green" />}
      </TouchableOpacity>
    );
  };

  // ListHeader: chứa Team, Unit, Ngày, Tìm kiếm
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

      <Text style={styles.label}>Nhập ngày (YYYY-MM-DD):</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={shiftDate}
        onChangeText={setShiftDate}
      />

      <Button title="Tìm kiếm nhân viên" onPress={handleSearchUsers} />

      {/* Nếu có user, hiển thị picker ca trực */}
      {users.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>Chọn ca trực:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedShiftCode}
              onValueChange={(value) => setSelectedShiftCode(value)}
            >
              <Picker.Item label="(Chọn ca)" value="" />
              {shifts.map((shift) => (
                <Picker.Item
                  key={shift.id}
                  label={shift.shiftCode}
                  value={shift.shiftCode}
                />
              ))}
            </Picker>
          </View>
        </>
      )}
    </View>
  );

  // ListFooter: chứa nút "Áp dụng ca"
  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <Button title="Áp dụng ca" onPress={handleApplyShift} />
    </View>
  );

  return (
    <Layout>
      <View style={{ flex: 1 }}>
        <FlatList
          data={users}
          keyExtractor={(item, index) =>
            item.id ? item.id.toString() : index.toString()
          }
          renderItem={renderUserItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={users.length > 0 ? ListFooter : null}
          contentContainerStyle={styles.listContainer}
          nestedScrollEnabled={true} // Cho phép cuộn lồng nếu cần
        />
      </View>
    </Layout>
  );
};

export default ApplyShiftScreen;

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    backgroundColor: "#CFE2FF"
  },
  footerContainer: {
    padding: 16,
    backgroundColor: "#CFE2FF"
  },
  listContainer: {
    paddingBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#007AFF"
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "600"
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 10
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  userItem: {
    padding: 10,
    backgroundColor: "white",
    marginBottom: 5,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16
  },
  selectedUserItem: {
    backgroundColor: "#d0f0c0"
  },
  // Highlight user đã có assignedShiftCode
  assignedUser: {
    backgroundColor: "#ffe4b5" // Màu nền nhạt (Beige) để phân biệt
  },
  userName: {
    fontSize: 16
  }
});
