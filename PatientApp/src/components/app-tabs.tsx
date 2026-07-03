import { useAuthStore } from "@/store/AuthStore";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TEAL = "#2e9466";

const AUTH_TABS = [
  {
    name: "index",
    label: "Home",
    icon: "home-outline" as const,
    activeIcon: "home" as const,
    href: "/",
  },
  {
    name: "login",
    label: "Login",
    icon: "log-in-outline" as const,
    activeIcon: "log-in" as const,
    href: "/login",
  },
  {
    name: "register",
    label: "Register",
    icon: "person-add-outline" as const,
    activeIcon: "person-add" as const,
    href: "/register",
  },
];

const APP_TABS = [
  {
    name: "index",
    label: "Home",
    icon: "home-outline" as const,
    activeIcon: "home" as const,
    href: "/",
  },
  {
    name: "explore",
    label: "Appointments",
    icon: "calendar-outline" as const,
    activeIcon: "calendar" as const,
    href: "/explore",
  },
  {
    name: "medical-records",
    label: "Records",
    icon: "document-text-outline" as const,
    activeIcon: "document-text" as const,
    href: "/medical-records",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline" as const,
    activeIcon: "person" as const,
    href: "/profile",
  },
];

const PROTECTED_PREFIXES = [
  "/profile",
  "/explore",
  "/medical-records",
  "/medical-record",
  "/appointment-record",
];

export default function AppTabs() {
  const { isLoggedIn, checkLoginStatus } = useAuthStore();
  const guarded = useGuardedRouter();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // Redirect to login on logout from a protected route; raw router so the unsaved-changes guard never blocks it
  useEffect(() => {
    const onProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isLoggedIn && onProtected) {
      router.replace("/login");
    }
  }, [isLoggedIn, pathname, router]);

  const tabs = isLoggedIn ? APP_TABS : AUTH_TABS;

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.tabBar}>
        {tabs.map((tab, index) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => {
                if (!isActive) guarded.replace(tab.href as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconPill,
                  isActive && styles.iconPillActive,
                  isActive &&
                    index === 0 &&
                    tabs.length > 1 &&
                    styles.iconPillActiveFirst,
                  isActive &&
                    index === tabs.length - 1 &&
                    tabs.length > 1 &&
                    styles.iconPillActiveLast,
                ]}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? "#fff" : "#9ca3af"}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
    paddingHorizontal: 8,
    boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.06)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingBottom: Platform.OS === "android" ? 6 : 2,
  },
  iconPill: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconPillActive: {
    backgroundColor: TEAL,
  },
  iconPillActiveFirst: {
    borderBottomEndRadius: 16,
  },
  iconPillActiveLast: {
    borderBottomStartRadius: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9ca3af",
  },
  tabLabelActive: {
    color: TEAL,
    fontWeight: "700",
  },
});