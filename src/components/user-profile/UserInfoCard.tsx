"use client";
import React, { useState, useEffect } from "react";
import { useUser, useReverification } from "@clerk/nextjs";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Alert from "../ui/alert/Alert";

export default function UserInfoCard() {
  const { isLoaded, user } = useUser();
  const { isOpen, openModal, closeModal } = useModal();
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailId, setEmailId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [emailStep, setEmailStep] = useState<"edit" | "verify">("edit");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailBeingVerified, setEmailBeingVerified] = useState<string>(""); // Store email that code was sent to
  
  // Use reverification hook for sensitive email changes
  const changePrimaryEmail = useReverification((emailAddressId: string) =>
    user?.update({ primaryEmailAddressId: emailAddressId })
  );

  useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setNewEmail(user.primaryEmailAddress?.emailAddress || "");
    }
  }, [isLoaded, user]);

  // Reset email verification state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailStep("edit");
      setNewEmail(user?.primaryEmailAddress?.emailAddress || "");
      setEmailId(null);
      setVerificationCode("");
      setEmailBeingVerified("");
      setAlert(null);
    }
  }, [isOpen, user]);

  const handleSendCode = async () => {
    if (!user || !isLoaded || !newEmail.trim()) {
      setAlert({ variant: "error", message: "Please enter a valid email address." });
      return;
    }

    const emailValue = newEmail.trim();
    const currentEmail = user.primaryEmailAddress?.emailAddress || "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setAlert({ variant: "error", message: "Please enter a valid email address." });
      return;
    }

    if (emailValue === currentEmail) {
      setAlert({ variant: "error", message: "This is already your primary email address." });
      return;
    }

    setIsSendingCode(true);
    setAlert(null);

    try {
      let emailAddress = user.emailAddresses.find(
        (emailAddr) => emailAddr.emailAddress === emailValue
      );

      if (!emailAddress) {
        emailAddress = await user.createEmailAddress({ email: emailValue });
        await user.reload();
        emailAddress = user.emailAddresses.find(
          (emailAddr) => emailAddr.emailAddress === emailValue
        );
      }

      if (!emailAddress) {
        throw new Error("Failed to create email address");
      }

      await emailAddress.prepareVerification({ strategy: "email_code" });

      setEmailId(emailAddress.id);
      setEmailBeingVerified(emailValue); // Store the email we're verifying
      setEmailStep("verify");
      setAlert({ 
        variant: "success", 
        message: "✅ Verification code sent to " + emailValue + ". Please check your inbox and enter the code below." 
      });
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      const errorMessage = error?.errors?.[0]?.message || error?.message || "Failed to send verification code. Please try again.";
      setAlert({ variant: "error", message: errorMessage });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (!user || !isLoaded || !emailId || !verificationCode.trim()) {
      setAlert({ variant: "error", message: "Please enter the verification code." });
      return;
    }

    setIsVerifying(true);
    setAlert(null);

    try {
      const emailAddress = user.emailAddresses.find((e) => e.id === emailId);

      if (!emailAddress) {
        throw new Error("Email address not found. Please try again.");
      }

      try {
        await emailAddress.attemptVerification({ code: verificationCode.trim() });
      } catch (verifyError: any) {
        const errorMessage = verifyError?.errors?.[0]?.message || verifyError?.message || "";
        const lowerErrorMessage = errorMessage.toLowerCase();
        
        // Check if error is "already verified" - email is already verified, skip verification
        if (lowerErrorMessage.includes("already verified")) {
          console.log("Email is already verified, setting as primary directly");
        } 
        // Check if error is "reverification required" - user needs to reverify their session
        else if (lowerErrorMessage.includes("reverification required") || lowerErrorMessage.includes("reverification")) {
          setAlert({ 
            variant: "error", 
            message: "Security verification required. Please sign out and sign in again, then try changing your email." 
          });
          setIsVerifying(false);
          return;
        } else {
          // Some other verification error, throw it
          throw verifyError;
        }
      }

      // Set as primary email using reverification wrapper
      // This handles reverification automatically when required
      if (changePrimaryEmail) {
        await changePrimaryEmail(emailAddress.id);
      } else {
        // Fallback if reverification hook is not available
        await user.update({
          primaryEmailAddressId: emailAddress.id,
        });
      }

      const oldPrimaryEmail = user.primaryEmailAddress;
      if (oldPrimaryEmail && oldPrimaryEmail.id !== emailAddress.id) {
        try {
          await oldPrimaryEmail.destroy();
        } catch (destroyError) {
          console.log("Could not remove old email (this is okay):", destroyError);
        }
      }

      await user.reload();

      setEmailStep("edit");
      setVerificationCode("");
      setEmailId(null);
      setNewEmail(user.primaryEmailAddress?.emailAddress || newEmail);

      setAlert({ 
        variant: "success", 
        message: "Email updated successfully! Your new email address is now active." 
      });

      setTimeout(() => {
        closeModal();
        setAlert(null);
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error verifying email:", error);
      const errorMessage = error?.errors?.[0]?.message || error?.message || "Invalid verification code. Please try again.";
      setAlert({ variant: "error", message: errorMessage });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!user || !emailId) return;
    
    setIsSendingCode(true);
    setAlert(null);

    try {
      const emailAddress = user.emailAddresses.find((e) => e.id === emailId);
      if (emailAddress) {
        await emailAddress.prepareVerification({ strategy: "email_code" });
        setAlert({ 
          variant: "success", 
          message: "✅ Verification code resent to " + (emailAddress.emailAddress || newEmail) + ". Please check your inbox." 
        });
      }
    } catch (error: any) {
      console.error("Error resending code:", error);
      const errorMessage = error?.errors?.[0]?.message || error?.message || "Failed to resend code. Please try again.";
      setAlert({ variant: "error", message: errorMessage });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSave = async () => {
    if (!user || !isLoaded) return;

    setIsSaving(true);
    setAlert(null);

    try {
      const firstNameValue = firstName.trim();
      const lastNameValue = lastName.trim();
      const currentEmail = user.primaryEmailAddress?.emailAddress || "";
      const emailValue = newEmail.trim();

      // Check if email is being changed
      if (emailValue && emailValue !== currentEmail) {
        setIsSaving(false);
        try {
          await handleSendCode();
        } catch (error) {
          // Error already handled in handleSendCode
        }
        return;
      }

      if (!firstNameValue && !lastNameValue) {
        setAlert({ variant: "error", message: "First name or last name is required." });
        setIsSaving(false);
        return;
      }

      await user.update({
        firstName: firstNameValue || undefined,
        lastName: lastNameValue || undefined,
      });

      setAlert({ variant: "success", message: "Profile updated successfully!" });
      
      setTimeout(() => {
        closeModal();
        setAlert(null);
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setAlert({
        variant: "error",
        message: error?.errors?.[0]?.message || "Failed to update profile. Please try again.",
      });
      setIsSaving(false);
    }
  };
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                First Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {isLoaded && user?.firstName ? user.firstName : "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {isLoaded && user?.lastName ? user.lastName : "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {isLoaded && user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress : "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phone
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                +09 363 398 46
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Bio
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Team Manager
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openModal}
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
          Edit
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
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
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Social Links
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Facebook</Label>
                    <Input
                      type="text"
                      defaultValue="https://www.facebook.com/PimjoHQ"
                    />
                  </div>

                  <div>
                    <Label>X.com</Label>
                    <Input type="text" defaultValue="https://x.com/PimjoHQ" />
                  </div>

                  <div>
                    <Label>Linkedin</Label>
                    <Input
                      type="text"
                      defaultValue="https://www.linkedin.com/company/pimjo"
                    />
                  </div>

                  <div>
                    <Label>Instagram</Label>
                    <Input
                      type="text"
                      defaultValue="https://instagram.com/PimjoHQ"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    {emailStep === "edit" ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Current: <span className="font-medium">{user?.primaryEmailAddress?.emailAddress || "No email"}</span>
                          </p>
                          <Input 
                            type="email" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter your new email address"
                            disabled={isSendingCode || isSaving}
                          />
                        </div>
                        {newEmail !== (user?.primaryEmailAddress?.emailAddress || "") && newEmail.trim() && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ Click "Save Changes" to send verification code to this email
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                            📧 Verification Code Sent
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Code sent to: <span className="font-medium">{emailBeingVerified || newEmail}</span>
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Please check your inbox and enter the 6-digit code below.
                          </p>
                        </div>
                        <Input 
                          type="text" 
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit verification code"
                          disabled={isVerifying}
                          className="text-center text-lg tracking-widest font-mono"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={isSendingCode}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                          >
                            {isSendingCode ? "Sending..." : "Resend Code"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailStep("edit");
                              setVerificationCode("");
                              setEmailId(null);
                              setAlert(null);
                            }}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            ← Change email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" defaultValue="+09 363 398 46" />
                  </div>

                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input type="text" defaultValue="Team Manager" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={closeModal}
                disabled={isSaving || isVerifying || isSendingCode}
              >
                Close
              </Button>
              {emailStep === "verify" ? (
                <Button 
                  size="sm" 
                  onClick={handleVerify}
                  disabled={isVerifying || !verificationCode.trim() || !isLoaded}
                >
                  {isVerifying ? "Verifying..." : "Verify & Save"}
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving || !isLoaded || isSendingCode}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
