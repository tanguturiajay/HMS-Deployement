import { useRouter } from "expo-router";
import { useNavGuard } from "@/store/navGuard";

type Router = ReturnType<typeof useRouter>;

// useRouter replacement whose push/replace/back run the unsaved-changes guard first
export function useGuardedRouter() {
  const router = useRouter();
  const confirmLeave = useNavGuard((s) => s.confirmLeave);

  const push = async (...args: Parameters<Router["push"]>) => {
    if (await confirmLeave()) router.push(...args);
  };
  const replace = async (...args: Parameters<Router["replace"]>) => {
    if (await confirmLeave()) router.replace(...args);
  };
  const back = async () => {
    if (await confirmLeave()) router.back();
  };

  return { push, replace, back };
}
