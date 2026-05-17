"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import CommentItem from "@/components/comments/CommentItem";
import {
  connectSocket,
  onSocket,
  emitSocket,
} from "@/lib/socket";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function ThreadPage() {
  const params = useParams();
  const postId = params?.id;

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const bottomRef = useRef(null);

  // ================= LOAD COMMENTS =================
  async function loadComments() {
    try {
      setFetching(true);

      const res = await fetch(
        `${API_BASE_URL}/api/comments/${postId}`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setComments(data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (postId) loadComments();
  }, [postId]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!postId) return;

    const socket = connectSocket();

    // join room
    emitSocket("join_room", postId);

    // listen messages
    onSocket("receive_message", (data) => {
      setComments((prev) => [...prev, data]);
    });

  }, [postId]);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // ================= COMMENT =================
  const handleComment = async () => {
    if (!text.trim()) return;

    setLoading(true);

    const optimisticComment = {
      _id: "temp-" + Date.now(),
      text: text.trim(),
      authorLabel: "You",
      createdAt: new Date().toISOString(),
    };

    // UI instantly updates
    setComments((prev) => [...prev, optimisticComment]);
    setText("");

    // 🔥 emit realtime
    emitSocket("send_message", {
      roomId: postId,
      message: optimisticComment,
    });

    try {
      await fetch(`${API_BASE_URL}/api/comments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          text: optimisticComment.text,
        }),
      });
    } catch (err) {
      console.error("Comment error:", err);

      setComments((prev) =>
        prev.filter((c) => c._id !== optimisticComment._id)
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= REPLY =================
  const handleReply = async (replyText, parentCommentId) => {
    const optimisticReply = {
      _id: "temp-" + Date.now(),
      text: replyText,
      authorLabel: "You",
      createdAt: new Date().toISOString(),
      parentCommentId,
    };

    setComments((prev) => [...prev, optimisticReply]);

    // 🔥 emit realtime
    emitSocket("send_message", {
      roomId: postId,
      message: optimisticReply,
    });

    try {
      await fetch(`${API_BASE_URL}/api/comments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          text: replyText,
          parentCommentId,
        }),
      });
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  // ================= UI =================
  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-32">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#2C2C2A]">
          Discussion
        </h1>
        <p className="text-xs text-[#888780] mt-1">
          Anonymous campus thread
        </p>
      </div>

      {/* COMMENTS */}
      {fetching ? (
        <div className="text-center text-[#888780] text-sm py-10">
          Loading...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center text-[#888780] text-sm py-10">
          No replies yet 👀
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              onReply={handleReply}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* INPUT */}
      <div
        className="
        fixed left-0 right-0
        bg-[#F7F5F0]/95 backdrop-blur
        border-t border-black/7
        p-4
      "
        style={{ bottom: "70px" }}
      >
        <div className="max-w-xl mx-auto flex gap-2">

          <input
            className="
              flex-1
              bg-white
              border border-black/12
              rounded-xl
              px-4 py-2
              text-[#2C2C2A]
              placeholder:text-[#888780]
              focus:outline-none
              focus:border-black/20
              transition-colors
            "
            placeholder="Write a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleComment();
            }}
          />

          <button
            onClick={handleComment}
            disabled={loading || !text.trim()}
            className="
              bg-[#7F77DD] hover:bg-[#6860C7]
              px-5
              rounded-xl
              text-white
              font-medium
              transition-colors
              disabled:opacity-50
            "
          >
            Send
          </button>

        </div>
      </div>
    </div>
  );
}