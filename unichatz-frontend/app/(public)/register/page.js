"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { connectSocket } from "@/lib/socket";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try localStorage first, then URL param
    const stored = localStorage.getItem("pendingEmail");
    const param = searchParams.get("email");
    const resolved = stored || param || null;

    if (resolved) {
      setEmail(resolved);
      // Ensure localStorage has it for the registration call
      if (!stored && param) {
        localStorage.setItem("pendingEmail", param);
      }
    } else {
      router.replace("/verify");
    }
  }, [searchParams, router]);

  async function handleRegister() {
    setError("");

    if (!email) {
      router.replace("/verify");
      return;
    }

    if (!password || !gender) {
      setError("Please fill all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, gender }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = (data.message || "").toLowerCase();
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          // User is already registered — send them to login
          router.push("/login");
          return;
        }

        setError(data.message || "Registration failed");
        return;
      }

      localStorage.removeItem("pendingEmail");
      connectSocket();
      router.push("/intent");
      router.refresh();
    } catch {
      setError("Server error. Please try again.");
    }
  }
  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-[#888780]">
        Loading...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-[#2C2C2A]">
      <div className="w-96 space-y-5 rounded-3xl border border-black/10 bg-white p-10 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Complete Registration</h1>
          <p className="text-sm text-[#888780]">{email}</p>
        </div>

        <div className="space-y-1">
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
            className="w-full rounded-xl border border-black/12 bg-white px-4 py-3 outline-none text-[#2C2C2A] placeholder:text-[#888780] focus:border-black/20"
          />
          <p className="text-xs text-[#888780] pl-1">Minimum 8 characters</p>
        </div>

        <select
          value={gender}
          onChange={(e) => { setGender(e.target.value); setError(""); }}
          className="w-full rounded-xl border border-black/12 bg-white px-4 py-3 outline-none text-[#2C2C2A] focus:border-black/20"
        >
          <option value="" className="text-[#888780]">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button onClick={handleRegister} className="w-full rounded-xl bg-[#2C2C2A] py-3 font-medium text-white transition-colors hover:bg-black">
          Register
        </button>
      </div>
    </main>
  );
}