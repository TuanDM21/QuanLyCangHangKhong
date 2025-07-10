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
      id: 'flight',
      icon: 'airplane',
      label: 'Chuyến bay',
      route: 'FlightScreen',
    },
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
            size={22} 
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
            size={20} 
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
    bottom: 84,
    right: 20,
    zIndex: 1000,
  },
  toggleButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 2,
    borderTopColor: "#1E3A8A",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  menuContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  menuButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    position: "relative",
    marginHorizontal: 2,
  },
  activeMenuButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
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
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 14,
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
