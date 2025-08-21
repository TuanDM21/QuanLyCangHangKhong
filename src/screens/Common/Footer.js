import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState, useRef } from "react";

const { width } = Dimensions.get('window');

const Footer = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const menuItems = [
    {
      id: 'schedule',
      icon: 'calendar',
      label: 'Lịch trực',
      route: 'Schedule',
    },
    {
      id: 'activity',
      icon: 'briefcase',
      label: 'Hoạt động',
      route: 'ActivityScreen',
    },
    {
      id: 'job',
      icon: 'construct',
      label: 'Công việc',
      route: 'JobScreen',
    },
    // {
    //   id: 'flight',
    //   icon: 'airplane',
    //   label: 'Chuyến bay',
    //   route: 'FlightScreen',
    // },
    {
      id: 'home',
      icon: 'home',
      label: 'Trang chủ',
      route: 'Home',
    },
  ];

  const toggleFooter = () => {
    const toValue = isVisible ? 80 : 0;
    setIsVisible(!isVisible);
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const isActiveRoute = (routeName) => {
    return route.name === routeName;
  };

  const renderMenuItem = (item, index) => {
    const isActive = isActiveRoute(item.route);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuButton, isActive && styles.activeMenuButton]}
        onPress={() => navigation.navigate(item.route)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
          <Ionicons 
            name={isActive ? item.icon : `${item.icon}-outline`} 
            size={18}              // Giảm từ 22 xuống 18
            color={isActive ? "#FFFFFF" : "#64748B"} 
          />
        </View>
        <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
          {item.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Toggle Button */}
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={toggleFooter}
        activeOpacity={0.8}
      >
        <View style={styles.toggleButtonContainer}>
          <Ionicons 
            name={isVisible ? "chevron-down" : "chevron-up"} 
            size={16}              // Giảm từ 20 xuống 16
            color="#FFFFFF" 
          />
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <Animated.View style={[styles.footer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: "absolute",
    bottom: 54,            // Giảm từ 84 xuống 54 (footer nhỏ hơn)
    right: 20,
    zIndex: 1000,
  },
  toggleButtonContainer: {
    width: 40,             // Giảm từ 48 xuống 40
    height: 40,            // Giảm từ 48 xuống 40
    borderRadius: 20,      // Cập nhật border radius
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,           // Giảm shadow
    },
    shadowOpacity: 0.2,    // Giảm shadow opacity
    shadowRadius: 4,       // Giảm shadow radius
    elevation: 5,          // Giảm elevation
    borderWidth: 1,        // Giảm border width
    borderColor: "#3B82F6",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,     // Giảm từ 2 xuống 1
    borderTopColor: "#1E3A8A",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,          // Giảm shadow
    },
    shadowOpacity: 0.1,    // Giảm shadow opacity
    shadowRadius: 6,       // Giảm shadow radius
    elevation: 8,          // Giảm elevation
  },
  menuContainer: {
    flexDirection: "row",
    paddingVertical: 6,    // Giảm từ 12 xuống 6
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  menuButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,    // Giảm từ 10 xuống 4
    paddingHorizontal: 4,
    borderRadius: 12,      // Giảm từ 16 xuống 12
    position: "relative",
    marginHorizontal: 2,
  },
  activeMenuButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  iconContainer: {
    width: 32,             // Giảm từ 40 xuống 32
    height: 32,            // Giảm từ 40 xuống 32
    borderRadius: 16,      // Cập nhật border radius
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,       // Giảm từ 4 xuống 2
  },
  activeIconContainer: {
    backgroundColor: "#1E3A8A",
    shadowColor: "#1E3A8A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  menuText: {
    fontSize: 10,          // Giảm từ 11 xuống 10
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 12,        // Giảm từ 14 xuống 12
  },
  activeMenuText: {
    color: "#1E3A8A",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1E3A8A",
    shadowColor: "#1E3A8A",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default Footer;
