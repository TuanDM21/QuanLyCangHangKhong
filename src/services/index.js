import ky from "ky";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const httpApiClient = ky.create({
  prefixUrl: "http://10.0.2.2:8080/api/",
  // prefixUrl: "http://10.0.10.32:8080/api/",
  timeout: 10000,
  throwHttpErrors: false,
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        // Nếu response không ok, clone body để sử dụng mà không tiêu thụ nó
        if (!response.ok) {
          try {
            const clonedResponse = response.clone();
            const responseBody = await clonedResponse.json();
            Alert.alert("Lỗi", responseBody.message || "Có lỗi xảy ra");
          } catch (e) {
            console.error("Lỗi khi parse response error:", e);
          }
        } else if (response.status === 404) {
          Alert.alert("Not Found", "The requested resource was not found.");
        }
        return response;
      },
    ],
  },
});

export default httpApiClient;
