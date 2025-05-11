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

// ...existing code...
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
// ...existing code...
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

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);
    let displayName = item.name;
    if (item.assignedFlight) {
      displayName += ` [Đã phục vụ chuyến bay ${item.assignedFlight.flightNumber}]`;
    } else if (item.assignedShiftCode) {
      displayName += ` [Ca trực: ${item.assignedShiftCode}]`;
    }
    const isDisabled = !!item.assignedShiftCode || !!item.assignedFlight;
    return (
      <View style={styles.userItem}>
        <TouchableOpacity
          style={[
            { flex: 1 },
            isSelected && styles.selectedUserItem,
            (item.assignedFlight || item.assignedShiftCode) && styles.assignedUserItem,
          ]}
          onPress={() => {
            if (!item.assignedShiftCode && !item.assignedFlight) {
              toggleUserSelection(item.id);
            }
          }}
          disabled={isDisabled}
        >
          <Text style={styles.userName}>{displayName}</Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="green" />
          )}
        </TouchableOpacity>
        {item.assignedFlight && (
          <TouchableOpacity onPress={() => handleRemoveAssignment(item.id)}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
                  label={`${fl.flightNumber} (${fl.departureAirport.airportCode} → ${fl.arrivalAirport.airportCode})`}
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
});
