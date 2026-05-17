"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

const CAMPUS_DOMAIN = "@pondiuni.ac.in";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function LoginCardSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"email" | "password">("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill email if passed via URL (e.g. from /verify redirect)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!normalizedEmail.endsWith(CAMPUS_DOMAIN)) {
      setError("Use your university email.");
      return;
    }

    try {
      setLoading(true);

      /* STEP 1 — CHECK USER EXISTS */

      if (step === "email") {
        const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        const data = await response.json();

        if (data.exists) {
          setStep("password");
        } else {
          // New user — save email and go straight to registration
          localStorage.setItem("pendingEmail", normalizedEmail);
          router.push(`/register?email=${normalizedEmail}`);
        }

        return;
      }

      /* STEP 2 — LOGIN */

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ Send and receive cookies
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // ✅ FIXED: Use window.location for hard navigation to ensure cookies are properly sent
      // This forces a full page reload which ensures the cookie is available
      window.location.href = "/feed";

    } catch (err) {
      console.error("Login error:", err);
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-[#F7F5F0] text-[#2C2C2A]">

      <header className="absolute top-6 left-6 text-sm font-semibold tracking-widest text-[#888780]">
        UNICHATZ
      </header>

      <Card className="relative w-full max-w-md border border-black/10 bg-white shadow-sm text-[#2C2C2A]">

        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-[#2C2C2A]">
            {step === "email" ? "Enter Campus" : "Welcome back"}
          </CardTitle>
          {step === "email" && (
            <p className="text-sm text-[#888780] mt-1">
              Enter your university email to sign in or create an account.
            </p>
          )}
        </CardHeader>

        <CardContent>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* EMAIL */}

            <div>
              <Label>Email</Label>

              <div className="relative mt-2">

                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#888780]" />

                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`you${CAMPUS_DOMAIN}`}
                  className="pl-10 bg-white border border-black/12 focus:border-black/20 outline-none text-[#2C2C2A] placeholder:text-[#888780] shadow-none"
                />

                {/* Domain Suggestion */}
                {email.includes("@") && !email.endsWith(CAMPUS_DOMAIN) && (
                  <button
                    type="button"
                    onClick={() => {
                      const [username] = email.split("@");
                      setEmail(username + CAMPUS_DOMAIN);
                    }}
                    className="mt-2 text-xs font-medium text-[#7F77DD] hover:underline flex items-center gap-1 animate-in fade-in slide-in-from-top-1"
                  >
                    Suggest: {email.split("@")[0]}{CAMPUS_DOMAIN}
                  </button>
                )}

              </div>
            </div>

            {/* PASSWORD STEP */}

            {step === "password" && (
              <div>
                <Label>Password</Label>

                <div className="relative mt-2">

                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#888780]" />

                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white border border-black/12 focus:border-black/20 outline-none text-[#2C2C2A] placeholder:text-[#888780] shadow-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#888780] hover:text-[#2C2C2A]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#2C2C2A] text-white font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Please wait..."
                : step === "email"
                ? "Continue"
                : "Sign in"}
            </button>

          </form>

        </CardContent>

      </Card>
    </section>
  );
}