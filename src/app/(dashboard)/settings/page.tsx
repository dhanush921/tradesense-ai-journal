"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateProfile, updatePassword, deleteUser } from "firebase/auth";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, User as UserIcon, Shield, Settings as SettingsIcon, Save, Trash2, CheckCircle, Upload } from "lucide-react";

export default function Settings() {
  const { user, userSettings, refreshSettings } = useAuth();
  const router = useRouter();

  // General profile state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Settings State
  const [currency, setCurrency] = useState(userSettings?.currency || "USD");
  const [timezone, setTimezone] = useState(userSettings?.timezone || "UTC");
  const [broker, setBroker] = useState(userSettings?.brokerSettings?.defaultBroker || "MetaTrader 5");
  const [riskPct, setRiskPct] = useState(userSettings?.brokerSettings?.defaultRiskPct || 1);
  const [defaultEquity, setDefaultEquity] = useState(userSettings?.brokerSettings?.defaultEquity || 10000);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Loading States
  const [profileLoading, setProfileLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPhotoUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      await updateProfile(user, { photoURL: url });
      setProfilePhoto(url);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to upload profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName) return;
    setProfileLoading(true);

    try {
      await updateProfile(user, { displayName });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile name.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSettingsLoading(true);

    const updatedSettings = {
      userId: user.uid,
      currency,
      theme: "dark",
      language: "en",
      timezone,
      brokerSettings: {
        defaultLotSize: 0.1,
        defaultRiskPct: parseFloat(String(riskPct)) || 1,
        defaultBroker: broker,
        defaultEquity: parseFloat(String(defaultEquity)) || 10000,
      },
      notifications: userSettings?.notifications || {
        dailyReminder: true,
        summaries: true,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "settings", user.uid), updatedSettings);
      await refreshSettings();
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to update user settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }

    setPwdLoading(true);
    setPwdError(null);
    try {
      await updatePassword(user, newPassword);
      setPwdSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(false), 2000);
    } catch (err: any) {
      console.error(err);
      setPwdError(err.message || "Failed to update password. You may need to log in again to perform this sensitive action.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (
      !confirm(
        "CRITICAL WARNING: Are you sure you want to delete your account? This will permanently delete your settings, psychology logs, watchlists, goals, and all trading journal logs. This action cannot be undone."
      )
    )
      return;

    setDeleteLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Query all user docs to delete
      const collectionsToDelete = ["trades", "aiReports", "watchlists", "goals", "psychology"];
      for (const col of collectionsToDelete) {
        const q = query(collection(db, col), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          batch.delete(doc(db, col, d.id));
        });
      }

      // Delete settings and user doc
      batch.delete(doc(db, "settings", user.uid));
      batch.delete(doc(db, "users", user.uid));

      await batch.commit();

      // Delete Firebase User
      await deleteUser(user);
      router.push("/signup");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete account. You may need to sign out and log back in to verify credentials before deleting.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage your personal profile, set trading currencies, defaults, or modify secure credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-1">
            <UserIcon className="h-4 w-4" /> Edit Profile Details
          </h2>

          {profileSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded">
              <CheckCircle className="h-4 w-4" /> Profile details saved!
            </div>
          )}

          {/* Photo Uploader */}
          <div className="flex items-center gap-4">
            {profilePhoto ? (
              <img src={profilePhoto} alt="profile" className="h-16 w-16 rounded-full object-cover border border-gray-700" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                <UserIcon className="h-8 w-8" />
              </div>
            )}
            <div>
              <label className="flex items-center gap-1 px-3 py-1.5 border border-gray-800 hover:bg-gray-800 rounded text-xs font-semibold text-gray-300 cursor-pointer transition-colors">
                {photoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-blue-400" /> Upload Image
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="glass-input w-full py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              {profileLoading ? "Saving..." : "Save Details"}
            </button>
          </form>
        </div>

        {/* Global Settings defaults */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-1">
            <SettingsIcon className="h-4 w-4" /> Trading Preferences
          </h2>

          {settingsSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded">
              <CheckCircle className="h-4 w-4" /> Preferences saved!
            </div>
          )}

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
                >
                  <option value="UTC">UTC / GMT</option>
                  <option value="America/New_York">New York (EST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Kolkata">Kolkata (IST)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Default Broker</label>
                <input
                  type="text"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="glass-input w-full py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Risk %</label>
                <input
                  type="number"
                  step="any"
                  value={riskPct}
                  onChange={(e) => setRiskPct(parseFloat(e.target.value) || 1)}
                  className="glass-input w-full py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Default Start Equity ($)</label>
              <input
                type="number"
                value={defaultEquity}
                onChange={(e) => setDefaultEquity(parseFloat(e.target.value) || 10000)}
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={settingsLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              {settingsLoading ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-1">
            <Shield className="h-4 w-4" /> Change Credentials
          </h2>

          {pwdSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded">
              <CheckCircle className="h-4 w-4" /> Password changed!
            </div>
          )}

          {pwdError && (
            <div className="text-xs text-red-400 font-medium bg-red-500/5 p-2 rounded border border-red-500/10">
              {pwdError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input w-full py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input w-full py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              {pwdLoading ? "Processing..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Critical Delete Account Card */}
        <div className="glass-card rounded-xl p-5 space-y-4 border border-red-500/15">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Danger Zone
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Deleting your account will wipe all transaction histories, screenshots, objectives, and psychology logs.
          </p>

          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4.5 w-4.5" /> Permanently Delete Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
