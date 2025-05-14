import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { getNotifications, markNotificationAsRead } from "../ultis/notificationStorage";

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    const list = await getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRead = async (id) => {
    await markNotificationAsRead(id);
    loadNotifications();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Thông báo đã nhận</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, item.read && styles.read, { borderRadius: 8, marginBottom: 8, backgroundColor: item.read ? '#f0f0f0' : '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }]}
            onPress={() => handleRead(item.id)}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.receivedAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>Chưa có thông báo nào</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  read: { backgroundColor: "#f0f0f0" },
  title: { fontWeight: "bold", fontSize: 16 },
  body: { fontSize: 14, color: "#333" },
  time: { fontSize: 12, color: "#888", marginTop: 4 },
});

export default NotificationScreen;