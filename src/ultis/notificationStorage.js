import AsyncStorage from "@react-native-async-storage/async-storage";

// Lưu notification mới vào local
export const saveNotification = async (notification) => {
  try {
    let list = await AsyncStorage.getItem("notifications");
    list = list ? JSON.parse(list) : [];
    list.unshift({
      id: Date.now(),
      title: notification.request?.content?.title || "",
      body: notification.request?.content?.body || "",
      data: notification.request?.content?.data || {},
      receivedAt: new Date().toISOString(),
      read: false,
    });
    await AsyncStorage.setItem("notifications", JSON.stringify(list));
  } catch (e) {
    console.log("Lỗi lưu notification:", e);
  }
};

export const getNotifications = async () => {
  try {
    let list = await AsyncStorage.getItem("notifications");
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
};

export const markNotificationAsRead = async (id) => {
  try {
    let list = await AsyncStorage.getItem("notifications");
    list = list ? JSON.parse(list) : [];
    list = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    await AsyncStorage.setItem("notifications", JSON.stringify(list));
  } catch (e) {}
};