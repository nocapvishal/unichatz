"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F7F5F0] text-[#2C2C2A]">

      <div className="relative w-full max-w-xl px-10 py-14 rounded-[32px] bg-white border border-black/10 shadow-sm text-center space-y-8">

        <div className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight text-[#2C2C2A]">
            Blind<span className="text-[#888780]">Chat</span>
          </h1>

          <p className="text-[#888780] text-lg">
            Anonymous conversations. Real-time. Students only.
          </p>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="w-full py-4 rounded-2xl bg-[#2C2C2A] text-white text-lg font-semibold hover:bg-black transition-colors duration-300"
        >
          Enter Campus →
        </button>

        <p className="text-xs text-[#888780]">
          Students of Pondicherry University only.
        </p>
      </div>
    </main>
  );
}