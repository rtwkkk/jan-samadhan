
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  canManageMembers as canManageMembersFor,
  canEditSettings as canEditSettingsFor,
  canSendMessages as canSendMessagesFor,
} from "@/lib/auth/roles";

const DEFAULT_CURRENCY = "USD";

export type AccountStatus = "loading" | "unlinked" | "error" | "ready";
export type AccountRole = "owner" | "admin" | "agent" | "viewer";

export interface AuthContextValue {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    created_at?: string;
  } | null;
  profile: any | null;
  account: { id: string; name: string; default_currency?: string } | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  defaultCurrency: string;
  accountStatus: AccountStatus;
  accountStatusDetail: string | null;
  accountId: string | null;
  accountRole: AccountRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isViewer: boolean;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canSendMessages: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [account, setAccount] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        throw new Error('Not authenticated');
      }
      const data = await res.json();
      
      setUser({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.fullName,
        avatar_url: data.user.avatarUrl
      });
      
      setProfile({
        id: data.user.id,
        full_name: data.user.fullName,
        email: data.user.email,
        avatar_url: data.user.avatarUrl,
        account_id: data.accountId,
        account_role: data.role
      });
      
      setAccount({
        id: data.account.id,
        name: data.account.name,
        default_currency: data.account.defaultCurrency || DEFAULT_CURRENCY
      });
    } catch (err: any) {
      setUser(null);
      setProfile(null);
      setAccount(null);
      setStatusDetail(err.message);
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
    setAccount(null);
    window.location.href = "/login";
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchAuth();
  }, [fetchAuth]);

  const derived = useMemo(() => {
    const role = profile?.account_role ?? null;
    return {
      accountRole: role,
      accountId: profile?.account_id ?? null,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isAgent: role === "agent",
      isViewer: role === "viewer",
      canManageMembers: role ? canManageMembersFor(role) : false,
      canEditSettings: role ? canEditSettingsFor(role) : false,
      canSendMessages: role ? canSendMessagesFor(role) : false,
    };
  }, [profile?.account_role, profile?.account_id]);

  const accountStatus: AccountStatus = !user
    ? "loading"
    : profileLoading
      ? "loading"
      : !profile
        ? "error"
        : derived.accountId && derived.accountRole
          ? "ready"
          : "unlinked";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signOut,
        refreshProfile,
        account,
        defaultCurrency: account?.default_currency ?? DEFAULT_CURRENCY,
        accountStatus,
        accountStatusDetail: statusDetail,
        ...derived,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      loading: false,
      profileLoading: false,
      signOut: async () => {
        window.location.href = "/login";
      },
      refreshProfile: async () => {},
      account: null,
      defaultCurrency: DEFAULT_CURRENCY,
      accountStatus: "loading",
      accountStatusDetail: null,
      accountId: null,
      accountRole: null,
      isOwner: false,
      isAdmin: false,
      isAgent: false,
      isViewer: false,
      canManageMembers: false,
      canEditSettings: false,
      canSendMessages: false,
    };
  }
  return ctx;
}
