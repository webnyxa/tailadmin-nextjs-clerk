import { redirect } from "next/navigation";
import { getShortLinkByCode } from "@/lib/db";

export default async function ShortLinkRedirect({
  params,
}: {
  params: Promise<{ shortCode: string }> | { shortCode: string };
}) {
  // Handle both sync and async params (for Next.js compatibility)
  const resolvedParams = params instanceof Promise ? await params : params;
  const shortCode = resolvedParams?.shortCode?.trim();

  if (!shortCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
            Short Link Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            The short link you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Get the short link from database
  const shortLink = getShortLinkByCode(shortCode);

  if (!shortLink) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
            Short Link Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            The short link you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Redirect - this throws an error internally that Next.js catches
  // DO NOT wrap this in try-catch as it will break the redirect
  redirect(shortLink.originalUrl);
}
