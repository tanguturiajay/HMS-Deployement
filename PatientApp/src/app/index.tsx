import HomeScreen from "@/screens/home/HomeScreen";
import LandingScreen from "@/screens/landing/LandingScreen";
import { useAuthStore } from "@/store/AuthStore";

export default function Index() {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? <HomeScreen /> : <LandingScreen />;
}
