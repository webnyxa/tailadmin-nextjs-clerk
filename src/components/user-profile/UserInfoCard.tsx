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
  
  // Password setup/update state
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false);
  
  // Custom profile data from Clerk metadata
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: "",
  });
  
  // Use reverification hook for sensitive email changes
  const changePrimaryEmail = useReverification((emailAddressId: string) =>
    user?.update({ primaryEmailAddressId: emailAddressId })
  );

  useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setNewEmail(user.primaryEmailAddress?.emailAddress || "");
      
      // Check if user has password authentication enabled
      // Clerk exposes this via passwordEnabled property
      const hasPassword = user.passwordEnabled || false;
      setHasPasswordAuth(hasPassword);
      
      // Load custom profile data from Clerk metadata
      const metadata = (user.unsafeMetadata as {
        bio?: string;
        phone?: string;
        socialLinks?: {
          facebook?: string;
          twitter?: string;
          linkedin?: string;
          instagram?: string;
        };
      }) || {};
      
      setBio(metadata.bio || "");
      setPhone(metadata.phone || "");
      setSocialLinks({
        facebook: metadata.socialLinks?.facebook || "",
        twitter: metadata.socialLinks?.twitter || "",
        linkedin: metadata.socialLinks?.linkedin || "",
        instagram: metadata.socialLinks?.instagram || "",
      });
    }
  }, [isLoaded, user]);

  // Reset email verification state and form fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailStep("edit");
      setNewEmail(user?.primaryEmailAddress?.emailAddress || "");
      setEmailId(null);
      setVerificationCode("");
      setEmailBeingVerified("");
      setAlert(null);
      
      // Reset password fields
      setShowPasswordFields(false);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      
      // Reset form fields to current metadata values
      if (user) {
        const metadata = (user.unsafeMetadata as {
          bio?: string;
          phone?: string;
          socialLinks?: {
            facebook?: string;
            twitter?: string;
            linkedin?: string;
            instagram?: string;
          };
        }) || {};
        
        setBio(metadata.bio || "");
        setPhone(metadata.phone || "");
        setSocialLinks({
          facebook: metadata.socialLinks?.facebook || "",
          twitter: metadata.socialLinks?.twitter || "",
          linkedin: metadata.socialLinks?.linkedin || "",
          instagram: metadata.socialLinks?.instagram || "",
        });
      }
    }
  }, [isOpen, user]);

  const handleSendCode = async () => {
    if (!user || !isLoaded || !newEmail.trim()) {
      setAlert({ variant: "error", message: "Please enter a valid email address." });
      return;
    }

    const emailValue = newEmail.trim();
    const currentEmail = user.primaryEmailAddress?.emailAddress || "";

    // Validate email format FIRST - before any API calls
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setAlert({ variant: "error", message: "Please enter a valid email address." });
      setIsSendingCode(false);
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
      console.log("Full error object:", JSON.stringify(error, null, 2));
      console.log("Error.errors:", error?.errors);
      console.log("Error.errors[0]:", error?.errors?.[0]);
      console.log("Error.errors[0].errors:", error?.errors?.[0]?.errors);
      
      // Extract long_message from nested error structure
      // Clerk API response structure: { errors: [{ message, long_message, errors: [{ message, long_message }] }] }
      let longMessage = null;
      let errorMessage = null;
      
      // Method 1: Check nested errors array first (most specific - from network response)
      if (error?.errors?.[0]?.errors && Array.isArray(error.errors[0].errors) && error.errors[0].errors.length > 0) {
        const nestedError = error.errors[0].errors[0];
        longMessage = nestedError?.long_message;
        errorMessage = nestedError?.message;
        console.log("Found nested error - longMessage:", longMessage, "errorMessage:", errorMessage);
      }
      
      // Method 2: Check top level errors array
      if (!longMessage && error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        const firstError = error.errors[0];
        longMessage = firstError?.long_message;
        errorMessage = firstError?.message;
        console.log("Found top level error - longMessage:", longMessage, "errorMessage:", errorMessage);
      }
      
      // Method 3: Check direct error properties (for SDK wrapped errors)
      if (!longMessage) {
        longMessage = error?.long_message;
        errorMessage = error?.message;
        console.log("Found direct error - longMessage:", longMessage, "errorMessage:", errorMessage);
      }
      
      // Method 4: Check error.data (some SDKs wrap response in data)
      if (!longMessage && error?.data?.errors?.[0]) {
        const dataError = error.data.errors[0];
        longMessage = dataError?.long_message || dataError?.errors?.[0]?.long_message;
        errorMessage = dataError?.message || dataError?.errors?.[0]?.message;
        console.log("Found data error - longMessage:", longMessage, "errorMessage:", errorMessage);
      }
      
      // ALWAYS prioritize long_message over message
      const finalMessage = longMessage || errorMessage || "Failed to send verification code. Please try again.";
      console.log("Final message selected:", finalMessage);
      
      // Clean up error message - remove "Clerk:" prefix and code if present
      let cleanMessage = finalMessage.replace(/^Clerk:\s*/i, "").replace(/\(code="[^"]+"\)/g, "").trim();
      
      // For invalid email errors, ALWAYS use long_message if available
      const lowerError = cleanMessage.toLowerCase();
      if (lowerError.includes("invalid") || lowerError.includes("must be a valid") || lowerError === "is invalid") {
        // If we have longMessage, use it; otherwise use the clean message
        const displayMessage = longMessage ? longMessage.replace(/^Clerk:\s*/i, "").replace(/\(code="[^"]+"\)/g, "").trim() : cleanMessage;
        console.log("Setting invalid email error - displayMessage:", displayMessage);
        setAlert({ variant: "error", message: displayMessage || "Please enter a valid email address." });
      } else if (lowerError.includes("reverification") && !lowerError.includes("invalid")) {
        // Only show reverification if it's not an invalid email
        setAlert({ variant: "error", message: "Security verification required. Please sign out and sign in again, then try changing your email." });
      } else {
        setAlert({ variant: "error", message: cleanMessage });
      }
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

      // 1. Verify email with OTP code - this is mandatory
      // Only proceed if verification is successful
      let verificationSuccessful = false;
      
      try {
        await emailAddress.attemptVerification({ code: verificationCode.trim() });
        verificationSuccessful = true;
      } catch (verifyError: any) {
        const errorObj = verifyError?.errors?.[0] || verifyError;
        const errorMessage = errorObj?.long_message || errorObj?.message || verifyError?.message || "";
        const lowerErrorMessage = errorMessage.toLowerCase();
        
        // Check if error is "already verified" - email is already verified, skip verification
        if (lowerErrorMessage.includes("already verified")) {
          console.log("Email is already verified, setting as primary directly");
          verificationSuccessful = true;
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
          // Wrong OTP or other verification error - show proper error message and STOP
          let displayMessage = errorObj?.long_message || errorMessage || "Invalid verification code. Please check the code and try again.";
          
          // Clean up error message
          displayMessage = displayMessage.replace(/^Clerk:\s*/i, "").replace(/\(code="[^"]+"\)/g, "").trim();
          
          // Show user-friendly message
          if (displayMessage.toLowerCase().includes("invalid") || displayMessage.toLowerCase().includes("incorrect") || displayMessage.toLowerCase().includes("wrong")) {
            displayMessage = "Invalid verification code. Please check the code and try again.";
          }
          
          setAlert({ 
            variant: "error", 
            message: displayMessage 
          });
          setIsVerifying(false);
          return; // STOP - don't proceed if verification failed
        }
      }

      // Double check - only proceed if verification was successful
      if (!verificationSuccessful) {
        setAlert({ 
          variant: "error", 
          message: "Email verification failed. Please try again." 
        });
        setIsVerifying(false);
        return;
      }

      // Set as primary email using reverification wrapper
      // This handles reverification automatically when required
      try {
        if (changePrimaryEmail) {
          await changePrimaryEmail(emailAddress.id);
        } else {
          // Fallback if reverification hook is not available
          await user.update({
            primaryEmailAddressId: emailAddress.id,
          });
        }
      } catch (reverificationError: any) {
        // Handle reverification cancellation or errors
        const revErrorObj = reverificationError?.errors?.[0] || reverificationError;
        const revErrorMessage = revErrorObj?.long_message || revErrorObj?.message || reverificationError?.message || "";
        
        // Check if user cancelled reverification
        if (revErrorMessage.includes("cancelled") || revErrorMessage.includes("reverification_cancelled")) {
          setAlert({ 
            variant: "error", 
            message: "Verification was cancelled. Please try again." 
          });
          setIsVerifying(false);
          return;
        }
        
        // Check if reverification required
        if (revErrorMessage.toLowerCase().includes("reverification required") || revErrorMessage.toLowerCase().includes("reverification")) {
          setAlert({ 
            variant: "error", 
            message: "Security verification required. Please sign out and sign in again, then try changing your email." 
          });
          setIsVerifying(false);
          return;
        }
        
        // Other errors
        throw reverificationError;
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

      // Handle password setup/update if password fields are filled
      let passwordUpdated = false;
      if (showPasswordFields && newPassword.trim()) {
        // Validate password
        if (newPassword.length < 8) {
          setAlert({ 
            variant: "error", 
            message: "Password must be at least 8 characters long." 
          });
          setIsVerifying(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          setAlert({ 
            variant: "error", 
            message: "Passwords do not match. Please try again." 
          });
          setIsVerifying(false);
          return;
        }

        try {
          if (hasPasswordAuth) {
            // User has password - update it (requires current password)
            if (!currentPassword.trim()) {
              setAlert({ 
                variant: "error", 
                message: "Please enter your current password to update it." 
              });
              setIsVerifying(false);
              return;
            }

            await user.updatePassword({
              currentPassword: currentPassword.trim(),
              newPassword: newPassword.trim(),
            });
            passwordUpdated = true;
          } else {
            // OAuth user - create new password (no current password needed)
            // For OAuth users, we can use updatePassword with only newPassword
            // Clerk allows this for users without existing passwords
            await user.updatePassword({
              newPassword: newPassword.trim(),
            } as any); // Type assertion needed as Clerk types may not reflect this use case
            passwordUpdated = true;
            // Reload to update passwordEnabled status
            await user.reload();
            setHasPasswordAuth(true);
          }
        } catch (passwordError: any) {
          const passwordErrorObj = passwordError?.errors?.[0] || passwordError;
          const passwordErrorMessage = passwordErrorObj?.long_message || passwordErrorObj?.message || passwordError?.message || "";
          
          if (passwordErrorMessage.toLowerCase().includes("current password") || 
              passwordErrorMessage.toLowerCase().includes("incorrect")) {
            setAlert({ 
              variant: "error", 
              message: "Current password is incorrect. Please check and try again." 
            });
          } else if (passwordErrorMessage.toLowerCase().includes("reverification")) {
            setAlert({ 
              variant: "error", 
              message: "Security verification required. Please sign out and sign in again, then try updating your password." 
            });
          } else {
            setAlert({ 
              variant: "error", 
              message: passwordErrorMessage || "Failed to update password. Please try again." 
            });
          }
          setIsVerifying(false);
          return;
        }
      }

      setEmailStep("edit");
      setVerificationCode("");
      setEmailId(null);
      setNewEmail(user.primaryEmailAddress?.emailAddress || newEmail);

      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setShowPasswordFields(false);

      // Show success message based on what was updated
      let successMessage = "Email updated successfully!";
      if (passwordUpdated) {
        if (hasPasswordAuth) {
          successMessage = "Email and password updated successfully! You can now log in with your new email and password.";
        } else {
          successMessage = "Email updated and password set successfully! You can now log in with your new email and password, or continue using Google.";
        }
      } else {
        successMessage = "Email updated successfully! Your new email address is now active.";
      }

      setAlert({ 
        variant: "success", 
        message: successMessage
      });

      setTimeout(() => {
        closeModal();
        setAlert(null);
        setEmailStep("edit");
        setVerificationCode("");
        setEmailId(null);
        setEmailBeingVerified("");
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
        setShowPasswordFields(false);
        // No reload needed - user.reload() already updates the data
      }, 2000);
    } catch (error: any) {
      console.error("Error verifying email:", error);
      // Use long_message if available, otherwise fallback to message
      const errorObj = error?.errors?.[0] || error;
      let errorMessage = errorObj?.long_message || errorObj?.message || error?.message || "Invalid verification code. Please try again.";
      
      // Clean up error message - remove "Clerk:" prefix and code if present
      errorMessage = errorMessage.replace(/^Clerk:\s*/i, "").replace(/\(code="[^"]+"\)/g, "").trim();
      
      // Show user-friendly message
      if (errorMessage.toLowerCase().includes("cancelled")) {
        setAlert({ variant: "error", message: "Verification was cancelled. Please try again." });
      } else if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("incorrect")) {
        setAlert({ variant: "error", message: "Invalid verification code. Please check the code and try again." });
      } else {
        setAlert({ variant: "error", message: errorMessage });
      }
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
      // Use long_message if available, otherwise fallback to message
      const errorObj = error?.errors?.[0] || error;
      const errorMessage = errorObj?.long_message || errorObj?.message || error?.message || "Failed to resend code. Please try again.";
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

      // Update custom profile data in Clerk metadata
      const currentMetadata = (user.unsafeMetadata as Record<string, any>) || {};
      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          bio: bio.trim() || undefined,
          phone: phone.trim() || undefined,
          socialLinks: {
            facebook: socialLinks.facebook.trim() || undefined,
            twitter: socialLinks.twitter.trim() || undefined,
            linkedin: socialLinks.linkedin.trim() || undefined,
            instagram: socialLinks.instagram.trim() || undefined,
          },
        },
      });

      // Reload user to sync metadata changes
      await user.reload();

      setAlert({ variant: "success", message: "Profile updated successfully!" });
      
      setTimeout(() => {
        closeModal();
        setAlert(null);
        // No reload needed - user.reload() already updates the data
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
                {isLoaded && phone ? phone : "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Bio
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {isLoaded && bio ? bio : "—"}
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

      <Modal 
        isOpen={isOpen} 
        onClose={() => {
          setAlert(null); // Clear any error messages when closing
          closeModal();
        }} 
        className="max-w-[700px] m-4"
      >
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
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                      placeholder="https://www.facebook.com/yourprofile"
                    />
                  </div>

                  <div>
                    <Label>X.com</Label>
                    <Input 
                      type="text" 
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="https://x.com/yourprofile"
                    />
                  </div>

                  <div>
                    <Label>Linkedin</Label>
                    <Input
                      type="text"
                      value={socialLinks.linkedin}
                      onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                      placeholder="https://www.linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div>
                    <Label>Instagram</Label>
                    <Input
                      type="text"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      placeholder="https://instagram.com/yourprofile"
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
                        
                        {/* Optional Password Setup/Update Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {hasPasswordAuth ? "Update Password (Optional)" : "Set Password (Optional)"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {hasPasswordAuth 
                                  ? "Update your password to use with your new email address."
                                  : "Set a password to log in with your new email address. You can still use Google to sign in."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPasswordFields(!showPasswordFields)}
                              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                            >
                              {showPasswordFields ? "Hide" : "Show"}
                            </button>
                          </div>
                          
                          {showPasswordFields && (
                            <div className="space-y-3">
                              {hasPasswordAuth && (
                                <div>
                                  <Label>Current Password</Label>
                                  <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    disabled={isVerifying}
                                  />
                                </div>
                              )}
                              <div>
                                <Label>New Password</Label>
                                <Input
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Enter new password (min. 8 characters)"
                                  disabled={isVerifying}
                                />
                              </div>
                              <div>
                                <Label>Confirm New Password</Label>
                                <Input
                                  type="password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Confirm new password"
                                  disabled={isVerifying}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input 
                      type="text" 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                    />
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
