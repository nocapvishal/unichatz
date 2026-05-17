"use client";

import { useEffect, useState } from "react";

export default function LeaderboardPage() {

  const [users, setUsers] = useState([]);

  useEffect(() => {

    async function loadLeaderboard() {

      const res = await fetch(
        "http://localhost:3001/api/leaderboard"
      );

      const data = await res.json();

      setUsers(data);

    }

    loadLeaderboard();

  }, []);

  return (

    <div className="max-w-xl mx-auto p-4 pb-32">

      <h1 className="text-xl font-semibold mb-6 text-[#2C2C2A]">
        🏆 Campus Legends
      </h1>

      <div className="bg-white border border-black/7 rounded-2xl overflow-hidden shadow-sm">
        {users.map((u, i) => (

          <div
            key={u._id}
            className="flex items-center justify-between border-b border-black/5 last:border-0 p-4"
          >

            <span className="font-medium text-[#2C2C2A] flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? "bg-amber-100 text-amber-700" :
                i === 1 ? "bg-slate-200 text-slate-700" :
                i === 2 ? "bg-orange-100 text-orange-800" :
                "bg-gray-100 text-[#888780]"
              }`}>
                {i + 1}
              </span>
              {u.alias}
            </span>

            <span className="text-sm font-semibold text-[#7F77DD]">
              {u.engagementScore} pts
            </span>

          </div>

        ))}
      </div>

    </div>

  );

}