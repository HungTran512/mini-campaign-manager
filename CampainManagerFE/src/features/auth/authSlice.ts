import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = { id: string; email: string; name: string };

type AuthState = {
  user: AuthUser | null;
  bootstrapped: boolean;
};

const initialState: AuthState = {
  user: null,
  bootstrapped: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.bootstrapped = true;
    },
    logout(state) {
      state.user = null;
      state.bootstrapped = true;
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (s: { auth: AuthState }) => s.auth.user;
export const selectBootstrapped = (s: { auth: AuthState }) => s.auth.bootstrapped;
