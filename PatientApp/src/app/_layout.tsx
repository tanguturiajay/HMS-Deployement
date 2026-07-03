import AppTabs from "@/components/app-tabs";
import ConfirmModal from "@/components/common/ConfirmModal";
import LoadingScreen from "@/components/loading-screen";
import { queryClient } from "@/lib/queryClient";
import {
  setOnPasswordChangeRequired,
  setOnSessionExpired,
} from "@/services/apiClient";
import { useAuthStore } from "@/store/AuthStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function AppLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        await Promise.all([
          useAuthStore.getState().checkLoginStatus(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (error) {
        console.warn(error);
      } finally {
        await SplashScreen.hideAsync();
        setIsLoading(false);
      }
    }

    prepare();
  }, []);

  // Global auth failure routing that sends a failed refresh to login and a temporary password account to change password
  useEffect(() => {
    setOnSessionExpired(() => {
      useAuthStore.getState().setLoggedOut();
      router.replace("/login");
    });
    setOnPasswordChangeRequired(() => {
      router.replace("/change-password");
    });
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <View style={styles.container}>
          <AppTabs />
        </View>
        <ConfirmModal />
      </KeyboardProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
