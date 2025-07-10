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
import Layout from "../Common/Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";

const PARTICIPANT_TYPES = [
  { label: "User", value: "USER" },
  { label: "Team", value: "TEAM" },
  { label: "Unit", value: "UNIT" },
];

// Hàm format local datetime string (không bị lệch múi giờ)
const pad = n => n < 10 ? '0' + n : n;
const toLocalString = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export default function EditActivityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { activity } = route.params || {};

  // Activity basic fields
  const [name, setName] = useState(activity?.name || "");
  const [location, setLocation] = useState(activity?.location || "");
  const [notes, setNotes] = useState(activity?.notes || "");
  const [startTime, setStartTime] = useState(activity?.startTime ? new Date(activity.startTime) : new Date());
  const [endTime, setEndTime] = useState(activity?.endTime ? new Date(activity.endTime) : new Date());

  // Participants list to send
  const [participants, setParticipants] = useState(activity?.participants || []);
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

  // Hiển thị ngày giờ dạng dd/MM/yyyy HH:mm
  const formatDateTime = (d) => {
    if (!d) return "";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const updateActivity = (payload) =>
    httpApiClient.put(`activities/${activity.id}`, { json: payload });

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
      startTime: toLocalString(startTime),
      endTime: toLocalString(endTime),
      notes,
      participants,
    };
    try {
      const res = await updateActivity(payload);
      if (res.ok) {
        const { data } = await res.json();
        Alert.alert("Thành công", `Đã cập nhật activity`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert("Lỗi", err.message || "Cập nhật thất bại");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối server");
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          <Text style={styles.title}>Sửa Activity</Text>

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

          {participantType === "TEAM" && (
            <SelectModal
              data={teams.map(t => ({ label: t.teamName, value: t.id }))}
              value={selectedTeam?.id || ""}
              onChange={id => setSelectedTeam(teams.find(t => t.id === id) || null)}
              placeholder="Chọn team"
              title="Chọn team"
            />
          )}
          {participantType === "UNIT" && (
            <SelectModal
              data={units.map(u => ({ label: u.unitName, value: u.id }))}
              value={selectedUnit?.id || ""}
              onChange={id => setSelectedUnit(units.find(u => u.id === id) || null)}
              placeholder="Chọn unit"
              title="Chọn unit"
            />
          )}

          <TouchableOpacity style={{backgroundColor:'#007AFF',borderRadius:8,paddingVertical:13,alignItems:'center',marginTop:8,marginBottom:8,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:3,elevation:2}} onPress={handleAddParticipant}>
            <Text style={{color:'white',fontWeight:'bold',fontSize:16,letterSpacing:1}}>Thêm người tham gia</Text>
          </TouchableOpacity>

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

          <View style={styles.participantBox}>
            <Text style={styles.label}>Danh sách người tham gia</Text>
            {participants.length === 0 && (
              <Text style={{ color: "#888", marginBottom: 8 }}>Chưa có người tham gia</Text>
            )}
            {participants.map((p,idx)=>(
              <View key={idx} style={{flexDirection:'row',alignItems:'center',marginBottom:6,backgroundColor:'#f7fafd',borderRadius:14,paddingVertical:6,paddingHorizontal:10,borderWidth:1,borderColor:'#e0e7ef'}}>
                <Text style={{flex:1,fontWeight:'500',fontSize:15,color:'#222'}} numberOfLines={1}>{p.participantName}</Text>
                <TouchableOpacity onPress={()=>handleRemoveParticipant(idx)} style={{marginLeft:6}}>
                  <Text style={{color:'#FF3B30',fontWeight:'bold'}}>Xóa</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={{marginTop:20}}>
            <TouchableOpacity style={{backgroundColor:'#007AFF',borderRadius:8,paddingVertical:15,alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:3,elevation:2}} onPress={handleSubmit}>
              <Text style={{color:'white',fontWeight:'bold',fontSize:18,letterSpacing:1}}>Cập nhật activity</Text>
            </TouchableOpacity>
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
  input:{height:48,borderWidth:1,borderColor:"#e3e8ef",borderRadius:8,paddingHorizontal:12,backgroundColor:"#fff",marginBottom:15,justifyContent:"center",shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.06,shadowRadius:2,elevation:1},
  textArea:{height:80,textAlignVertical:"top"},
  timePicker:{backgroundColor:"#fff",borderWidth:1,borderColor:"#007AFF",borderRadius:8,padding:12,alignItems:"center",marginBottom:15,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:3,elevation:2},
  timeText:{fontSize:16,color:"#007AFF",fontWeight:"600"},
  row:{flexDirection:"row",marginBottom:10},
  typeBtn:{flex:1,borderWidth:1,borderColor:"#007AFF",borderRadius:8,padding:10,marginHorizontal:2,alignItems:"center",backgroundColor:"#fff",shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:1,elevation:1},
  typeBtnActive:{backgroundColor:"#007AFF"},
  resultItem:{paddingVertical:8,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:"#eee"},
  resultRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  resultText:{flex:1},
  checkMark:{fontSize:18,color:"#007AFF",marginLeft:8},
  partRow:{flexDirection:"row",alignItems:"center",marginBottom:5},
  partText:{flex:1},
  removeText:{color:"red"},
  participantBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e3e8ef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
});