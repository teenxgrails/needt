"use client";

import { useEffect } from "react";

import Link from "next/link";

import { getAppVersion, getVersionGithubUrl } from "@/lib/version";

export default function NotFound() {
  useEffect(() => {
    document.title = "404 - Page Not Found";
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been
        moved.
      </p>
      <Link
        href="/"
        className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
      >
        Return Home
      </Link>
      <a
        href={getVersionGithubUrl()}
        target="_blank"
        rel="noopener noreferrer"
        title="View this version on GitHub"
        className="mt-8 text-xs text-gray-500 transition-colors hover:text-gray-700 hover:underline"
      >
        v{getAppVersion()}
      </a>
    </div>
  );
}
