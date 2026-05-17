"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const Card = ({ title, value, selected, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => onClick(value)}
    className={`p-4 rounded-2xl cursor-pointer transition border text-center font-medium ${
      selected
        ? "bg-[#2C2C2A] text-white border-[#2C2C2A]"
        : "bg-white text-[#2C2C2A] border-black/12 hover:bg-gray-50"
    }`}
  >
    {title}
  </motion.div>
);

export default function PreferencesPage() {
  const router = useRouter();

  const [gender, setGender] = useState("");
  const [preference, setPreference] = useState("");

  const continueToMatch = () => {
    if (!gender || !preference) {
      alert("Please select both options");
      return;
    }

    localStorage.setItem("gender", gender);
    localStorage.setItem("preference", preference);

    router.push("/match");
  };



  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#2C2C2A] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full space-y-10">

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            Set your preferences
          </h1>
          <p className="text-[#888780]">
            This helps us find better matches.
          </p>
        </div>

        {/* YOUR GENDER */}
        <div className="space-y-3">
          <h2 className="text-[#888780] font-medium text-sm">I am</h2>

          <div className="grid grid-cols-3 gap-3">
            <Card title="Male" value="male" selected={gender==="male"} onClick={setGender}/>
            <Card title="Female" value="female" selected={gender==="female"} onClick={setGender}/>
            <Card title="Other" value="other" selected={gender==="other"} onClick={setGender}/>
          </div>
        </div>

        {/* MATCH PREFERENCE */}
        <div className="space-y-3">
          <h2 className="text-[#888780] font-medium text-sm">I want to meet</h2>

          <div className="grid grid-cols-3 gap-3">
            <Card title="Male" value="male" selected={preference==="male"} onClick={setPreference}/>
            <Card title="Female" value="female" selected={preference==="female"} onClick={setPreference}/>
            <Card title="Anyone" value="any" selected={preference==="any"} onClick={setPreference}/>
          </div>
        </div>

        {/* CONTINUE */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={continueToMatch}
          className="w-full bg-[#7F77DD] text-white py-4 rounded-2xl font-semibold shadow-sm hover:bg-[#6860C7] transition-colors"
        >
          Start Matching →
        </motion.button>

      </div>
    </div>
  );
}
