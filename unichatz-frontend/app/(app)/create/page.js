"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePostPage() {

  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submitPost = async () => {

    if (!text.trim()) return;

    setLoading(true);

    await fetch("http://localhost:3001/api/feed/create", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    setLoading(false);

    router.push("/feed");

  };

  return (

    <div className="max-w-xl mx-auto p-4 pb-32">

      <h1 className="text-lg font-semibold mb-4 text-[#2C2C2A]">
        Create Post
      </h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening on campus?"
        className="w-full h-32 bg-white border border-black/12 rounded-lg p-3 text-[#2C2C2A] placeholder:text-[#888780] resize-none outline-none focus:border-black/25 transition-colors"
      />

      <button
        onClick={submitPost}
        disabled={loading}
        className="mt-4 w-full bg-[#7F77DD] hover:bg-[#6860C7] text-white font-medium py-2 rounded-lg transition-colors"
      >
        {loading ? "Posting..." : "Post"}
      </button>

    </div>

  );

}