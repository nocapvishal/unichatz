"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function MatchPage() {
  const socket = getSocket();
  const router = useRouter();

  const [counts, setCounts] = useState({
    friendship: 0,
    dating: 0,
    casual: 0,
  });

  const [displayCounts, setDisplayCounts] = useState({
    friendship: 0,
    dating: 0,
    casual: 0,
  });

  const [seconds, setSeconds] = useState(0);
  const [relaxed, setRelaxed] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState(false);

  const timerRef = useRef(null);

  /* =========================
     Dynamic Headline
  ========================== */

  const getHeadline = () => {
    if (seconds < 6) return "Scanning the network...";
    if (seconds < 12) return "Aligning energy...";
    return "Almost there...";
  };

  /* =========================
     Animated Count Up
  ========================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayCounts((prev) => ({
        friendship:
          prev.friendship < counts.friendship
            ? prev.friendship + 1
            : counts.friendship,
        dating:
          prev.dating < counts.dating ? prev.dating + 1 : counts.dating,
        casual:
          prev.casual < counts.casual ? prev.casual + 1 : counts.casual,
      }));
    }, 35);

    return () => clearInterval(interval);
  }, [counts]);

  /* =========================
     Initial Load
  ========================== */

  useEffect(() => {
    let isMounted = true;

    const handleCounts = (data) => {
      if (isMounted) {
        setCounts(data);
        setLoading(false);
      }
    };

    const handleMatch = (data) => {
      clearInterval(timerRef.current);
      if (isMounted) setMatched(true);

      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);

      localStorage.setItem("activeRoom", data.roomId);
      localStorage.setItem("partnerAlias", data.partner.alias);
      localStorage.setItem("partnerTier", data.partner.tier);

      setTimeout(() => {
        if (isMounted) router.push("/chat");
      }, 900);
    };

    async function checkAuthAndPreferences() {
      // 1. Check local cache first for instant load
      const cachedPrefs = localStorage.getItem("preferences");
      if (cachedPrefs) {
        const preferences = JSON.parse(cachedPrefs);
        if (isMounted) {
          if (!socket.connected) socket.connect();
          socket.emit("start-search", preferences);
        }
        return;
      }

      // 2. Fetch profile from DB to check onboardingComplete state
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (isMounted) router.push("/login");
          return;
        }

        const data = await res.json();
        const user = data.user;

        if (user && user.onboardingComplete) {
          // Construct fallback preferences based on DB profile
          const fallbackPrefs = {
            gender: user.gender || "other",
            preference: "any",
            intent: "friendship",
          };
          localStorage.setItem("preferences", JSON.stringify(fallbackPrefs));

          if (isMounted) {
            if (!socket.connected) socket.connect();
            socket.emit("start-search", fallbackPrefs);
          }
        } else {
          if (isMounted) router.push("/intent");
        }
      } catch (err) {
        console.error("Error verifying preferences state:", err);
        if (isMounted) router.push("/intent");
      }
    }

    // Set up socket listeners
    socket.on("online-counts", handleCounts);
    socket.on("match-found", handleMatch);

    // Run auth check and preference initialization
    checkAuthAndPreferences();

    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timerRef.current);
      socket.off("online-counts", handleCounts);
      socket.off("match-found", handleMatch);
      socket.emit("cancel-search");
    };
  }, [router]);

  /* =========================
     Timeout Logic
  ========================== */

  useEffect(() => {
    if (seconds >= 25 && !relaxed) {
      setTimeoutReached(true);
    }
  }, [seconds, relaxed]);

  const totalOnline =
    counts.friendship + counts.dating + counts.casual;

  const estimatedWait =
    totalOnline === 0
      ? "No one online"
      : totalOnline < 5
      ? "≈ 30–60 sec"
      : totalOnline < 15
      ? "≈ 15–30 sec"
      : "Almost instant";

  const handleRelax = () => {
    const prefs = JSON.parse(localStorage.getItem("preferences"));
    if (!prefs) return;

    const relaxedPrefs = { ...prefs, preference: "any" };

    localStorage.setItem("preferences", JSON.stringify(relaxedPrefs));

    socket.emit("cancel-search");
    socket.emit("start-search", relaxedPrefs);

    setRelaxed(true);
    setTimeoutReached(false);
    setSeconds(0);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#F7F5F0] text-[#2C2C2A] overflow-hidden">

      {/* MATCHED OVERLAY */}
      {matched && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F7F5F0] text-[#2C2C2A] z-50">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#7F77DD] animate-pulse mx-auto" />
            <h1 className="text-2xl font-semibold">
              Connection found
            </h1>
            <p className="text-sm text-[#888780]">
              Entering private room...
            </p>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md text-center space-y-12 px-6">

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto" />
            <div className="h-6 w-48 mx-auto bg-gray-200 rounded" />
            <div className="h-4 w-32 mx-auto bg-gray-200 rounded" />
          </div>
        ) : (
          <>
            {/* Search Animation */}
            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border border-[#7F77DD]/30 animate-ping" />
                <div className="absolute inset-4 rounded-full border border-[#7F77DD]/40 animate-pulse" />
                <div className="absolute inset-8 rounded-full bg-[#7F77DD] animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold">
                {getHeadline()}
              </h1>

              <p className="text-xs text-[#888780]">
                Matching based on trust & vibe
              </p>

              <p className="text-sm text-[#888780]">
                Estimated wait: {estimatedWait}
              </p>

              <p className="text-xs text-[#888780]">
                Searching for {seconds}s
              </p>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
              <CountCard label="FRIENDSHIP" value={displayCounts.friendship} />
              <CountCard label="DATING" value={displayCounts.dating} />
              <CountCard label="CASUAL" value={displayCounts.casual} />
            </div>

            <p className="text-xs text-[#888780]">
              {totalOnline} students active right now
            </p>

            {timeoutReached && !relaxed && (
              <div className="space-y-4">
                <p className="text-sm text-[#888780]">
                  Not finding a match?
                </p>
                <button
                  onClick={handleRelax}
                  className="px-6 py-3 rounded-full border border-black/12 hover:bg-gray-100 text-[#2C2C2A] transition"
                >
                  Expand preference to anyone
                </button>
              </div>
            )}

            <button
              onClick={() => {
                socket.emit("cancel-search");
                router.push("/intent");
              }}
              className="text-xs text-[#888780] hover:text-[#2C2C2A] transition"
            >
              Cancel search
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function CountCard({ label, value }) {
  return (
    <div className="px-4 py-5 rounded-2xl bg-white border border-black/7 text-center transition-all duration-300 shadow-sm">
      <div className="text-[10px] tracking-widest text-[#888780] mb-2">
        {label}
      </div>
      <div className="text-2xl font-semibold text-[#2C2C2A]">
        {value}
      </div>
      <p className="text-[9px] text-[#888780] mt-1">
        active now
      </p>
    </div>
  );
}