"use client";

import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleSubmit() {
    if (!email) return alert("Enter email");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
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
          Reset Password
        </h1>

        <div className="relative">
          <input
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-black/12 outline-none text-[#2C2C2A] placeholder:text-[#888780] focus:border-black/20"
          />
          {email.includes("@") && !email.endsWith("@pondiuni.ac.in") && (
            <button
              type="button"
              onClick={() => {
                const [username] = email.split("@");
                setEmail(username + "@pondiuni.ac.in");
              }}
              className="mt-2 text-xs font-medium text-[#7F77DD] hover:underline"
            >
              Suggest: {email.split("@")[0]}@pondiuni.ac.in
            </button>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-[#2C2C2A] text-white font-medium hover:bg-black transition-colors"
        >
          Send Reset Link
        </button>

      </div>
    </main>
  );
}