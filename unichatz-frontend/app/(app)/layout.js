"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import SocketProvider from "@/context/SocketProvider";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (isMounted) {
          if (response.ok) {
            setIsAuthenticated(true);
            setCheckingSession(false);
          } else {
            router.replace(
              `/login?next=${encodeURIComponent(pathname || "/feed")}`
            );
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (isMounted) {
          router.replace(
            `/login?next=${encodeURIComponent(pathname || "/feed")}`
          );
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-[#2C2C2A]">
        <div className="text-sm text-[#888780]">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // ✅ AUTHENTICATED + SOCKET ENABLED
  return (
    <SocketProvider>
      <div className="min-h-screen bg-[#F7F5F0] pb-20 text-[#2C2C2A]">
        {children}
        <BottomNav />
      </div>
    </SocketProvider>
  );
}