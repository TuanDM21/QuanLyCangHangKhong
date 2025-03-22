import React from "react";
import { View, StyleSheet } from "react-native";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }) => {
  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>{children}</View>
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#cfe2ff",
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
});

export default Layout;
