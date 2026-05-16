import { create } from "zustand";
import Cookies from "js-cookie";
import { api } from "@/lib/api";

interface User {
  username: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  login: (username: string, password: string, totp?: string) => Promise<{ totpRequired: boolean }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: async (username, password, totp) => {
    const { data } = await api.post("/auth/login", { username, password, totp_code: totp });
    if (data.totp_required) return { totpRequired: true };
    Cookies.set("access_token", data.access_token, { expires: 1 });
    set({ user: data.user });
    return { totpRequired: false };
  },
  logout: async () => {
    await api.post("/auth/logout");
    Cookies.remove("access_token");
    set({ user: null });
  },
  fetchUser: async () => {
    const { data } = await api.get("/auth/me");
    set({ user: data });
  },
}));
