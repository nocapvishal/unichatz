"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import CreatePostSheet from "@/components/feed/CreatePostSheet";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white flex justify-around items-end pb-[20px] pt-2 max-w-[480px] mx-auto z-40" style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>
        
        {/* Feed */}
        <button 
          onClick={() => router.push("/feed")}
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isActive("/feed") ? "text-[#2C2C2A]" : "text-[#888780]"}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium mt-0.5">Feed</span>
        </button>

        {/* Match */}
        <button 
          onClick={() => router.push("/match")}
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isActive("/match") ? "text-[#2C2C2A]" : "text-[#888780]"}`}
        >
          <span className="text-xl">⚡</span>
          <span className="text-[10px] font-medium mt-0.5">Match</span>
        </button>

        {/* FAB Compose */}
        <div className="relative w-16 flex justify-center h-12">
          <button
            onClick={() => setOpen(true)}
            className="absolute -top-4 w-[44px] h-[44px] rounded-full bg-[#2C2C2A] text-white flex items-center justify-center shadow-sm"
            style={{ border: "3px solid #F7F5F0" }}
          >
            <span className="text-2xl leading-none -mt-0.5">+</span>
          </button>
        </div>

        {/* Inbox */}
        <button 
          onClick={() => router.push("/inbox")}
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isActive("/inbox") ? "text-[#2C2C2A]" : "text-[#888780]"}`}
        >
          <span className="text-xl">💬</span>
          <span className="text-[10px] font-medium mt-0.5">Inbox</span>
        </button>

        {/* Profile */}
        <button 
          onClick={() => router.push("/profile")}
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isActive("/profile") ? "text-[#2C2C2A]" : "text-[#888780]"}`}
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </button>

      </div>

      {open && <CreatePostSheet onClose={() => setOpen(false)} />}
    </>
  );
}