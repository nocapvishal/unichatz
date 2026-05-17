"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, onSocket, offSocket, emitSocket } from "@/lib/socket";

/* ============================================================
   UTILS
============================================================ */

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function getAvatarColor(alias = "") {
  const colors = [
    "#7c3aed", "#0891b2", "#059669",
    "#d97706", "#dc2626", "#db2777",
  ];
  return colors[alias.charCodeAt(0) % colors.length];
}

function getInitials(alias = "") {
  return alias.slice(0, 2).toUpperCase() || "??";
}

function parseExpiresAt(raw) {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return isNaN(t) ? null : t;
}

function haptic() {
  navigator?.vibrate?.(8);
}

/* ============================================================
   SKELETON
============================================================ */

function ConnectionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-black/7 bg-white animate-pulse"
        >
          <div className="flex gap-3 items-center mb-3">
            <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   CONNECTION CARD
============================================================ */

const VIBE_BORDER = {
  warm: "border-green-500/30",
  cold: "border-slate-500/30",
  neutral: "border-black/7",
};

function ConnectionCard({ connection, onOpenChat, onLock, onDelete, onMarkRead }) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef(null);

  const expiresAtMs = parseExpiresAt(connection.expiresAt);
  const now = Date.now();
  const hoursLeft = expiresAtMs ? (expiresAtMs - now) / (1000 * 60 * 60) : Infinity;

  const isExpired = expiresAtMs !== null && hoursLeft <= 0;
  const isUserLocked = connection.status === "user-locked" && !isExpired;
  const isExpiringSoon = !isExpired && !isUserLocked && hoursLeft <= 6 && hoursLeft > 0;
  const hasUnread = (connection.unreadCount || 0) > 0;

  const vibeBorder = connection.vibe ? VIBE_BORDER[connection.vibe] : "border-white/10";

  const cardOpacity = isExpired ? "opacity-40" : isUserLocked ? "opacity-70" : "opacity-100";
  const clickable = !isExpired;

  // Touch swipe handlers
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setShowActions(false);
  };

  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    // Only handle horizontal swipes
    if (dy > 20) return;
    if (dx < 0) setSwipeOffset(Math.max(dx, -96));
    if (dx > 0) setSwipeOffset(Math.min(dx, 20));
  };

  const onTouchEnd = () => {
    if (swipeOffset < -60) {
      setShowActions(true);
      setSwipeOffset(-96);
    } else if (swipeOffset > 10) {
      haptic();
      onMarkRead(connection.roomId);
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
    touchStartX.current = null;
  };

  const handleCardClick = () => {
    if (!clickable) return;
    if (showActions) { setShowActions(false); setSwipeOffset(0); return; }
    haptic();
    if (isUserLocked) {
      onLock(connection); // triggers unlock confirm
    } else {
      onOpenChat(connection);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe action buttons */}
      <div className="absolute right-0 top-0 h-full flex items-center gap-1 px-2">
        <button
          onClick={() => { haptic(); onLock(connection); setSwipeOffset(0); setShowActions(false); }}
          className="px-3 py-2 bg-indigo-600 rounded-xl text-xs font-medium text-white h-full"
        >
          🔒
        </button>
        <button
          onClick={() => { haptic(); onDelete(connection.roomId); setSwipeOffset(0); setShowActions(false); }}
          className="px-3 py-2 bg-red-600/80 rounded-xl text-xs font-medium text-white h-full"
        >
          🗑️
        </button>
      </div>

      {/* Main card */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 || swipeOffset === -96 ? "transform 0.2s ease" : "none" }}
        className={`relative p-4 rounded-2xl border ${vibeBorder} bg-white transition-colors ${cardOpacity} ${clickable ? "cursor-pointer hover:bg-gray-50 active:scale-[0.99]" : "cursor-not-allowed"}`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              style={{ backgroundColor: getAvatarColor(connection.alias) }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            >
              {connection.avatarUrl ? (
                <img src={connection.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(connection.alias)
              )}
            </div>
            {/* Online presence dot */}
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${connection.partnerOnline ? "bg-green-400" : "bg-slate-300"}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              {/* Alias + badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm truncate ${hasUnread ? "font-semibold text-[#2C2C2A]" : "font-medium text-[#2C2C2A]/90"}`}>
                  {connection.alias}
                </span>
                {isUserLocked && <span className="text-xs leading-none">🔒</span>}
                {hasUnread && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-indigo-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {connection.unreadCount > 9 ? "9+" : connection.unreadCount}
                  </span>
                )}
              </div>

              {/* Status / timestamp */}
              <div className="text-xs flex-shrink-0 text-right">
                {isExpired ? (
                  <span className="text-[#888780]">Expired</span>
                ) : isUserLocked ? (
                  <span className="text-indigo-600">Locked</span>
                ) : isExpiringSoon ? (
                  <span className="text-amber-600">⏳ {Math.floor(hoursLeft)}h</span>
                ) : (
                  <span className="text-[#888780]">
                    {formatRelativeTime(connection.lastMessageAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Tier */}
            {connection.tier && (
              <div className="text-[10px] text-[#888780] mt-0.5">{connection.tier}</div>
            )}

            {/* AI Summary or last message */}
            <div className="mt-2 text-xs leading-relaxed">
              {connection.aiSummary ? (
                <span className="text-indigo-600 font-medium">✦ {connection.aiSummary}</span>
              ) : connection.lastMessage ? (
                <span className="text-[#888780] truncate block">{connection.lastMessage}</span>
              ) : (
                <span className="text-[#888780] italic">No messages yet</span>
              )}
            </div>

            {/* Reply suggestions (only if unread) */}
            {hasUnread && connection.replySuggestions?.length > 0 && (
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {connection.replySuggestions.slice(0, 2).map((s, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic();
                      sessionStorage.setItem("prefillReply", s);
                      onOpenChat(connection);
                    }}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-black/5 rounded-full text-[10px] text-[#2C2C2A] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Extend CTA or expiry warning */}
            {!isExpired && !isUserLocked && isExpiringSoon && (
              <div className="mt-2.5">
                {connection.recommendExtend ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic();
                      emitSocket("lock-connection", { roomId: connection.roomId });
                    }}
                    className="text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-full transition-colors font-medium"
                  >
                    🔗 Extend connection
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-600 font-medium">⚠️ Expires soon</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SORT & FILTER
============================================================ */

const FILTERS = ["All", "Active", "Expiring", "Locked"];
const SORTS = ["Recent", "Expiring soon", "Unread first"];

function applyFilterSort(connections, filter, sort) {
  let list = [...connections];

  if (filter === "Active") list = list.filter((c) => c.status === "active");
  else if (filter === "Expiring") list = list.filter((c) => c.status === "expiring");
  else if (filter === "Locked") list = list.filter((c) => c.status === "user-locked");

  if (sort === "Expiring soon") {
    list.sort((a, b) => {
      const at = parseExpiresAt(a.expiresAt) ?? Infinity;
      const bt = parseExpiresAt(b.expiresAt) ?? Infinity;
      return at - bt;
    });
  } else if (sort === "Unread first") {
    list.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
  } else {
    list.sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
  }

  return list;
}

/* ============================================================
   PULL TO REFRESH
============================================================ */

function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 60 && window.scrollY === 0) setPulling(true);
  };
  const onTouchEnd = () => {
    if (pulling) { haptic(); onRefresh(); }
    setPulling(false);
    startY.current = null;
  };

  return { pulling, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function InboxPage() {
  const router = useRouter();

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const [tick, setTick] = useState(0);

  const [filter, setFilter] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("inbox_filter") || "All" : "All"
  );
  const [sort, setSort] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("inbox_sort") || "Recent" : "Recent"
  );

  const fetchConnections = useCallback(() => {
    setError(null);
    setLoading(true);

    emitSocket("get-connections");

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError("Couldn't load connections. Check your connection and retry.");
    }, 10000);
  }, []);

  useEffect(() => {
    connectSocket();
    fetchConnections();

    const handleList = (data) => {
      clearTimeout(timeoutRef.current);
      setConnections(data);
      setLoading(false);
      setError(null);
    };

    const handleError = () => {
      clearTimeout(timeoutRef.current);
      setLoading(false);
      setError("Failed to load connections.");
    };

    const handleUpdated = (update) => {
      setConnections((prev) =>
        prev.map((c) =>
          c.roomId === update.connectionId
            ? {
                ...c,
                aiSummary: update.aiSummary ?? c.aiSummary,
                vibe: update.vibe ?? c.vibe,
                replySuggestions: update.replySuggestions ?? c.replySuggestions,
                recommendExtend: update.recommendExtend ?? c.recommendExtend,
                lastMessage: update.lastMessage ?? c.lastMessage,
                lastMessageAt: update.lastMessageAt ?? c.lastMessageAt,
              }
            : c
        )
      );
    };

    const handleExpired = ({ roomId }) => {
      setConnections((prev) =>
        prev.map((c) => (c.roomId === roomId ? { ...c, status: "expired" } : c))
      );
    };

    const handlePresence = ({ roomId, online }) => {
      setConnections((prev) =>
        prev.map((c) => (c.roomId === roomId ? { ...c, partnerOnline: online } : c))
      );
    };

    const handleUnread = ({ roomId, count }) => {
      setConnections((prev) =>
        prev.map((c) => (c.roomId === roomId ? { ...c, unreadCount: count } : c))
      );
    };

    onSocket("connections-list", handleList);
    onSocket("connections-error", handleError);
    onSocket("connection-updated", handleUpdated);
    onSocket("connection-expired", handleExpired);
    onSocket("partner-presence", handlePresence);
    onSocket("unread-count", handleUnread);

    // Tick every 60s to update relative timestamps
    const interval = setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      offSocket("connections-list", handleList);
      offSocket("connections-error", handleError);
      offSocket("connection-updated", handleUpdated);
      offSocket("connection-expired", handleExpired);
      offSocket("partner-presence", handlePresence);
      offSocket("unread-count", handleUnread);
      clearTimeout(timeoutRef.current);
      clearInterval(interval);
    };
  }, [fetchConnections]);

  const openChat = (connection) => {
    sessionStorage.setItem("activeRoom", connection.roomId);
    sessionStorage.setItem("partnerAlias", connection.alias);
    sessionStorage.setItem("partnerTier", connection.tier || "Unknown");
    sessionStorage.setItem("partnerId", connection.partnerId);
    router.push("/chat");
  };

  const handleLock = (connection) => {
    emitSocket("lock-connection", { roomId: connection.roomId });
    setConnections((prev) =>
      prev.map((c) =>
        c.roomId === connection.roomId ? { ...c, status: "user-locked" } : c
      )
    );
  };

  const handleDelete = (roomId) => {
    emitSocket("remove-connection", { partnerId: connections.find((c) => c.roomId === roomId)?.partnerId });
    setConnections((prev) => prev.filter((c) => c.roomId !== roomId));
  };

  const handleMarkRead = (roomId) => {
    setConnections((prev) =>
      prev.map((c) => (c.roomId === roomId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const { pulling, handlers: pullHandlers } = usePullToRefresh(fetchConnections);

  const handleFilterChange = (f) => {
    setFilter(f);
    localStorage.setItem("inbox_filter", f);
  };

  const handleSortChange = (s) => {
    setSort(s);
    localStorage.setItem("inbox_sort", s);
  };

  const visible = applyFilterSort(connections, filter, sort);
  const totalUnread = connections.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div
      className="min-h-screen bg-[#F7F5F0] text-[#2C2C2A] px-4 py-8"
      {...pullHandlers}
    >
      {/* Pull-to-refresh indicator */}
      {pulling && (
        <div className="flex justify-center mb-2">
          <div className="w-5 h-5 rounded-full border-2 border-[#2C2C2A]/30 border-t-[#2C2C2A] animate-spin" />
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connections
            {totalUnread > 0 && (
              <span className="ml-2 text-base font-normal text-indigo-600">
                ({totalUnread})
              </span>
            )}
          </h1>
          <p className="text-[#888780] text-sm mt-1">
            Active conversations expire after 48h unless locked.
          </p>
        </div>

        {/* Sort & Filter */}
        {!loading && !error && connections.length > 0 && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-[#2C2C2A] text-white"
                      : "bg-white border border-black/7 text-[#888780] hover:bg-gray-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Sort pills */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSortChange(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    sort === s
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium"
                      : "text-[#888780] hover:text-[#2C2C2A]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* States */}
        {loading ? (
          <ConnectionSkeleton />
        ) : error ? (
          <div className="text-center py-12 border border-black/7 rounded-2xl bg-white">
            <div className="text-3xl mb-3">⚡</div>
            <p className="text-[#888780] text-sm mb-4">{error}</p>
            <button
              onClick={fetchConnections}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 border border-black/7 rounded-full text-sm font-medium text-[#2C2C2A] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-14 border border-black/7 rounded-2xl bg-white">
            <div className="text-4xl mb-4">💌</div>
            <p className="text-[#2C2C2A] font-medium">No active connections yet.</p>
            <p className="text-[#888780] text-sm mt-1">Start matching to meet new people.</p>
            <button
              onClick={() => router.push("/match")}
              className="mt-6 px-6 py-2 bg-[#7F77DD] text-white rounded-full text-sm font-medium hover:bg-[#6860C7] transition-colors"
            >
              Start Matching
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-10 text-[#888780] text-sm">
            No connections match this filter.
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((c) => (
              <ConnectionCard
                key={c.roomId}
                connection={c}
                onOpenChat={openChat}
                onLock={handleLock}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}