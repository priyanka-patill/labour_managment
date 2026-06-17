import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'employer' | 'labour' | 'common' | 'admin';
  mobile?: string;
  address?: string;
  avatar?: string;
  isVerified?: boolean;
  trustScore?: number;
  // Labour specific
  skills?: string[];
  expectedWage?: number;
  experience?: number;
  languages?: string[];
  availability?: 'available' | 'busy' | 'offline';
  completedJobsCount?: number;
  certificates?: string[];
  portfolioImages?: string[];
  // Employer specific
  companyName?: string;
  businessDetails?: string;
  projectsCompleted?: number;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  theme: 'light' | 'dark';
  language: 'en' | 'hi' | 'mr'; // English, Hindi, Marathi
}

const initialState: AuthState = {
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  theme: 'light', // default to professional light mode
  language: 'en'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: UserProfile }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.token);
      }
    },
    updateUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    },
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', state.theme === 'dark');
      }
    },
    setLanguage(state, action: PayloadAction<'en' | 'hi' | 'mr'>) {
      state.language = action.payload;
    }
  }
});

export const { setCredentials, updateUser, logout, toggleTheme, setLanguage } = authSlice.actions;
export default authSlice.reducer;
