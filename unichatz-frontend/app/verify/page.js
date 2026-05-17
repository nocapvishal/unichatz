"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to the unified login page, preserving any email param
    const email = searchParams.get("email");
    if (email) {
      router.replace(`/login?email=${email}`);
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-[#888780]">
      Redirecting...
    </main>
  );
}