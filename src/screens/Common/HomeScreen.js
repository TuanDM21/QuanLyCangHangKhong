import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import httpApiClient from "../../services";

const NewsItem = ({ title, content, date }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Ionicons name="newspaper-outline" size={20} color="#1565C0" />
      <Text style={styles.title}>{title}</Text>
    </View>
    <Text style={styles.content}>{content}</Text>
    {date ? (
      <View style={styles.dateContainer}>
        <Ionicons name="time-outline" size={16} color="#666" />
        <Text style={styles.date}>{date}</Text>
      </View>
    ) : null}
  </View>
);

const HomeScreen = ({ navigation }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPinned = async () => {
      try {
        const res = await httpApiClient.get("activities/pinned");
        const data = await res.json();
        setNews(Array.isArray(data) ? data : (data.data || []));
      } catch {
        setNews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPinned();
  }, []);

  return (
    <Layout navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Ionicons name="home" size={28} color="#1565C0" />
          <Text style={styles.header}>Tin Tức Chính</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.loadingText}>Đang tải tin tức...</Text>
          </View>
        ) : news.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có tin tức nổi bật nào.</Text>
          </View>
        ) : (
          <FlatList
            data={news}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <NewsItem
                title={item.name}
                content={item.notes || item.description || ""}
                date={item.startTime ? new Date(item.startTime).toLocaleString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1565C0",
    marginLeft: 12,
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3e8ef",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1565C0",
    marginLeft: 8,
    flex: 1,
  },
  content: {
    fontSize: 15,
    color: "#495057",
    lineHeight: 22,
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  date: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
});

export default HomeScreen;