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
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";
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
      label=""
      data={flights.map(fl => ({ 
        label: `${fl.flightNumber} (${fl.departureAirport.airportCode} → ${fl.arrivalAirport.airportCode})`, 
        value: fl.id.toString() 
      }))}
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
        label=""
        data={users.map(u => ({ 
          label: u.name + (u.assignedFlight ? ` [Đã phục vụ chuyến bay${u.assignedFlight.flightNumber ? ' ' + u.assignedFlight.flightNumber : ''}]` : u.assignedShiftCode ? ` [Ca trực: ${u.assignedShiftCode}]` : ''), 
          value: u.id 
        }))}
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
      <View style={styles.titleSection}>
        <View style={styles.titleIcon}>
          <Ionicons name="airplane" size={24} color="#1E3A8A" />
        </View>
        <Text style={styles.title}>Áp dụng ca theo chuyến bay</Text>
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

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={(date) => {
            setShiftDate(date);
            setDatePickerVisible(false);
          }}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* Flight Selection Section */}
        {loadingFlights ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>Đang tải chuyến bay...</Text>
          </View>
        ) : flights && flights.length > 0 ? (
          <View style={styles.formSection}>
            <Text style={styles.label}>
              <Ionicons name="airplane" size={16} color="#1E3A8A" /> Chọn chuyến bay
            </Text>
            <FlightSelectModal />
          </View>
        ) : (
          shiftDate && (
            <View style={styles.noDataContainer}>
              <Ionicons name="airplane-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noDataText}>
                Không có chuyến bay nào cho ngày đã chọn
              </Text>
            </View>
          )
        )}

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

      {/* User Selection */}
      {users.length > 0 && (
        <View style={styles.userSelectContainer}>
          <View style={styles.userSelectHeader}>
            <Ionicons name="people-outline" size={20} color="#1E3A8A" />
            <Text style={styles.userSelectTitle}>Danh sách nhân viên ({users.length})</Text>
          </View>
          <UserSelectModal />
          {selectedUserIds.length > 0 && (
            <View style={styles.selectedInfo}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.selectedText}>Đã chọn {selectedUserIds.length} nhân viên</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <View style={styles.actionCard}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyShift}>
          <Ionicons name="checkmark-circle" size={22} color="white" style={styles.buttonIcon} />
          <Text style={styles.applyButtonText}>Áp dụng ca chuyến bay</Text>
        </TouchableOpacity>
      </View>
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

  // No Data
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginVertical: 8,
  },
  noDataText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },

  // User Selection
  userSelectContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
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
  assignedUserItem: {
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
