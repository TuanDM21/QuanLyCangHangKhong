import React from "react";
import { View, StyleSheet } from "react-native";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children, navigation, setIsLoggedIn }) => {
  return (
    <View style={styles.container}>
      <Header
        setIsLoggedIn={setIsLoggedIn || (() => {})}
        navigation={navigation}
      />
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
  // Thêm marginBottom để nội dung không bị che Footer (Footer cao khoảng 60)
  content: {
    flex: 1,
    marginBottom: 60,
  },
});

export default Layout;
