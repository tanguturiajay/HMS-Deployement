import { create } from "zustand";
import { useConfirmModal } from "./confirmModal";

// Navigation guard mirroring the Angular unsavedChangesGuard
interface NavGuardState {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Resolves true when navigation may proceed, false to stay. */
  confirmLeave: () => Promise<boolean>;
}

export const useNavGuard = create<NavGuardState>((set, get) => ({
  isDirty: false,

  setDirty: (dirty) => set({ isDirty: dirty }),

  confirmLeave: () => {
    if (!get().isDirty) return Promise.resolve(true);
    return useConfirmModal.getState().open({
      title: "Unsaved Changes",
      message:
        "You have unsaved changes on this form. Your entries are kept if you " +
        "return, but do you want to leave this page now?",
      confirmText: "Leave",
      cancelText: "Stay",
      type: "warning",
    });
  },
}));
