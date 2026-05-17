"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function CreatePostSheet({ onClose }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handlePost = async () => {
    const content = text.trim();

    if (!content || content.length < 10 || loading) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/feed`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create post";

        try {
          const data = await res.json();
          if (data?.message) errorMessage = data.message;
        } catch {}

        throw new Error(errorMessage);
      }

      setText("");

      if (onClose) onClose();

      window.location.reload();
    } catch (err) {
      console.error("Post error:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
      <div className="w-full rounded-t-[20px] bg-[#1C1F2B] p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-white">New Confession</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <textarea
          className="w-full rounded-lg border border-[#262A38] bg-[#161821] p-3 text-white placeholder-[#9DA3B4] focus:border-[#7C5CFF] focus:outline-none resize-none"
          rows="4"
          placeholder="Share something about campus life (min 10 chars)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          maxLength={500}
        />

        <div className="mt-6 flex items-center justify-between">
          <button
            className="px-4 py-2 text-[#9DA3B4] hover:text-white transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <div className="text-xs text-[#9DA3B4]">{text.length}/500</div>

          <Button
            onClick={handlePost}
            disabled={text.trim().length < 10 || loading}
            className="px-6 bg-[#7C5CFF] text-white hover:bg-[#9B84FF] disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}