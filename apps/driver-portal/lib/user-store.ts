import { create } from "zustand";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  role: string;
  driverStatus: string;
  tier: string;
  availabilityStatus: string;
  revisionNotes: string | null;
  ssn: string | null;
  licenseImage: string | null;
  vehicleImage: string | null;
  forHireLicenseImage: string | null;
  hasForHireLicense: boolean;
  hasOwnVehicle: boolean;
  backgroundCheck: boolean;
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  setAvailabilityStatus: (status: string) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile, isLoading: false }),
  setAvailabilityStatus: (availabilityStatus) =>
    set((s) =>
      s.profile ? { profile: { ...s.profile, availabilityStatus } } : s,
    ),
  clearProfile: () => set({ profile: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
