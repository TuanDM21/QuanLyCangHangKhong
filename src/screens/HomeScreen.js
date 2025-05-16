import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import Layout from "./Layout";
import httpApiClient from "../services";

const NewsItem = ({ title, content, date }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.content}>{content}</Text>
    {date ? (
      <Text style={styles.date}>{date}</Text>
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
        <Text style={styles.header}>Tin Tức Chính</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 30 }} />
        ) : news.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#888", marginTop: 30 }}>Không có tin tức nổi bật nào.</Text>
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
          />
        )}
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
  date: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default HomeScreen;