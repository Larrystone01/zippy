"use client";
import { createClient } from "@/lib/supabase/client";
import { useContext, createContext, useState } from "react";
import { useSearchParams } from "next/navigation";

export type User = {
  id: string;
  full_name: string;
  email: string | undefined;
  role: string;
};

type AuthContextType = {
  user: User | null;
  saveUser: (user: User) => void;
  login: (email: string, password: string) => Promise<User>;
  // loginWithGoogle: (provider: "google") => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
};
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const params = useSearchParams();
  // const explicitNext = params.get("next");
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const authUser = data.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      const loggedInUser = {
        id: authUser.id,
        full_name: profile.full_name,
        email: authUser.email,
        role: profile.role,
      };
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // const loginWithGoogle = async (provider: "google") => {
  //   await supabase.auth.signInWithOAuth({
  //     provider,
  //     options: {
  //       // Only forward an explicit next — if there isn't one, the callback
  //       // route resolves the role-based destination itself after exchanging
  //       // the OAuth code (it doesn't have a userId to work with until then).
  //       redirectTo: explicitNext
  //         ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(explicitNext)}`
  //         : `${window.location.origin}/auth/callback`,
  //     },
  //   });
  // };

  const saveUser = (user: User) => {
    setUser(user);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        saveUser,
        login,
        // loginWithGoogle,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw Error(" useAuth must be used within an AuthProvidert");
  }
  return ctx;
};
