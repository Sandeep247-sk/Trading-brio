"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  User,
  Shield,
  Database,
  Trash2,
  Save,
  Download,
  AlertTriangle,
  Check,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Calendar,
  ScrollText,
} from "lucide-react";
import Link from "next/link";

interface SettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();

  // Profile state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Export state
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  // Delete state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Profile update ---
  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
        router.refresh();
      } else {
        const data = await res.json();
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error" });
    }
    setProfileSaving(false);
  };

  // --- Password change ---
  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordMsg({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Network error" });
    }
    setPasswordSaving(false);
  };

  // --- Data export ---
  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);

      const res = await fetch(`/api/settings/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trading-os-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export data");
    }
    setExporting(false);
  };

  // --- Account deletion ---
  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        setDeleteMsg({ type: "success", text: "Account deleted. Signing out..." });
        setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
      } else {
        const data = await res.json();
        setDeleteMsg({ type: "error", text: data.error || "Failed to delete account" });
      }
    } catch {
      setDeleteMsg({ type: "error", text: "Network error" });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account, security, and preferences
          </p>
        </div>
      </div>

      {/* Profile */}
      <div className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-blue-950/30 border border-blue-900/20 flex items-center justify-center text-blue-400">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-200">Profile</h2>
            <p className="text-[10px] text-gray-500">Update your personal information</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {profileMsg && (
          <p className={`text-xs font-semibold ${profileMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {profileMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {profileSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-purple-950/30 border border-purple-900/20 flex items-center justify-center text-purple-400">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-200">Security</h2>
            <p className="text-[10px] text-gray-500">Change password and manage sessions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {passwordMsg && (
          <p className={`text-xs font-semibold ${passwordMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {passwordMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={handlePasswordChange}
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {passwordSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
            Change Password
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-950/30 border border-emerald-900/20 flex items-center justify-center text-emerald-400">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-200">Data Export</h2>
            <p className="text-[10px] text-gray-500">Download your trade journal data</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> From Date (optional)
            </label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> To Date (optional)
            </label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting}
            className="h-9 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            disabled={exporting}
            className="h-9 px-4 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
            Export JSON
          </button>
        </div>
      </div>

      {/* Audit Log Link */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-cyan-950/30 border border-cyan-900/20 flex items-center justify-center text-cyan-400">
              <ScrollText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-200">Audit Log</h2>
              <p className="text-[10px] text-gray-500">View all activity on your account</p>
            </div>
          </div>
          <Link
            href="/settings/audit-log"
            className="h-9 px-4 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ScrollText className="h-3.5 w-3.5" />
            View Audit Log
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card rounded-lg p-6 space-y-4 border-red-900/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-red-950/30 border border-red-900/20 flex items-center justify-center text-red-400">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-400">Danger Zone</h2>
            <p className="text-[10px] text-gray-500">Irreversible actions — proceed with caution</p>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-red-900/30 bg-red-950/10 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-400">
              Deleting your account will permanently remove all your trades, strategies, accounts, analytics, and violations data. This action <strong className="text-red-400">cannot be undone</strong>.
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400">Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your current password"
                className="w-full sm:w-80 h-10 px-3 bg-gray-950 border border-red-900/30 rounded text-sm text-gray-300 focus:outline-none focus:border-red-500"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.checked)}
                className="rounded border-gray-700 bg-gray-950 text-red-600 focus:ring-red-500"
              />
              I understand this is permanent and cannot be undone
            </label>
            {deleteMsg && (
              <p className={`text-xs font-semibold ${deleteMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {deleteMsg.text}
              </p>
            )}
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || !deleteConfirm || !deletePassword}
              className="h-9 px-4 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
