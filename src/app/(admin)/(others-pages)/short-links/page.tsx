"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { CopyIcon, ChevronLeftIcon, ArrowRightIcon } from "@/icons/index";

interface ShortLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  clickCount: number;
}

export default function ShortLinksPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/short-links?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch short links");
      }
      const data = await response.json();
      setLinks(data.links);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [page, limit]);

  const handleCopy = async (shortCode: string) => {
    const baseUrl = window.location.origin;
    const shortLink = `${baseUrl}/s/${shortCode}`;
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopiedId(shortCode);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Short Links" />
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="p-6 border-b border-gray-200 dark:border-white/[0.05]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  All Short Links
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total: {total} links
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Items per page:
                </label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : links.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No short links found. Create your first short link!
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Short Link
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Original URL
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Created At
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Clicks
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {links.map((link) => {
                      const baseUrl = window.location.origin;
                      const shortLink = `${baseUrl}/s/${link.shortCode}`;
                      return (
                        <TableRow key={link.id}>
                          <TableCell className="px-5 py-4 text-start">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-brand-500 dark:text-brand-400 text-sm">
                                {shortLink}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <span
                              className="text-gray-600 dark:text-gray-400 text-sm"
                              title={link.originalUrl}
                            >
                              {truncateUrl(link.originalUrl)}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                              {formatDate(link.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                              {link.clickCount}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(link.shortCode)}
                              startIcon={<CopyIcon />}
                            >
                              {copiedId === link.shortCode ? "Copied!" : "Copy"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-200 dark:border-white/[0.05] flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} links
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      startIcon={<ChevronLeftIcon />}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-600 dark:text-gray-400 px-3">
                      Page {page} of {totalPages}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      endIcon={<ArrowRightIcon />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
