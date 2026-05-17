"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/app/(app)/feed/page";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface PostCardProps {
  post: Post;
}

// Simple hash to derive color from alias
function getAvatarColor(alias: string = "") {
  if (!alias) return "#7F77DD"; // Fallback color
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function timeAgo(dateString: string) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return "Yesterday";
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return daysOfWeek[date.getDay()];
  }
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export default function PostCard({ post }: PostCardProps) {
  const router = useRouter();

  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(post.likedByMe || false);
  const [liking, setLiking] = useState(false);
  
  const [bookmarked, setBookmarked] = useState(post.bookmarked || false);
  const [bookmarking, setBookmarking] = useState(false);

  // Poll state (local optimistic UI)
  const [pollState, setPollState] = useState(post.poll);

  // Force re-render every 60s for relative timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLike = useCallback(async () => {
    if (liking) return;
    setLiking(true);

    const prevLikes = likes;
    const prevLiked = liked;

    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;

    setLikes(newLikes);
    setLiked(newLiked);

    try {
      const res = await fetch(`${API_BASE_URL}/api/votes/${post._id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Like failed");
    } catch (err) {
      console.error("Like failed:", err);
      setLikes(prevLikes);
      setLiked(prevLiked);
    } finally {
      setLiking(false);
    }
  }, [likes, liked, liking, post._id]);

  const handleBookmark = async () => {
    if (bookmarking) return;
    setBookmarking(true);
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/bookmark`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Bookmark failed");
    } catch (err) {
      console.error("Bookmark failed:", err);
      setBookmarked(prev);
    } finally {
      setBookmarking(false);
    }
  };

  const handlePollVote = async (index: number) => {
    if (!pollState || (pollState as any).userVotedIndex !== undefined && (pollState as any).userVotedIndex !== null) return;
    
    // Copy options deeply so we don't mutate state directly
    const newPoll = { ...pollState, options: pollState.options.map(opt => ({ ...opt })) };
    (newPoll as any).userVotedIndex = index;
    newPoll.options[index].votes += 1;
    newPoll.totalVotes += 1;
    setPollState(newPoll);

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${post._id}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex: index }),
      });
      if (!res.ok) throw new Error("Poll vote failed");
    } catch (err) {
      console.error("Poll vote failed:", err);
      // rollback
      setPollState(pollState);
    }
  };

  // isLiked replaced by liked state

  return (
    <div className="bg-white rounded-[16px] p-4 mb-4" style={{ border: "0.5px solid rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: getAvatarColor(post.alias) }}
          >
            {post.alias ? post.alias.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#2C2C2A] text-sm">{post.alias || "Anonymous"}</span>
            </div>
            <div className="text-[11px] text-[#888780] mt-0.5">
              {timeAgo(post.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {post.isHot && (
            <div className="bg-[#FAEEDA] text-[#854F0B] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>🔥</span> Hot
            </div>
          )}
          <button className="text-[#888780] hover:text-[#2C2C2A]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>

      {/* Image Block */}
      {post.images && post.images.length > 0 && (
        <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 aspect-video relative bg-gray-50">
          <img src={post.images[0]} alt="Post attachment" className="w-full h-full object-cover" />
          {post.images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white font-medium text-xs px-2 py-1 rounded-full">
              +{post.images.length - 1}
            </div>
          )}
        </div>
      )}

      {/* Body Text */}
      <p className="text-[#2C2C2A] text-[14px] leading-[1.55] mb-3 whitespace-pre-wrap break-words">
        {post.body}
      </p>

      {/* Tags & Department */}
      {(post.dept || (post.tags && post.tags.length > 0)) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {post.dept && (
            <span className="text-[12px] font-medium text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-full">
              {post.dept}
            </span>
          )}
          {post.tags?.map(tag => (
            <span key={tag} className="text-[12px] text-[#D85A30] bg-[#D85A30]/10 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Image Block removed from here */}

      {/* Poll Block */}
      {post.type === "poll" && pollState && (
        <div className="mb-4 space-y-2">
          {pollState.options.map((opt, i) => {
            const pct = pollState.totalVotes > 0 ? Math.round((opt.votes / pollState.totalVotes) * 100) : 0;
            const hasVoted = (pollState as any).userVotedIndex !== undefined && (pollState as any).userVotedIndex !== null;
            const isSelected = (pollState as any).userVotedIndex === i;
            
            return (
              <button 
                key={i}
                disabled={hasVoted}
                onClick={() => handlePollVote(i)}
                className={`relative w-full text-left overflow-hidden rounded-lg border p-3 text-sm transition-all
                  ${isSelected ? 'border-[#7F77DD] bg-[#7F77DD]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                {hasVoted && (
                  <div 
                    className={`absolute top-0 left-0 bottom-0 ${isSelected ? 'bg-[#7F77DD]/20' : 'bg-gray-100'} transition-all duration-500`} 
                    style={{ width: `${pct}%` }} 
                  />
                )}
                <div className="relative z-10 flex justify-between items-center">
                  <span className={`${isSelected ? 'font-medium text-[#2C2C2A]' : 'text-[#2C2C2A]'}`}>{opt.label}</span>
                  {hasVoted && <span className="text-xs font-medium text-[#888780]">{pct}%</span>}
                </div>
              </button>
            )
          })}
          <div className="flex justify-between text-[11px] text-[#888780] mt-1">
            <span>{pollState.totalVotes} votes</span>
            {pollState.expiresAt && <span>Ends {timeAgo(pollState.expiresAt)}</span>}
          </div>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center justify-between text-[#888780] pt-1">
        <div className="flex gap-5">
          {/* Like */}
          <button 
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-[#D85A30]' : 'hover:text-[#D85A30]'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span className="text-sm font-medium">{likes}</span>
          </button>

          {/* Comment */}
          <button 
            onClick={() => router.push(`/post/${post._id}`)}
            className="flex items-center gap-1.5 hover:text-[#2C2C2A] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="text-sm font-medium">{post.comments || 0}</span>
          </button>

          {/* Bookmark */}
          <button 
            onClick={handleBookmark}
            disabled={bookmarking}
            className={`flex items-center gap-1.5 transition-colors ${bookmarked ? 'text-[#2C2C2A]' : 'hover:text-[#2C2C2A]'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        {/* Share */}
        <button className="hover:text-[#2C2C2A] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>
      </div>

    </div>
  );
}