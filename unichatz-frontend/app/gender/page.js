"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenderPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  const options = [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
    { id: "na", label: "Prefer not to say" },
  ];

  function handleContinue() {
    if (!selected) return;

    // later this will be saved to DB / localStorage
    localStorage.setItem("gender", selected);

    router.push("/preferences");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F7F5F0] text-[#2C2C2A]">

      {/* Card */}
      <div className="relative w-[420px] p-10 rounded-[28px] bg-white border border-black/10 shadow-sm">

        <h1 className="text-[28px] font-semibold text-[#2C2C2A] text-center">
          How do you identify?
        </h1>

        <p className="text-center text-[#888780] mt-2 text-sm">
          This helps us match you better.
        </p>

        <div className="mt-8 space-y-4">
          {options.map(opt => {
            const active = selected === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className={`
                  w-full py-4 rounded-2xl border text-[17px] font-medium transition-all duration-300
                  ${active
                    ? "bg-[#2C2C2A] text-white border-[#2C2C2A] shadow-sm"
                    : "bg-white text-[#2C2C2A] border-black/12 hover:bg-gray-50"}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`
            w-full mt-8 py-4 rounded-full font-semibold text-lg transition-colors
            ${selected
              ? "text-white bg-[#7F77DD] shadow-sm hover:bg-[#6860C7]"
              : "bg-[#E6E4DD] text-[#888780] cursor-not-allowed"}
          `}
        >
          Continue →
        </button>

        <p className="text-center text-xs text-[#888780] mt-5">
          This information is never shown publicly.
        </p>

      </div>
    </main>
  );
}
