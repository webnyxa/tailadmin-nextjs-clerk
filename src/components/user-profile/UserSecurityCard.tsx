"use client";
import React, { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Alert from "../ui/alert/Alert";

interface Session {
  id: string;
  lastActiveAt: number;
  lastActiveOrganizationId: string | null;
  actor: any;
  expireAt: number;
}

export default function UserSecurityCard() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const { isOpen: isPasswordModalOpen, openModal: openPasswordModal, closeModal: closePasswordModal } = useModal();
  const { isOpen: isSessionsModalOpen, openModal: openSessionsModal, closeModal: closeSessionsModal } = useModal();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      const data = await response.json();
      
      if (response.ok) {
        setSessions(data.sessions || []);
      } else {
        console.error("Sessions API error:", data.error);
        // Set empty array on error so UI doesn't break
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      // Set empty array on error so UI doesn't break
      setSessions([]);
    }
  };

  useEffect(() => {
    if (isSessionsModalOpen && user) {
      // Fetch sessions when modal opens
      fetchSessions();
      
      // Also refresh after a short delay to ensure we get the latest data
      // This helps if sessions were recently revoked
      const refreshTimeout = setTimeout(() => {
        fetchSessions();
      }, 500);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [isSessionsModalOpen, user]);

  const handlePasswordChange = async () => {
    if (!user || !isLoaded) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setAlert({ variant: "error", message: "All fields are required." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ variant: "error", message: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setAlert({ variant: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    setIsChangingPassword(true);
    setAlert(null);

    try {
      // Check if reverification is needed first
      // If user needs reverification, Clerk will throw an error
      // We'll handle it gracefully
      
      await user.updatePassword({
        currentPassword,
        newPassword,
      });

      setAlert({ variant: "success", message: "Password changed successfully!" });
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        closePasswordModal();
        setAlert(null);
      }, 1500);
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      // Handle reverification required error
      const errorMessage = error?.errors?.[0]?.message || error?.message || "";
      
      if (errorMessage.toLowerCase().includes("reverification") || 
          errorMessage.toLowerCase().includes("verification required") ||
          error?.status === 403) {
        setAlert({
          variant: "error",
          message: "Security verification required. Please sign out and sign in again, then try changing your password.",
        });
      } else if (errorMessage.toLowerCase().includes("current password") || 
                 errorMessage.toLowerCase().includes("incorrect")) {
        setAlert({
          variant: "error",
          message: "Current password is incorrect. Please check and try again.",
        });
      } else {
        setAlert({
          variant: "error",
          message: errorMessage || "Failed to change password. Please try again.",
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!user) return;

    if (!confirm("Are you sure you want to sign out from all devices? You will need to sign in again.")) {
      return;
    }

    setIsRevokingAll(true);
    setAlert(null);

    try {
      const response = await fetch("/api/sessions/revoke-all", {
        method: "POST",
      });

      if (response.ok) {
        setAlert({ variant: "success", message: "Signed out from all devices successfully!" });
        
        // Refresh sessions list to show updated count (should be 0 or 1)
        // Wait a moment for Clerk API to update session statuses
        setTimeout(() => {
          fetchSessions();
        }, 300);
        
        // Sign out after showing success message
        setTimeout(async () => {
          await signOut({ redirectUrl: "/login" });
        }, 1500);
      } else {
        const data = await response.json();
        setAlert({ variant: "error", message: data.error || "Failed to revoke sessions." });
      }
    } catch (error: any) {
      console.error("Error revoking sessions:", error);
      setAlert({ variant: "error", message: "Failed to revoke sessions. Please try again." });
    } finally {
      setIsRevokingAll(false);
    }
  };

  const lastSignInAt = user?.lastSignInAt 
    ? formatDate(user.lastSignInAt.getTime())
    : "Never";

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Security & Sessions
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Last Login
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {isLoaded ? lastSignInAt : "Loading..."}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Active Sessions
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {sessions.length > 0 ? `${sessions.length} device(s)` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <button
              onClick={openPasswordModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
              Change Password
            </button>
            <button
              onClick={openSessionsModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 0C4.03779 0 0 4.03779 0 9C0 13.9622 4.03779 18 9 18C13.9622 18 18 13.9622 18 9C18 4.03779 13.9622 0 9 0ZM9 16.2C5.0316 16.2 1.8 12.9684 1.8 9C1.8 5.0316 5.0316 1.8 9 1.8C12.9684 1.8 16.2 5.0316 16.2 9C16.2 12.9684 12.9684 16.2 9 16.2ZM9 4.5C8.17157 4.5 7.5 5.17157 7.5 6C7.5 6.82843 8.17157 7.5 9 7.5C9.82843 7.5 10.5 6.82843 10.5 6C10.5 5.17157 9.82843 4.5 9 4.5ZM9 9.9C8.17157 9.9 7.5 10.5716 7.5 11.4V13.5C7.5 14.3284 8.17157 15 9 15C9.82843 15 10.5 14.3284 10.5 13.5V11.4C10.5 10.5716 9.82843 9.9 9 9.9Z"
                  fill=""
                />
              </svg>
              Manage Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={closePasswordModal} className="max-w-[500px] m-4">
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Change Password
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Enter your current password and choose a new one.
            </p>
          </div>
          {alert && (
            <div className="mb-4 px-2">
              <Alert
                variant={alert.variant}
                title={alert.variant === "success" ? "Success" : "Error"}
                message={alert.message}
                showLink={false}
              />
            </div>
          )}
          <form className="flex flex-col">
            <div className="px-2 pb-3">
              <div className="space-y-5">
                <div>
                  <Label>Current Password</Label>
                  <Input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                  />
                </div>

                <div>
                  <Label>Confirm New Password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={closePasswordModal}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !isLoaded}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Manage Sessions Modal */}
      <Modal isOpen={isSessionsModalOpen} onClose={closeSessionsModal} className="max-w-[600px] m-4">
        <div className="relative w-full max-w-[600px] rounded-3xl bg-white dark:bg-gray-900 lg:p-11">
          <div className="px-4 pt-4 pr-14 lg:px-11 lg:pt-11">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Active Sessions
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Manage your active sessions across all devices.
            </p>
          </div>
          {alert && (
            <div className="mb-4 px-4 lg:px-11">
              <Alert
                variant={alert.variant}
                title={alert.variant === "success" ? "Success" : "Error"}
                message={alert.message}
                showLink={false}
              />
            </div>
          )}
          {/* Scrollable sessions list */}
          <div className="px-4 pb-3 lg:px-11 max-h-[400px] overflow-y-auto custom-scrollbar">
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        Device {index + 1}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Last active: {formatDate(session.lastActiveAt)}
                      </p>
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs font-medium text-success-600 bg-success-50 rounded dark:bg-success-500/15">
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active sessions found.</p>
            )}
          </div>
          {/* Fixed footer buttons */}
          <div className="flex items-center gap-3 px-4 pb-4 pt-4 border-t border-gray-200 dark:border-gray-800 lg:px-11 lg:pb-11 lg:justify-end">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={closeSessionsModal}
              disabled={isRevokingAll}
            >
              Close
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRevokeAllSessions}
              disabled={isRevokingAll || sessions.length === 0}
              className="border-error-500 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/15"
            >
              {isRevokingAll ? "Signing out..." : "Sign Out All Devices"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
