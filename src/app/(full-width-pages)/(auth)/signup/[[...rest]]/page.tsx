import { SignUp as ClerkSignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign Up | TailAdmin",
  description: "Create your TailAdmin account",
};

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:py-10">
        <div className="flex justify-center">
          <ClerkSignUp
            path={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/signup"}
            routing="path"
            signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/login"}
            forceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/"}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full bg-transparent shadow-none p-0",
                headerTitle:
                  "mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md",
                headerSubtitle: "text-sm text-gray-500 dark:text-gray-400",
                socialButtonsBlockButton:
                  "inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10",
                dividerLine: "bg-gray-200 dark:bg-gray-800",
                dividerText:
                  "p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2",
                formFieldLabel:
                  "text-sm font-medium text-gray-700 dark:text-gray-400",
                formFieldInput:
                  "dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800",
                formButtonPrimary:
                  "flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600",
                footerActionLink:
                  "text-brand-500 hover:text-brand-600 dark:text-brand-400",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

