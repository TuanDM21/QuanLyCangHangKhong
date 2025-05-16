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
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../services";
import SelectModal from "../components/SelectModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ApplyFlightShiftScreen = () => {
  const navigation = useNavigation();

  // --- State cho Team & Unit ---
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [userTeamId, setUserTeamId] = useState("");

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

  const fetchTeams = async () => {
    try {
      const response = await httpApiClient.get("teams");
      const teamsJson = await response.json();
      setTeams(teamsJson.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchUnits = async (teamId) => {
    try {
      const response = await httpApiClient.get(`units?teamId=${teamId}`);
      const unitsJson = await response.json();
      return unitsJson.data;
    } catch (error) {
      console.error("Error fetching units:", error);
      return [];
    }
  };

  const fetchFlightsByDate = async (date) => {
    try {
      const response = await httpApiClient.get(
        `flights/searchByDate?date=${date}`
      );
      const flightsJson = await response.json();
      return flightsJson.data;
    } catch (error) {
      console.error("Error fetching flights:", error);
      return [];
    }
  };

  const fetchUserAndShiftData = async (userUrl, shiftUrl) => {
    const [userResponse, shiftResponse] = await Promise.all([
      httpApiClient.get(userUrl),
      httpApiClient.get(shiftUrl),
    ]);
    const userJson = await userResponse.json();
    const shiftJson = await shiftResponse.json();
    return { 
      users: userJson.data,
      shifts: shiftJson.data 
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchTeams();
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      setSelectedUnit("");
      setUsers([]);
      fetchUnits(selectedTeam)
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

  useEffect(() => {
    if (shiftDate) {
      setLoadingFlights(true);
      const formattedDate = shiftDate.toISOString().split("T")[0];
      console.log("LOG: Formatted shiftDate:", formattedDate);
      fetchFlightsByDate(formattedDate)
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
    let userUrl = `users/filter?teamId=${selectedTeam}`;
    if (selectedUnit) userUrl += `&unitId=${selectedUnit}`;
    let shiftUrl = `user-shifts/filter?shiftDate=${formattedDate}&teamId=${selectedTeam}`;
    if (selectedUnit) shiftUrl += `&unitId=${selectedUnit}`;
    console.log("LOG: Fetch userUrl:", userUrl);
    console.log("LOG: Fetch shiftUrl:", shiftUrl);
    const { users: dataUsers, shifts: dataUserShifts } = await fetchUserAndShiftData(userUrl, shiftUrl);
    console.log("LOG: Fetched users:", dataUsers);
    console.log("LOG: Fetched user shifts:", dataUserShifts);
    const shiftMap = {};
    (Array.isArray(dataUserShifts) ? dataUserShifts : []).forEach((item) => {
      shiftMap[item.userId] = item.shiftCode;
    });
    // Sửa ở đây: kiểm tra dataUsers là mảng hay object có .data
    let userArray = Array.isArray(dataUsers)
      ? dataUsers
      : (dataUsers && Array.isArray(dataUsers.data))
        ? dataUsers.data
        : [];
    let mergedUsers = userArray.map((u) => ({
      ...u,
      assignedShiftCode: shiftMap[u.id] || null,
      assignedFlight: null,
    }));
    if (selectedFlightId) {
      const flightShiftUrl = `user-flight-shifts/shifts?flightId=${selectedFlightId}&date=${formattedDate}`;
      console.log("LOG: Fetch flightShiftUrl:", flightShiftUrl);
      const resFlightShifts = await httpApiClient.get(flightShiftUrl);
      if (!resFlightShifts.ok) {
        const errorJson = await resFlightShifts.json();
        throw new Error(errorJson.message || "Không thể lấy thông tin ca chuyến bay");
      }
      const rawJson = await resFlightShifts.json();
      console.log("LOG: Raw flight shift JSON:", rawJson);
      const flightShiftData = rawJson.data;
      if (!Array.isArray(flightShiftData)) {
        console.error("flightShiftData is not an array:", flightShiftData);
        mergedUsers = mergedUsers.map((u) => ({ ...u, assignedFlight: null }));
      } else {
        const flightAssignMap = {};
        flightShiftData.forEach((fs) => {
          flightAssignMap[fs.userId] = fs;
        });
        mergedUsers = mergedUsers.map((u) => ({
          ...u,
          assignedFlight: flightAssignMap[u.id] || null,
        }));
      }
    }
    console.log("LOG: Merged Users:", mergedUsers);
    setUsers(mergedUsers);
    setSelectedUserIds([]);
  } catch (error) {
    console.error("Lỗi khi fetch data:", error);
    Alert.alert("Lỗi", error.message || "Có lỗi khi kết nối đến server");
  } finally {
    setLoadingUsers(false);
  }
};

  useEffect(() => {
    const fetchFlightShiftData = async () => {
      if (shiftDate && selectedFlightId && users.length > 0) {
        const formattedDate = shiftDate.toISOString().split("T")[0];
        try {
          const res = await httpApiClient.get(
            `user-flight-shifts/shifts?flightId=${selectedFlightId}&date=${formattedDate}`
          );
          console.log("Response status:", res.status, res.statusText);
          const rawJson = await res.json();
          console.log("Raw JSON:", rawJson);
          const flightShiftArray = rawJson.data;
          console.log("Flight shift array:", flightShiftArray);
          if (!Array.isArray(flightShiftArray)) {
            console.error("flightShiftArray is not an array:", flightShiftArray);
            return;
          }
          const flightAssignMap = {};
          flightShiftArray.forEach((fs) => {
            flightAssignMap[fs.userId] = fs;
          });
          const updatedUsers = users.map((u) => ({
            ...u,
            assignedFlight: flightAssignMap[u.id] || null,
          }));
          setUsers(updatedUsers);
        } catch (err) {
          console.error("Lỗi khi refresh flight assignments:", err);
        }
      }
    };
    fetchFlightShiftData();
  }, [selectedFlightId]);

  const handleRemoveAssignment = async (userId) => {
    if (!shiftDate || !selectedFlightId) return;
    const formattedDate = shiftDate.toISOString().split("T")[0];
    try {
      await httpApiClient.delete(
        `user-flight-shifts?flightId=${selectedFlightId}&shiftDate=${formattedDate}&userId=${userId}`
      );
      Alert.alert("Thành công", "Xoá ca chuyến bay thành công");
      await handleSearchUsers();
    } catch (error) {
      console.error("Error removing assignment:", error);
      Alert.alert("Lỗi", error.message || "Không thể xoá ca chuyến bay");
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // *** Sửa payload: đổi key "date" hoặc "shiftDate" thành "flightDate" ***
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
      userIds: selectedUserIds,
    };
    console.log("LOG: Applying shift with payload:", payload);
    try {
      const response = await httpApiClient.post("user-flight-shifts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(
          errorJson.message || "Không thể áp dụng ca theo chuyến bay"
        );
      }
      Alert.alert("Thành công", "Áp dụng ca thành công cho chuyến bay!");
      await handleSearchUsers();
    } catch (error) {
      console.error("Error applying shift:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    }
  };

  // SelectModal cho chọn chuyến bay
  const FlightSelectModal = () => (
    <SelectModal
      label="Chọn chuyến bay"
      data={flights.map(fl => ({ label: `${fl.flightNumber} (${fl.departureAirport.airportCode} → ${fl.arrivalAirport.airportCode})`, value: fl.id.toString() }))}
      value={selectedFlightId}
      onChange={setSelectedFlightId}
      placeholder="Chọn chuyến bay"
      title="Chọn chuyến bay"
      disabled={flights.length === 0}
    />
  );

  // SelectModal cho chọn nhân viên (multi-select, disable nếu đã có ca hoặc đã phục vụ chuyến bay)
  const UserSelectModal = () => {
    const disabledUserIds = users.filter(u => u.assignedFlight || u.assignedShiftCode).map(u => u.id);
    return (
      <SelectModal
        label="Chọn nhân viên"
        data={users.map(u => ({ label: u.name + (u.assignedFlight ? ` [Đã phục vụ chuyến bay${u.assignedFlight.flightNumber ? ' ' + u.assignedFlight.flightNumber : ''}]` : u.assignedShiftCode ? ` [Ca trực: ${u.assignedShiftCode}]` : ''), value: u.id }))}
        multi
        selectedValues={selectedUserIds}
        onChange={setSelectedUserIds}
        placeholder="Chọn nhân viên"
        title="Chọn nhân viên"
        disabledValues={disabledUserIds}
      />
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Áp dụng ca theo chuyến bay</Text>
      <Text style={styles.label}>Team:</Text>
      <View style={styles.dateButton}>
        <Text style={styles.dateText}>
          {teams.find(t => t.id.toString() === userTeamId)?.teamName || "(Không xác định)"}
        </Text>
      </View>
      <SelectModal
        label="Chọn Unit"
        data={units.map(u => ({ label: u.unitName, value: u.id }))}
        value={selectedUnit}
        onChange={setSelectedUnit}
        placeholder="Chọn Unit"
        title="Chọn Unit"
        disabled={!userTeamId}
      />
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
      ) : flights && flights.length > 0 ? (
        <FlightSelectModal />
      ) : (
        shiftDate && (
          <Text style={styles.infoText}>
            Không có chuyến bay nào được tìm thấy cho ngày đã chọn.
          </Text>
        )
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={handleSearchUsers}>
        <Ionicons name="search" size={20} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.primaryButtonText}>Tìm kiếm nhân viên</Text>
      </TouchableOpacity>
      {loadingUsers && (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
      )}
      {/* Luôn hiển thị SelectModal chọn nhân viên nếu có users */}
      {users.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <UserSelectModal />
        </View>
      )}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <TouchableOpacity style={styles.primaryButton} onPress={handleApplyShift}>
        <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.primaryButtonText}>Áp dụng ca</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Layout>
      <FlatList
        data={[]}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={users.length > 0 ? ListFooter : null}
        contentContainerStyle={styles.listContainer}
        style={{ flex: 1 }}
      />
    </Layout>
  );
};

export default ApplyFlightShiftScreen;

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
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 5,
  },
  selectedUserItem: {
    backgroundColor: "#d0f0c0",
  },
  assignedUserItem: {
    backgroundColor: "#ffe4b5",
  },
  userName: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
    marginBottom: 10,
  },
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
