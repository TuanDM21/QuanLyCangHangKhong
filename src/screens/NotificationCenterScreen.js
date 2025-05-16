import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import httpApiClient from "../services";
import Layout from "./Layout";

export default function NotificationCenterScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    httpApiClient
      .get("notifications")
      .json()
      .then((data) => {
        // Đảm bảo data là mảng, nếu có dạng { data: [...] } thì lấy data.data
        if (Array.isArray(data)) setNotifications(data);
        else if (Array.isArray(data?.data)) setNotifications(data.data);
        else setNotifications([]);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // Scroll đến đầu danh sách khi mở từ push notification
  useEffect(() => {
    // Nếu bạn muốn scroll đến đầu hoặc highlight, có thể dùng ref FlatList
    // hoặc xử lý thêm nếu có params truyền vào navigation
  }, []);

  return (
    <Layout>
      <View style={styles.container}>
        <View style={{alignItems:'center', marginBottom:16}}>
          <Text style={styles.title}>Trung tâm thông báo</Text>
        </View>
        {loading ? (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', marginTop:40}}>
            <Text style={{color:'#007AFF', fontSize:16, marginBottom:10}}>Đang tải thông báo...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item, idx) => (item?.id ? item.id.toString() : idx.toString())}
            ListEmptyComponent={<Text style={{textAlign:'center',color:'#888',marginTop:20}}>Không có thông báo</Text>}
            renderItem={({ item }) => (
              <View style={[
                styles.notificationBox,
                !item.isRead && { borderLeftWidth: 5, borderLeftColor: '#FF9500', backgroundColor: '#fffbe6' }
              ]}>
                <Text style={[
                  styles.notificationTitle,
                  !item.isRead && { color: '#FF9500' }
                ]}>{item.title}</Text>
                <Text style={styles.notificationContent}>{item.content}</Text>
                <Text style={styles.notificationTime}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
                {!item.isRead && (
                  <View style={{marginTop:6, alignSelf:'flex-end', backgroundColor:'#FF9500', borderRadius:6, paddingHorizontal:10, paddingVertical:3}}>
                    <Text style={{color:'#fff', fontSize:12}}>Chưa đọc</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#007AFF",
    // căn giữa
    textAlign: 'center',
    marginBottom: 0,
  },
  notificationBox: {
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  notificationTitle: { fontWeight: "bold", color: "#007AFF" },
  notificationContent: { color: "#333", marginTop: 4 },
  notificationTime: { color: "#888", fontSize: 12, marginTop: 4 },
});