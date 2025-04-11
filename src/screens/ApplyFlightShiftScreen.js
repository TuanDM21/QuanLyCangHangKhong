import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const ApplyFlightShiftScreen = () => {
  const navigation = useNavigation();

  // --- State cho Team & Unit ---
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // --- State cho ngày (Date object) ---
  const [shiftDate, setShiftDate] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // --- State cho danh sách chuyến bay ---
  const [flights, setFlights] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");
  const [loadingFlights, setLoadingFlights] = useState(false);

  // --- State cho danh sách nhân viên ---
  // Mỗi user có 2 thuộc tính bổ sung:
  // - assignedShiftCode: hiển thị ca trực (business cũ)
  // - assignedFlight: thông tin ca chuyến bay đã phục vụ (object hoặc null)
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 1. Fetch danh sách Team khi mount
  useEffect(() => {
    fetch("http://10.0.2.2:8080/api/teams")
      .then((res) => res.json())
      .then((data) => {
        console.log("LOG: Fetched teams:", data);
        setTeams(data);
      })
      .catch((err) => console.error("Lỗi fetch teams:", err));
  }, []);

  // 2. Khi chọn Team, fetch danh sách Unit
  useEffect(() => {
    if (selectedTeam) {
      setSelectedUnit("");
      setUsers([]);
      fetch(`http://10.0.2.2:8080/api/units?teamId=${selectedTeam}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("LOG: Fetched units:", data);
          setUnits(data);
        })
        .catch((err) => console.error("Lỗi fetch units:", err));
    } else {
      setUnits([]);
      setUsers([]);
    }
  }, [selectedTeam]);

  // 3. Khi chọn ngày, fetch danh sách chuyến bay của ngày đó
  useEffect(() => {
    if (shiftDate) {
      setLoadingFlights(true);
      const formattedDate = shiftDate.toISOString().split("T")[0];
      console.log("LOG: Formatted shiftDate:", formattedDate);
      fetch(`http://10.0.2.2:8080/api/flights/searchByDate?date=${formattedDate}`)
        .then((res) => {
          if (!res.ok) throw new Error("Không thể lấy danh sách chuyến bay");
          return res.json();
        })
        .then((data) => {
          console.log("LOG: Fetched flights:", data);
          setFlights(data);
        })
        .catch((err) => Alert.alert("Lỗi", err.message))
        .finally(() => setLoadingFlights(false));
    } else {
      setFlights([]);
      setSelectedFlightId("");
    }
  }, [shiftDate]);

  // 4. Tìm kiếm nhân viên: fetch danh sách user và ca trực (assignedShiftCode)
  // Sau đó, nếu đã chọn chuyến bay, merge thông tin ca chuyến bay (assignedFlight) vào danh sách.
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

      // API lấy danh sách nhân viên theo Team/Unit
      let userUrl = `http://10.0.2.2:8080/api/users/filter?teamId=${selectedTeam}`;
      if (selectedUnit) userUrl += `&unitId=${selectedUnit}`;

      // API lấy ca trực (assignedShiftCode)
      let shiftUrl = `http://10.0.2.2:8080/api/user-shifts/filter?shiftDate=${formattedDate}&teamId=${selectedTeam}`;
      if (selectedUnit) shiftUrl += `&unitId=${selectedUnit}`;

      console.log("LOG: Fetch userUrl:", userUrl);
      console.log("LOG: Fetch shiftUrl:", shiftUrl);

      const [resUsers, resUserShifts] = await Promise.all([
        fetch(userUrl),
        fetch(shiftUrl)
      ]);

      if (!resUsers.ok) {
        const text = await resUsers.text();
        throw new Error(text || "Không thể lấy danh sách nhân viên");
      }
      if (!resUserShifts.ok) {
        const text = await resUserShifts.text();
        throw new Error(text || "Không thể lấy danh sách ca trực");
      }

      const dataUsers = await resUsers.json();
      const dataUserShifts = await resUserShifts.json();

      console.log("LOG: Fetched users:", dataUsers);
      console.log("LOG: Fetched user shifts:", dataUserShifts);

      // Merge assignedShiftCode
      const shiftMap = {};
      dataUserShifts.forEach((item) => {
        shiftMap[item.userId] = item.shiftCode;
      });
      let mergedUsers = dataUsers.map((u) => ({
        ...u,
        assignedShiftCode: shiftMap[u.id] || null,
        assignedFlight: null // ban đầu chưa có record ca chuyến bay
      }));

      // Nếu đã chọn chuyến bay, merge luôn thông tin ca chuyến bay (assignedFlight)
      if (selectedFlightId) {
        const flightShiftUrl = `http://10.0.2.2:8080/api/user-flight-shifts?flightId=${selectedFlightId}&shiftDate=${formattedDate}`;
        console.log("LOG: Fetch flightShiftUrl:", flightShiftUrl);
        const resFlightShifts = await fetch(flightShiftUrl);
        if (!resFlightShifts.ok) {
          const text = await resFlightShifts.text();
          throw new Error(text || "Không thể lấy thông tin ca chuyến bay");
        }
        const flightShiftData = await resFlightShifts.json();
        // Tạo map: userId -> flight assignment record (bao gồm flightNumber,...)
        const flightAssignMap = {};
        flightShiftData.forEach((fs) => {
          flightAssignMap[fs.userId] = fs; // fs chứa trường flightNumber, id của record,...
        });
        mergedUsers = mergedUsers.map((u) => ({
          ...u,
          assignedFlight: flightAssignMap[u.id] || null
        }));
      }

      console.log("LOG: Merged Users:", mergedUsers);
      setUsers(mergedUsers);
      setSelectedUserIds([]);
      // Giữ nguyên selectedFlightId để highlight thông tin, cho phép update bằng cách chọn chuyến bay mới
    } catch (error) {
      console.error("Lỗi khi fetch data:", error);
      Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
    } finally {
      setLoadingUsers(false);
    }
  };

  // 5. useEffect: khi selectedFlightId thay đổi, tự động refresh thông tin ca chuyến bay
  useEffect(() => {
    if (shiftDate && selectedFlightId && users.length > 0) {
      const formattedDate = shiftDate.toISOString().split("T")[0];
      fetch(`http://10.0.2.2:8080/api/user-flight-shifts?flightId=${selectedFlightId}&shiftDate=${formattedDate}`)
        .then((res) => {
          if (!res.ok) throw new Error("Không thể lấy thông tin ca chuyến bay");
          return res.json();
        })
        .then((flightShiftData) => {
          const flightAssignMap = {};
          flightShiftData.forEach((fs) => {
            flightAssignMap[fs.userId] = fs;
          });
          const updatedUsers = users.map((u) => ({
            ...u,
            assignedFlight: flightAssignMap[u.id] || null
          }));
          setUsers(updatedUsers);
        })
        .catch((err) => console.error("Lỗi khi refresh flight assignments:", err));
    }
  }, [selectedFlightId]);

  // 6. Hàm để xoá ca chuyến bay của 1 nhân viên (gọi API DELETE)
  const handleRemoveAssignment = async (userId) => {
    if (!shiftDate || !selectedFlightId) return;
    const formattedDate = shiftDate.toISOString().split("T")[0];
    try {
      // Giả sử API DELETE theo query parameters
      const res = await fetch(
        `http://10.0.2.2:8080/api/user-flight-shifts?flightId=${selectedFlightId}&shiftDate=${formattedDate}&userId=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Không thể xoá ca chuyến bay");
      }
      Alert.alert("Thành công", "Xoá ca chuyến bay thành công");
      // Sau khi xoá, refresh lại danh sách bằng cách gọi handleSearchUsers
      await handleSearchUsers();
    } catch (error) {
      console.error("Error removing assignment:", error);
      Alert.alert("Lỗi", error.message || "Không thể xoá ca chuyến bay");
    }
  };

  // 7. Toggle chọn user (chỉ cho phép chọn những user chưa có ca chuyến bay)
  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // 8. Áp dụng ca chuyến bay: gửi payload gồm shiftDate, flightId và danh sách userIds
  const handleApplyShift = async () => {
    if (!shiftDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày!");
      return;
    }
    if (!selectedFlightId) {
      Alert.alert("Lỗi", "Vui lòng chọn chuyến bay!");
      return;
    }
    if (selectedUserIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một nhân viên chưa được áp dụng ca chuyến bay!");
      return;
    }
  
    const formattedDate = shiftDate.toISOString().split("T")[0];
    const payload = {
      shiftDate: formattedDate,
      flightId: selectedFlightId,
      userIds: selectedUserIds
    };
    console.log("LOG: Applying shift with payload:", payload);
  
    try {
      const response = await fetch("http://10.0.2.2:8080/api/user-flight-shifts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Không thể áp dụng ca theo chuyến bay");
      }
      Alert.alert("Thành công", "Áp dụng ca thành công cho chuyến bay!");
      await handleSearchUsers(); // Refresh danh sách nhân viên với thông tin mới
    } catch (error) {
      console.error("Error applying shift:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    }
  };

  // --- Render danh sách nhân viên ---
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);
  
    // Ghép tên hiển thị
    let displayName = item.name;
    if (item.assignedFlight) {
      // Đã phục vụ chuyến bay
      displayName += ` [Đã phục vụ chuyến bay ${item.assignedFlight.flightNumber}]`;
    } else if (item.assignedShiftCode) {
      // Đã có ca trực
      displayName += ` [Ca trực: ${item.assignedShiftCode}]`;
    }
  
    // Nếu nhân viên đã có ca trực (assignedShiftCode) hoặc đã phục vụ chuyến bay (assignedFlight), ta vô hiệu hoá
    const isDisabled = !!item.assignedShiftCode || !!item.assignedFlight;
  
    return (
      <View style={styles.userItem}>
        <TouchableOpacity
          style={[
            { flex: 1 },
            isSelected && styles.selectedUserItem,
            (item.assignedFlight || item.assignedShiftCode) && styles.assignedUserItem
          ]}
          onPress={() => {
            // Chỉ cho phép chọn nếu cả assignedShiftCode và assignedFlight đều null
            if (!item.assignedShiftCode && !item.assignedFlight) {
              toggleUserSelection(item.id);
            }
          }}
          disabled={isDisabled} // Vô hiệu hoá nếu has shiftCode hoặc has flight
        >
          <Text style={styles.userName}>{displayName}</Text>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color="green" />}
        </TouchableOpacity>
  
        {/* Nếu nhân viên đã phục vụ chuyến bay => hiển thị nút X để xóa ca */}
        {item.assignedFlight && (
          <TouchableOpacity onPress={() => handleRemoveAssignment(item.id)}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  

  // --- Render Header: chọn Team, Unit, ngày, chuyến bay & nút tìm kiếm nhân viên ---
  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Áp dụng ca theo chuyến bay</Text>
  
      <Text style={styles.label}>Chọn Team:</Text>
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
  
      <Text style={styles.label}>Chọn Unit:</Text>
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
  
      <Text style={styles.label}>Chọn ngày:</Text>
      <TouchableOpacity onPress={() => setDatePickerVisible(true)} style={styles.dateButton}>
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
  
      {loadingFlights ? (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
      ) : flights.length > 0 ? (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>Chọn chuyến bay:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFlightId}
              onValueChange={(value) => setSelectedFlightId(value)}
            >
              <Picker.Item label="(Chọn chuyến bay)" value="" />
              {flights.map((fl) => (
                <Picker.Item
                  key={fl.id}
                  label={`${fl.flightNumber} (${fl.departureAirport} → ${fl.arrivalAirport})`}
                  value={fl.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </>
      ) : (
        shiftDate && (
          <Text style={styles.infoText}>
            Không có chuyến bay nào được tìm thấy cho ngày đã chọn.
          </Text>
        )
      )}
  
      <Button title="Tìm kiếm nhân viên" onPress={handleSearchUsers} />
      {loadingUsers && (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
      )}
    </View>
  );
  
  // --- Render Footer: nút "Áp dụng ca" ---
  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <Button title="Áp dụng ca" onPress={handleApplyShift} />
    </View>
  );
  
  return (
    <Layout>
      <FlatList
        data={users}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        renderItem={renderUserItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={users.length > 0 ? ListFooter : null}
        contentContainerStyle={styles.listContainer}
        nestedScrollEnabled={true}
      />
    </Layout>
  );
};
  
export default ApplyFlightShiftScreen;
  
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
  dateButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center"
  },
  dateText: {
    fontSize: 16,
    color: "#333"
  },
  userItem: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 5
  },
  selectedUserItem: {
    backgroundColor: "#d0f0c0"
  },
  assignedUserItem: {
    backgroundColor: "#ffe4b5"
  },
  userName: {
    fontSize: 16
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
    marginBottom: 10
  }
});
