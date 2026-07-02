"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  userSettings: any;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  userSettings: null,
  refreshSettings: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<any>(null);

  const refreshSettings = async () => {
    if (!user) return;
    try {
      const settingsRef = doc(db, "settings", user.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setUserSettings(settingsSnap.data());
      } else {
        // Create default settings
        const defaultSettings = {
          userId: user.uid,
          currency: "USD",
          theme: "dark",
          language: "en",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          brokerSettings: {
            defaultLotSize: 0.1,
            defaultRiskPct: 1,
            defaultBroker: "MetaTrader 5",
          },
          notifications: {
            dailyReminder: true,
            summaries: true,
            riskAlert: true,
            overtradingAlert: true,
            revengeTradingAlert: true,
          },
          createdAt: new Date().toISOString(),
        };
        await setDoc(settingsRef, defaultSettings);
        setUserSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error refreshing settings:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user settings in Firestore
        const settingsRef = doc(db, "settings", currentUser.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setUserSettings(settingsSnap.data());
        } else {
          const defaultSettings = {
            userId: currentUser.uid,
            currency: "USD",
            theme: "dark",
            language: "en",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            brokerSettings: {
              defaultLotSize: 0.1,
              defaultRiskPct: 1,
              defaultBroker: "MetaTrader 5",
            },
            notifications: {
              dailyReminder: true,
              summaries: true,
              riskAlert: true,
              overtradingAlert: true,
              revengeTradingAlert: true,
            },
            createdAt: new Date().toISOString(),
          };
          await setDoc(settingsRef, defaultSettings);
          setUserSettings(defaultSettings);
        }
      } else {
        setUserSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setUserSettings(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, userSettings, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
