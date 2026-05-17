"use client";

import { useState } from "react";
import { emitSocket } from "@/lib/socket";

function formatTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

export default function CommentItem({ comment, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingDM, setSendingDM] = useState(false);

  const isMe = comment.authorLabel === "You";

  // ================= REPLY =================
  const handleReply = async () => {
    if (!replyText.trim()) return;

    await onReply(replyText, comment._id);

    setReplyText("");
    setShowReply(false);
  };

  // ================= DM =================
  const handleDM = () => {
    if (!comment.userId) return;

    setSendingDM(true);

    emitSocket("send-dm-request", comment.userId);

    setTimeout(() => setSendingDM(false), 1000);
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      
      <div
        className={`
          max-w-[75%]
          px-3 py-2
          rounded-2xl
          text-sm
          ${
            isMe
              ? "bg-[#2C2C2A] text-white"
              : "bg-white border border-black/7 text-[#2C2C2A]"
          }
        `}
      >
        {/* NAME */}
        <div className={`text-[10px] mb-1 font-medium ${isMe ? "text-white/70" : "text-[#888780]"}`}>
          {comment.anonymousLabel || comment.authorLabel || "Anonymous"}
        </div>

        {/* TEXT */}
        <div>{comment.text}</div>

        {/* TIME */}
        <div className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-[#888780]"}`}>
          {formatTime(comment.createdAt)}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-1">

          {/* REPLY */}
          {!isMe && (
            <button
              className="text-[10px] text-[#888780] hover:text-[#2C2C2A]"
              onClick={() => setShowReply(!showReply)}
            >
              Reply
            </button>
          )}

          {/* DM */}
          {!isMe && comment.userId && (
            <button
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
              onClick={handleDM}
              disabled={sendingDM}
            >
              {sendingDM ? "Sending..." : "Connect 💌"}
            </button>
          )}

        </div>

        {/* REPLY INPUT */}
        {showReply && (
          <div className="mt-2 flex gap-2">
            <input
              className="
                flex-1
                bg-gray-50
                border border-black/12
                rounded-lg
                px-2 py-1
                text-[#2C2C2A]
                placeholder:text-[#888780]
                text-xs
                outline-none
                focus:border-black/20
              "
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply..."
            />

            <button
              onClick={handleReply}
              className="
                bg-[#7F77DD] hover:bg-[#6860C7]
                px-3
                rounded
                text-xs
                font-medium
                text-white
                transition-colors
              "
            >
              Send
            </button>
          </div>
        )}
      </div>

    </div>
  );
}