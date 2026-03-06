import { create } from "zustand";

type PageId = "chat" | "documents" | "settings";

type HealthPayload = {
  service: string;
  status: string;
};

type AppState = {
  currentPage: PageId;
  sidecarStatus: "idle" | "starting" | "ready" | "error";
  health: HealthPayload | null;
  setCurrentPage: (page: PageId) => void;
  setSidecarStatus: (status: AppState["sidecarStatus"]) => void;
  setHealth: (payload: HealthPayload | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  currentPage: "chat",
  sidecarStatus: "idle",
  health: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidecarStatus: (sidecarStatus) => set({ sidecarStatus }),
  setHealth: (health) => set({ health }),
}));
