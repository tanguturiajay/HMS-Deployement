import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/loading.gif")}
        contentFit="contain"
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#208AEF",
  },
  image: {
    width: 180,
    height: 180,
  },
});
