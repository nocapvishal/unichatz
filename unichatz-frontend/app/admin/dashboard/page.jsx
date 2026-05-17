"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [trends, setTrends] = useState(null);
  const [searchId, setSearchId] = useState("");
  const router = useRouter();

  useEffect(() => {
    const adminKey = sessionStorage.getItem("adminKey");

    if (!adminKey) {
      router.push("/admin/login");
      return;
    }

    fetchAll(adminKey);

    const interval = setInterval(() => {
      fetchAll(adminKey);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function fetchAll(adminKey) {
    await fetchStats(adminKey);
    await fetchReports(adminKey);
    await fetchTrends(adminKey);
  }

  async function fetchStats(adminKey) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/dashboard`,
      { headers: { "x-admin-key": adminKey } }
    );
    const data = await res.json();
    setStats(data);
  }

  async function fetchReports(adminKey) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/reports`,
      { headers: { "x-admin-key": adminKey } }
    );
    const data = await res.json();
    setReports(data);
  }

  async function fetchTrends(adminKey) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/trends`,
      { headers: { "x-admin-key": adminKey } }
    );
    const data = await res.json();
    setTrends(data);
  }

  const shadowUser = async (userId) => {
    const key = sessionStorage.getItem("adminKey");

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/shadow/${userId}`,
      {
        method: "POST",
        headers: { "x-admin-key": key },
      }
    );
  };

  const unshadowUser = async (userId) => {
    const key = sessionStorage.getItem("adminKey");

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/unshadow/${userId}`,
      {
        method: "POST",
        headers: { "x-admin-key": key },
      }
    );
  };

  const banUser = async (userId) => {
    const key = sessionStorage.getItem("adminKey");

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/ban/${userId}`,
      {
        method: "POST",
        headers: { "x-admin-key": key },
      }
    );
  };

  if (!stats) return <div className="text-[#888780] p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#2C2C2A] p-10 space-y-10">
      <h1 className="text-3xl font-semibold">Admin Dashboard</h1>

      {/* USERS SECTION */}
      <Section title="Users">
        <StatCard label="Total Users" value={stats.users.total} />
        <StatCard label="Active (24h)" value={stats.users.active24h} />
        <StatCard label="Shadowed Users" value={stats.users.shadowed} />
        <StatCard label="Avg Trust" value={stats.users.avgTrust} />
        <StatCard label="Avg Behavior" value={stats.users.avgBehavior} />
      </Section>

      {/* MATCH SECTION */}
      <Section title="Matches">
        <StatCard label="Matches (7d)" value={stats.matches.matches7d} />
        <StatCard label="Conversations (7d)" value={stats.matches.conversations7d} />
        <StatCard label="Match Success Rate" value={`${stats.matches.matchSuccessRate}%`} />
      </Section>

      {/* MODERATION SECTION */}
      <Section title="Moderation">
        <StatCard label="Reports (7d)" value={stats.moderation.reports7d} />
        <StatCard label="Shadow Triggers (7d)" value={stats.moderation.shadowTriggers7d} />
      </Section>

      {/* QUALITY SECTION */}
      <Section title="Quality">
        <StatCard
          label="Avg Conversation Duration (sec)"
          value={Math.round(stats.quality.avgConversationDurationMs / 1000)}
        />
      </Section>

      {/* CHARTS */}
      {trends && (
        <div className="space-y-10">
          <Section title="Match Trend (7d)">
            <Chart data={trends.matchTrend} />
          </Section>

          <Section title="Report Trend (7d)">
            <Chart data={trends.reportTrend} />
          </Section>
        </div>
      )}

      {/* USER SEARCH */}
      <div className="space-y-4">
        <h2 className="text-xl">Search User</h2>
        <input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter user ID"
          className="bg-white px-4 py-3 rounded-xl border border-black/12 w-full text-[#2C2C2A] placeholder:text-[#888780] outline-none focus:border-black/20"
        />
        <div className="flex gap-4">
          <button
            onClick={() => shadowUser(searchId)}
            className="bg-yellow-500 px-4 py-2 rounded"
          >
            Shadow
          </button>
          <button
            onClick={() => unshadowUser(searchId)}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Unshadow
          </button>
          <button
            onClick={() => banUser(searchId)}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Ban
          </button>
        </div>
      </div>

      {/* REPORTS */}
      <div>
        <h2 className="text-xl mb-4">Recent Reports</h2>
        <div className="space-y-3">
          {reports.map((r, index) => (
            <div
              key={index}
              className="p-4 bg-white rounded-xl border border-black/7 shadow-sm"
            >
              <div className="text-sm text-[#888780]">
                User: {r.userId}
              </div>
              <div className="text-sm font-medium mt-1">
                Category: {r.metadata?.category}
              </div>
              <div className="text-xs text-[#888780] mt-1">
                {new Date(r.createdAt).toLocaleString()}
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => shadowUser(r.userId)}
                  className="bg-yellow-500 px-3 py-1 rounded text-sm"
                >
                  Shadow
                </button>
                <button
                  onClick={() => banUser(r.userId)}
                  className="bg-red-600 px-3 py-1 rounded text-sm"
                >
                  Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-black/7 shadow-sm">
      <div className="text-sm text-[#888780]">{label}</div>
      <div className="text-2xl font-semibold mt-2 text-[#2C2C2A]">{value}</div>
    </div>
  );
}

function Chart({ data }) {
  const formatted = data.map((d) => ({
    day: d._id,
    value: d.count,
  }));

  return (
    <div className="w-full h-64 bg-white p-4 rounded-2xl border border-black/7 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" stroke="#888780" />
          <YAxis stroke="#888780" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#2C2C2A' }} />
          <Line type="monotone" dataKey="value" stroke="#7F77DD" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}