import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Layout";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import httpApiClient from "../../services";

const PARTICIPANT_TYPES = [
  { label: "User", value: "USER" },
  { label: "Team", value: "TEAM" },
  { label: "Unit", value: "UNIT" },
];

// Hàm format local datetime thành "YYYY-MM-DDTHH:mm:ss"
function toLocalISOString(date) {
  const pad = n => n.toString().padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

export default function CreateActivityScreen() {
  const navigation = useNavigation();

  // Activity basic fields
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  // Participants list to send
  const [participants, setParticipants] = useState([]);
  const [participantType, setParticipantType] = useState("USER");

  // User search/multi-select
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Team/Unit selection
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Date picker visibility
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Fetch teams or units when participantType changes
  useEffect(() => {
    const fetchList = async (endpoint, setter) => {
      try {
        const res = await httpApiClient.get(endpoint);
        const json = await res.json();
        setter(Array.isArray(json.data) ? json.data : []);
      } catch {
        setter([]);
      }
    };
    if (participantType === "TEAM") fetchList("teams", setTeams);
    if (participantType === "UNIT") fetchList("units", setUnits);
  }, [participantType]);

  // Search users as typing
  useEffect(() => {
    const fetchUsers = async () => {
      if (participantType === "USER" && userSearch.length > 1) {
        try {
          const res = await httpApiClient.get(
            `users/filter?searchText=${encodeURIComponent(userSearch)}`
          );
          const json = await res.json();
          setUserResults(Array.isArray(json.data) ? json.data : []);
        } catch {
          setUserResults([]);
        }
      } else {
        setUserResults([]);
      }
    };
    fetchUsers();
  }, [userSearch, participantType]);

  const formatDateTime = (d) => d.toLocaleString("vi-VN", { hour12: false }).replace(",", "");
  const createActivity = (payload) =>
    httpApiClient.post("activities", { json: payload });

  // Toggle selection of a user
  const toggleSelectUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  // Add selected participants, avoid duplicates
  const handleAddParticipant = () => {
    const newParts = [];
    if (participantType === "USER") {
      selectedUsers.forEach((u) =>
        newParts.push({ participantType: "USER", participantId: u.id, participantName: u.name })
      );
      setSelectedUsers([]);
      setUserSearch("");
    }
    if (participantType === "TEAM" && selectedTeam) {
      newParts.push({ participantType: "TEAM", participantId: selectedTeam.id, participantName: selectedTeam.teamName });
      setSelectedTeam(null);
    }
    if (participantType === "UNIT" && selectedUnit) {
      newParts.push({ participantType: "UNIT", participantId: selectedUnit.id, participantName: selectedUnit.unitName });
      setSelectedUnit(null);
    }
    const filtered = newParts.filter(
      (np) =>
        !participants.some(
          (p) => p.participantType === np.participantType && p.participantId === np.participantId
        )
    );
    if (filtered.length < newParts.length) {
      Alert.alert("Thông báo", "Một số mục đã tồn tại và bị bỏ qua.");
    }
    if (filtered.length) {
      setParticipants((prev) => [...prev, ...filtered]);
    }
  };

  // Remove participant by index
  const handleRemoveParticipant = (idx) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit form with endTime > startTime validation
  const handleSubmit = async () => {
    if (!name.trim() || !location.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập tên và địa điểm!");
    }
    if (endTime <= startTime) {
      return Alert.alert("Lỗi", "Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
    }
    const payload = {
      name,
      location,
      startTime: toLocalISOString(startTime), // Sửa: dùng local time
      endTime: toLocalISOString(endTime),     // Sửa: dùng local time
      notes,
      participants,
    };
    try {
      const res = await createActivity(payload);
      if (res.ok) {
        const { data } = await res.json();
        Alert.alert("Thành công", `Activity ID = ${data.id}`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert("Lỗi", err.message || "Tạo thất bại");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối server");
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tạo Activity mới</Text>

          <Text style={styles.label}>Tên activity</Text>
          <TextInput style={styles.input} placeholder="Nhập tên" value={name} onChangeText={setName} />

          <Text style={styles.label}>Địa điểm</Text>
          <TextInput style={styles.input} placeholder="Nhập địa điểm" value={location} onChangeText={setLocation} />

          <Text style={styles.label}>Thời gian bắt đầu</Text>
          <TouchableOpacity style={styles.timePicker} onPress={() => setIsStartPickerVisible(true)}>
            <Text style={styles.timeText}>{formatDateTime(startTime)}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={isStartPickerVisible} mode="datetime" is24Hour
            onConfirm={(d) => { setStartTime(d); setIsStartPickerVisible(false); }}
            onCancel={() => setIsStartPickerVisible(false)} />

          <Text style={styles.label}>Thời gian kết thúc</Text>
          <TouchableOpacity style={styles.timePicker} onPress={() => setIsEndPickerVisible(true)}>
            <Text style={styles.timeText}>{formatDateTime(endTime)}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={isEndPickerVisible} mode="datetime" is24Hour
            onConfirm={(d) => { if (d > startTime) setEndTime(d); else Alert.alert("Lỗi","Thời gian kết thúc phải lớn hơn thời gian bắt đầu!"); setIsEndPickerVisible(false); }}
            onCancel={() => setIsEndPickerVisible(false)} />

          <Text style={styles.label}>Ghi chú</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Nhập ghi chú" value={notes} onChangeText={setNotes} multiline />

          <Text style={styles.label}>Loại người tham gia</Text>
          <View style={styles.row}>
            {PARTICIPANT_TYPES.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.typeBtn, participantType===opt.value&&styles.typeBtnActive]} onPress={()=>setParticipantType(opt.value)}>
                <Text style={{color:participantType===opt.value?"#fff":"#007AFF",fontWeight:"bold"}}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {participantType==="USER" && (
            <TextInput style={styles.input} placeholder="Tìm kiếm user..." value={userSearch} onChangeText={setUserSearch} />
          )}

          {participantType==="TEAM" && (
            <View style={styles.input}>
              <Picker selectedValue={selectedTeam?.id} onValueChange={id=>setSelectedTeam(teams.find(t=>t.id===id)||null)}>
                <Picker.Item label="Chọn team" value={null} />
                {teams.map(t=> <Picker.Item key={t.id} label={t.teamName} value={t.id}/>)}
              </Picker>
            </View>
          )}

          {participantType==="UNIT" && (
            <View style={styles.input}>
              <Picker selectedValue={selectedUnit?.id} onValueChange={id=>setSelectedUnit(units.find(u=>u.id===id)||null)}>
                <Picker.Item label="Chọn unit" value={null} />
                {units.map(u=> <Picker.Item key={u.id} label={u.unitName} value={u.id}/>)}
              </Picker>
            </View>
          )}

          <Button title="Thêm người tham gia" onPress={handleAddParticipant} />

          {participantType==="USER" && userResults.length>0 && (
            <FlatList data={userResults} keyExtractor={i=>i.id.toString()} scrollEnabled={false} nestedScrollEnabled={false}
              style={{maxHeight:150,marginVertical:10}}
              renderItem={({item})=>{
                const sel=selectedUsers.some(u=>u.id===item.id);
                return (
                  <TouchableOpacity style={styles.resultItem} onPress={()=>toggleSelectUser(item)}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultText}>{item.name}</Text>
                      {sel&&<Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={{marginVertical:10}}>
            {participants.map((p,idx)=>(
              <View style={styles.partRow} key={idx}>
                <Text style={styles.partText}>{p.participantName}</Text>
                <TouchableOpacity onPress={()=>handleRemoveParticipant(idx)}><Text style={styles.removeText}>Xóa</Text></TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={{marginTop:20}}>
            <Button title="Tạo activity" onPress={handleSubmit} color="#007AFF" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container:{padding:20,backgroundColor:"#CFE2FF",paddingBottom:120},
  title:{fontSize:24,fontWeight:"bold",color:"#007AFF",textAlign:"center",marginBottom:20},
  label:{fontSize:15,fontWeight:"600",marginBottom:5},
  input:{height:48,borderWidth:1,borderColor:"#ccc",borderRadius:8,paddingHorizontal:12,backgroundColor:"#fff",marginBottom:15,justifyContent:"center"},
  textArea:{height:80,textAlignVertical:"top"},
  timePicker:{backgroundColor:"#fff",borderWidth:1,borderColor:"#007AFF",borderRadius:8,padding:12,alignItems:"center",marginBottom:15,elevation:2},
  timeText:{fontSize:16,color:"#007AFF",fontWeight:"600"},
  row:{flexDirection:"row",marginBottom:10},
  typeBtn:{flex:1,borderWidth:1,borderColor:"#007AFF",borderRadius:8,padding:10,marginHorizontal:2,alignItems:"center"},
  typeBtnActive:{backgroundColor:"#007AFF"},
  resultItem:{paddingVertical:8,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:"#eee"},
  resultRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  resultText:{flex:1},
  checkMark:{fontSize:18,color:"#007AFF",marginLeft:8},
  partRow:{flexDirection:"row",alignItems:"center",marginBottom:5},
  partText:{flex:1},
  removeText:{color:"red"},
}); 