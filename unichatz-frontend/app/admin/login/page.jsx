"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [key, setKey] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (!key.trim()) return;

    sessionStorage.setItem("adminKey", key);
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] text-[#2C2C2A]">
      <div className="bg-white p-10 rounded-3xl w-96 space-y-6 shadow-sm border border-black/7">
        <h1 className="text-2xl font-semibold text-center">
          Admin Access
        </h1>

        <input
          type="password"
          placeholder="Enter admin key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-black/12 outline-none text-[#2C2C2A] placeholder:text-[#888780] focus:border-black/20"
        />

        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl bg-[#2C2C2A] text-white font-medium hover:bg-black transition-colors"
        >
          Enter Dashboard
        </button>
      </div>
    </div>
  );
}