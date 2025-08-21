import React from "react";
import { View, StyleSheet } from "react-native";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children, navigation }) => {
  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <View style={styles.content}>
        {children}
      </View>
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#cfe2ff",
    paddingHorizontal: 0, // Loại bỏ padding ngang để tận dụng toàn bộ màn hình
  },
  content: {
    flex: 1,
    marginBottom: 50, // Giảm margin bottom vì footer sẽ nhỏ hơn
  },
});

export default Layout;