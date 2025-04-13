import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native"; // 🛠️ Import useNavigation

const Footer = () => {
  const navigation = useNavigation(); // 🛠️ Lấy navigation từ context

  return (
    <View style={styles.footer}>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("Schedule")}
      >
        <Ionicons name="calendar" size={20} color="white" />
        <Text style={styles.buttonText}>Lịch trực</Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("Home")}
      >
        <Ionicons name="briefcase" size={20} color="white" />
        <Text style={styles.buttonText} numberOfLines={2}>
          Hoạt động{"\n"}đơn vị
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("FlightScreen")}
      >
        <Ionicons name="airplane" size={20} color="white" />
        <Text style={styles.buttonText} numberOfLines={2}>
          Lịch trình{"\n"}chuyến bay
        </Text>
      </Pressable>

      <View style={styles.divider} />

      {/* <Pressable style={styles.button} onPress={() => navigation.navigate("Attendance")}>
        <Ionicons name="checkmark-done" size={20} color="white" />
        <Text style={styles.buttonText} numberOfLines={2}>
          Kết quả{"\n"}chấm công
        </Text>
      </Pressable> */}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0057D9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap",
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "white",
  },
});

export default Footer;
