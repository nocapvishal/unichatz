"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const Card = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 rounded-2xl border transition-all duration-300 font-medium ${
      selected
        ? "bg-[#2C2C2A] text-white border-[#2C2C2A]"
        : "bg-white text-[#2C2C2A] border-black/12 hover:bg-gray-50"
    }`}
  >
    {label}
  </button>
);

export default function IntentPage() {
  const router = useRouter();

  const [gender, setGender] = useState("");
  const [preference, setPreference] = useState("");
  const [intent, setIntent] = useState("");

  const handleStart = () => {
    if (!gender || !preference || !intent) {
      alert("Please select all options");
      return;
    }

    localStorage.setItem(
      "preferences",
      JSON.stringify({
        gender,
        preference,
        intent
      })
    );

    router.push("/match");
  };



  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#2C2C2A] flex items-center justify-center px-6">

      <div className="w-full max-w-lg space-y-10">

        <h1 className="text-4xl font-semibold text-center">
          Set your preferences
        </h1>

        <div className="space-y-4">
          <p className="text-[#888780] font-medium text-sm">I am</p>
          <div className="flex gap-3">
            <Card label="Male" selected={gender==="male"} onClick={()=>setGender("male")}/>
            <Card label="Female" selected={gender==="female"} onClick={()=>setGender("female")}/>
            <Card label="Other" selected={gender==="other"} onClick={()=>setGender("other")}/>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[#888780] font-medium text-sm">I want to meet</p>
          <div className="flex gap-3">
            <Card label="Male" selected={preference==="male"} onClick={()=>setPreference("male")}/>
            <Card label="Female" selected={preference==="female"} onClick={()=>setPreference("female")}/>
            <Card label="Anyone" selected={preference==="any"} onClick={()=>setPreference("any")}/>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[#888780] font-medium text-sm">Looking for</p>
          <div className="flex gap-3">
            <Card label="Friendship" selected={intent==="friendship"} onClick={()=>setIntent("friendship")}/>
            <Card label="Dating" selected={intent==="dating"} onClick={()=>setIntent("dating")}/>
            <Card label="Casual" selected={intent==="casual"} onClick={()=>setIntent("casual")}/>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-[#7F77DD] text-white font-semibold shadow-sm hover:bg-[#6860C7] transition-colors"
        >
          Start Matching →
        </button>

      </div>
    </main>
  );
}