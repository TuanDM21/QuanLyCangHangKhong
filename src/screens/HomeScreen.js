import React, { useState } from "react";
import { 
  View, Text, FlatList, StyleSheet
} from "react-native";
import Layout from "./Layout";

const newsData = [
  { id: '1', title: 'Thông báo lịch trực mới nhất', content: 'Lịch trực tuần này đã được cập nhật.' },
  { id: '2', title: 'Chuyến bay bị hoãn', content: 'Chuyến bay VN123 đã bị hoãn do thời tiết xấu.' },
  { id: '3', title: 'Cảnh báo an ninh', content: 'Đề nghị nhân viên tuân thủ quy trình kiểm tra an ninh.' },
  { id: '4', title: 'Sự kiện nội bộ', content: 'Công ty tổ chức buổi gặp mặt cuối tuần này.' },
];

const NewsItem = ({ title, content }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.content}>{content}</Text>
  </View>
);

const HomeScreen = ({ navigation }) => {
  const [news] = useState(newsData);

  return (
    <Layout navigation={navigation}>
      <View style={styles.container}>
        <Text style={styles.header}>Tin Tức Chính</Text>
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsItem title={item.title} content={item.content} />}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f0f4f8",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  content: {
    fontSize: 14,
    color: "#555",
  },
});

export default HomeScreen;
