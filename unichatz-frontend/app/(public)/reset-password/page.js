"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");

  async function handleReset() {
    if (!password) return alert("Enter new password");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            token,
            newPassword: password,
          }),
        }
      );

      const data = await res.json();
      alert(data.message);

    } catch (err) {
      alert("Server error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F5F0] text-[#2C2C2A]">
      <div className="bg-white p-10 rounded-3xl w-96 space-y-6 shadow-sm border border-black/10">

        <h1 className="text-2xl font-semibold text-center">
          Set New Password
        </h1>

        <input
          type="password"
          placeholder="New password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-black/12 outline-none text-[#2C2C2A] placeholder:text-[#888780] focus:border-black/20"
        />

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl bg-[#2C2C2A] text-white font-medium hover:bg-black transition-colors"
        >
          Reset Password
        </button>

      </div>
    </main>
  );
}