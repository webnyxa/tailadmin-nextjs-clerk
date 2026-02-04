"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { CopyIcon, CheckCircleIcon } from "@/icons/index";

export default function ShortenPage() {
  const [url, setUrl] = useState("");
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShorten = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setShortLink(null);

    try {
      const response = await fetch("/api/short-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create short link");
      }

      const data = await response.json();
      const baseUrl = window.location.origin;
      setShortLink(`${baseUrl}/s/${data.shortCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create short link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortLink) return;

    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Shorten URL" />
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
              Shorten Your Long URLs Quickly
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Paste your long URL below and get a short version instantly.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="https://example.com/very/long/url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                error={!!error}
                hint={error || undefined}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleShorten}
              disabled={loading || !url.trim()}
              className="w-full sm:w-auto"
            >
              {loading ? "Shortening..." : "Shorten"}
            </Button>

            {shortLink && (
              <div className="mt-6 space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/[0.05]">
                <div>
                  <Input
                    type="text"
                    value={shortLink}
                    readOnly
                    className="w-full bg-white dark:bg-gray-900"
                  />
                </div>
                <Button
                  onClick={handleCopy}
                  variant="primary"
                  className="w-full sm:w-auto"
                  startIcon={copied ? <CheckCircleIcon /> : <CopyIcon />}
                >
                  {copied ? "Link has been copied!" : "Copy to clipboard"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
