"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function ChatPage() {
  const router = useRouter();
  const socket = getSocket();

  const mode =
    typeof window !== "undefined" ? localStorage.getItem("chatMode") : "match";
  const alias = typeof window !== "undefined" ? localStorage.getItem("partnerAlias") : null;
  const tier = typeof window !== "undefined" ? localStorage.getItem("partnerTier") : null;
  const roomId = typeof window !== "undefined" ? localStorage.getItem("activeRoom") : null;

  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [connected, setConnected] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [showIsland, setShowIsland] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [seenByPartner, setSeenByPartner] = useState(false);
  const [entering, setEntering] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [conversationStats, setConversationStats] = useState(null);
  const [chatStart] = useState(Date.now());
  const [waitingMutual, setWaitingMutual] = useState(false);

  const [identity, setIdentity] = useState({
    self: "You",
    partner: alias || "Stranger",
  });

  const [aiInsights, setAiInsights] = useState({
    aiSummary: null,
    vibe: null,
    replySuggestions: [],
    recommendExtend: false
  });

  // Fetch initial connection data (including AI) if in connection mode
  useEffect(() => {
    if (mode === "connection" && roomId) {
      socket.emit("get-connection-detail", { connectionId: roomId });
    }
  }, [mode, roomId, socket]);

  useEffect(() => {
    let ignore = false;

    const bootstrapSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Unauthorized");
        }

        const data = await response.json();
        if (ignore) return;

        setUserId(data.user.id);

        if (!socket.connected) {
          socket.connect();
        }
      } catch {
        if (!ignore) {
          router.push("/login");
        }
      }
    };

    bootstrapSession();

    return () => {
      ignore = true;
    };
  }, [router, socket]);

  useEffect(() => {
    if (alias) {
      setIdentity((prev) => ({
        ...prev,
        partner: alias,
      }));
    }
  }, [alias]);

  const buildStats = useCallback(() => {
    const duration = Math.floor((Date.now() - chatStart) / 1000);
    const totalMessages = messages.length;
    const selfMessages = messages.filter((m) => m.self).length;
    return { duration, totalMessages, selfMessages };
  }, [chatStart, messages]);

  useEffect(() => {
    if (!userId || !roomId) return;

    // Join correct room based on mode
    if (mode === "connection") {
      socket.emit("join-connection-room", roomId);
    } else {
      socket.emit("join-room", roomId); // assuming this exists for match mode
    }

    const handleConnect = () => {
      setConnected(true);
    };

    const handleReceive = (data) => {
      const newMsg = {
        messageId: data.messageId,
        text: data.text,
        timestamp: data.timestamp,
        self: data.senderId === userId,
        reactions: data.reactions || [],
        replyTo: data.replyTo || null,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (!newMsg.self) {
        subtlePing();
        setShowIsland(true);
        navigator.vibrate?.(12);
        setTimeout(() => setShowIsland(false), 1800);
      }
    };

    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, reactions } : m))
      );
    };

    // Mode-specific socket events
    socket.on("connect", handleConnect);
    
    if (mode === "connection") {
      socket.on("chat-history", (historyMessages) => {
        const formatted = historyMessages.map((m) => ({
          messageId: m.messageId,
          text: m.text,
          timestamp: m.timestamp,
          self: m.senderId === userId,
          reactions: m.reactions || [],
          replyTo: m.replyTo || null,
        }));
        setMessages(formatted);
      });
      socket.on("receive-message", handleReceive);
    } else {
      socket.on("chat-history", (historyMessages) => {
        const formatted = historyMessages.map((m) => ({
          messageId: m.messageId,
          text: m.text,
          timestamp: m.timestamp,
          self: m.senderId === userId,
          reactions: m.reactions || [],
          replyTo: m.replyTo || null,
        }));
        setMessages(formatted);
        setPartnerLeft(false);
      });
      socket.on("receive-message", handleReceive);
    }

    socket.on("reaction-updated", handleReactionUpdate);
    socket.on("partner-typing", () => setPartnerTyping(true));
    socket.on("partner-stop-typing", () => setPartnerTyping(false));

    // Only match mode events
    if (mode === "match") {
      socket.on("partner-left", () => {
        setPartnerTyping(false);
        const stats = buildStats();
        setConversationStats(stats);
        setShowSummary(true);
      });
      socket.on("message-seen", () => setSeenByPartner(true));
      socket.on("mutual-like", () => {
        router.push("/inbox");
      });
    }

    const handleUpdated = (update) => {
      if (update.connectionId === roomId) {
        setAiInsights((prev) => ({
          ...prev,
          aiSummary: update.aiSummary ?? prev.aiSummary,
          vibe: update.vibe ?? prev.vibe,
          replySuggestions: update.replySuggestions ?? prev.replySuggestions,
          recommendExtend: update.recommendExtend ?? prev.recommendExtend,
        }));
      }
    };

    const handleDetail = (detail) => {
      if (detail._id === roomId) {
        setAiInsights({
          aiSummary: detail.aiSummary || null,
          vibe: detail.vibe || null,
          replySuggestions: detail.replySuggestions || [],
          recommendExtend: detail.recommendExtend || false,
        });
      }
    };

    socket.on("connection-updated", handleUpdated);
    socket.on("connection-detail", handleDetail);

    return () => {
      socket.off("connection-updated", handleUpdated);
      socket.off("connection-detail", handleDetail);
      socket.off("connect", handleConnect);
      socket.off("chat-history");
      
      if (mode === "connection") {
        socket.off("receive-connection-message", handleReceive);
      } else {
        socket.off("receive-message", handleReceive);
      }
      
      socket.off("reaction-updated", handleReactionUpdate);
      socket.off("partner-typing");
      socket.off("partner-stop-typing");
      
      if (mode === "match") {
        socket.off("partner-left");
        socket.off("message-seen");
        socket.off("mutual-like");
      }
    };
  }, [buildStats, router, socket, userId, mode, roomId]);

  useEffect(() => {
    setTimeout(() => setEntering(false), 300);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollDown(!atBottom);

    if (mode === "match" && atBottom) socket.emit("message-seen");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;

    if (mode === "connection") {
      socket.emit("send-connection-message", {
        roomId,
        text: message,
      });
    } else {
      socket.emit("send-message", {
        text: message,
        replyTo: replyTo ? { messageId: replyTo.messageId, text: replyTo.text } : null,
      });
    }

    socket.emit("stop-typing");
    microHaptic();

    setMessage("");
    setReplyTo(null);
    setSeenByPartner(false);

    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [message, replyTo, socket, mode, roomId]);

  const handleTyping = (val) => {
    setMessage(val);
    socket.emit("typing");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const subtlePing = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 700;
    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  };

  const microHaptic = () => {
    navigator.vibrate?.([4, 8, 4]);
  };

  const isGrouped = (msg, index) => {
    if (index === 0) return false;
    const prev = messages[index - 1];
    return prev && prev.self === msg.self && msg.timestamp - prev.timestamp < 120000;
  };



  const calculateTrust = (stats) => {
    if (!stats) return 0;
    let base = 5;
    if (stats.duration > 120) base += 5;
    if (stats.totalMessages > 15) base += 5;
    if (stats.totalMessages > 30) base += 5;
    return base;
  };

  return (
    <div className="relative flex h-[calc(100vh-70px)] flex-col bg-[#F7F5F0] text-[#2C2C2A] overflow-hidden">
      <div className={`flex flex-1 flex-col transition-all duration-500 ${entering ? "translate-y-4 opacity-0" : "opacity-100"} ${leaving ? "translate-x-4 opacity-0" : ""}`}>
        <div className="flex h-14 items-center justify-between border-b border-black/7 bg-white/50 px-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="text-sm tracking-wide font-medium">{identity.partner}</div>
              {tier && <TierBadge tier={tier} />}
            </div>
            <div className="text-[10px] text-[#888780] flex items-center gap-1">
              <span className="text-indigo-600 font-medium">
                ✦ {aiInsights.aiSummary || "AI: Observing context..."}
              </span>
            </div>
          </div>

          {mode === "match" && (
            <button onClick={() => setShowSkipConfirm(true)} className="text-xs tracking-[0.3em] text-red-500 transition hover:opacity-80">
              SKIP
            </button>
          )}
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.messageId}
              msg={msg}
              identity={identity}
              isGrouped={isGrouped(msg, i)}
              onReply={() => setReplyTo(msg)}
              onReact={(emoji) => {
                socket.emit("add-reaction", { messageId: msg.messageId, emoji });
                microHaptic();
              }}
              messages={messages}
              mode={mode}
            />
          ))}

          {partnerTyping && (
            <div className="flex items-center gap-2 text-sm text-[#888780] animate-fade-in">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#888780] [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#888780] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#888780] [animation-delay:300ms]" />
              </div>
              <span className="text-xs">{identity.partner} is typing...</span>
            </div>
          )}

          {mode === "match" && partnerLeft && (
            <div className="py-4 text-center text-sm text-[#888780]">{identity.partner} has left the chat</div>
          )}
          <div ref={bottomRef} />
        </div>

        {showScrollDown && (
          <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })} className="absolute bottom-24 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-black/7 shadow-sm transition animate-fade-in hover:bg-gray-50 text-[#2C2C2A]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {replyTo && mode === "match" && (
          <div className="flex items-center justify-between border-t border-black/7 bg-white px-6 py-2">
            <div className="flex-1 truncate text-[#2C2C2A]">
              <div className="mb-1 text-xs uppercase tracking-wider text-[#888780]">Replying to</div>
              <div className="truncate text-sm">{replyTo.text}</div>
            </div>
            <button onClick={() => setReplyTo(null)} className="ml-4 text-sm text-[#888780] transition hover:text-[#2C2C2A]">Cancel</button>
          </div>
        )}

        <div className="border-t border-black/7 bg-white px-6 py-4">
          {/* AI Suggestions */}
          {aiInsights.replySuggestions?.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none animate-in fade-in slide-in-from-bottom-2">
              {aiInsights.replySuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMessage(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-indigo-50/50 border border-indigo-100 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="max-h-32 flex-1 resize-none overflow-y-auto rounded-2xl bg-[#F7F5F0] border border-black/7 px-4 py-3 text-[#2C2C2A] placeholder:text-[#888780] outline-none transition focus:border-black/15"
            />
            <button onClick={sendMessage} disabled={!message.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7F77DD] text-white transition hover:bg-[#6860C7] disabled:cursor-not-allowed disabled:opacity-50">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {mode === "match" && seenByPartner && (
            <div className="mt-2 text-right text-xs text-[#888780]">Seen by {identity.partner}</div>
          )}
        </div>
      </div>

      {showIsland && (
        <div className="fixed left-1/2 top-20 -translate-x-1/2 rounded-full bg-white border border-black/7 shadow-sm px-4 py-2 text-sm text-[#2C2C2A] animate-fade-in">
          New message from {identity.partner}
        </div>
      )}

      {mode === "match" && showSkipConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
          <div className="mx-6 max-w-sm rounded-3xl border border-black/7 bg-white p-6 text-[#2C2C2A] animate-scale-in">
            <h3 className="mb-2 text-lg font-medium">Skip this chat?</h3>
            <p className="mb-6 text-sm text-[#888780]">You&apos;ll be matched with someone new</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSkipConfirm(false)} className="flex-1 rounded-xl bg-gray-100 py-3 font-medium transition hover:bg-gray-200">Cancel</button>
              <button
                onClick={() => {
                  const stats = buildStats();
                  setConversationStats(stats);
                  setShowSummary(true);
                  setShowSkipConfirm(false);
                }}
                className="flex-1 rounded-xl bg-red-50 py-3 text-red-600 font-medium transition hover:bg-red-100"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "match" && showSummary && conversationStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
          <div className="mx-6 max-w-sm space-y-6 rounded-3xl border border-black/7 bg-white p-6 text-center text-[#2C2C2A] animate-scale-in">
            <h2 className="text-xl font-semibold">Conversation Complete</h2>
            <div className="space-y-2 text-sm text-[#888780]">
              <div>Duration: {Math.floor(conversationStats.duration / 60)}m {conversationStats.duration % 60}s</div>
              <div>Messages exchanged: {conversationStats.totalMessages}</div>
            </div>
            <div className="animate-pulse text-lg font-semibold text-indigo-600">
              +{calculateTrust(conversationStats)} Trust
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setWaitingMutual(true);
                  socket.emit("like-partner", { roomId });
                }}
                disabled={waitingMutual}
                className="flex-1 rounded-xl bg-[#2C2C2A] text-white py-3 font-medium transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {waitingMutual ? "Waiting for them..." : "Continue Privately"}
              </button>
              <button
                onClick={() => {
                  socket.emit("leave-room");
                  router.push("/match");
                }}
                className="flex-1 rounded-xl bg-gray-100 py-3 font-medium transition hover:bg-gray-200"
              >
                Find New Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, identity, isGrouped, onReply, onReact, messages, mode }) {
  const [showReactions, setShowReactions] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [swiping, setSwiping] = useState(false);

  const replyToMsg = msg.replyTo ? messages.find((m) => m.messageId === msg.replyTo.messageId) : null;

  const handleTouchStart = (e) => {
    if (msg.self || mode === "connection") return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart || msg.self || mode === "connection") return;
    const diff = e.touches[0].clientX - touchStart;
    if (diff > 40) setSwiping(true);
  };

  const handleTouchEnd = () => {
    if (swiping && mode === "match") {
      onReply();
      navigator.vibrate?.(8);
    }
    setTouchStart(null);
    setSwiping(false);
  };

  const reactions = ["❤️", "😍", "😂", "😊", "😢", "👍"];

  return (
    <div 
      className={`flex ${msg.self ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : "mt-4"} ${swiping ? "translate-x-8" : ""} transition-transform`} 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
    >
      <div className="group relative max-w-[75%]">
        {replyToMsg && mode === "match" && (
          <div className="mb-2 border-l-2 border-black/10 pl-3 text-xs text-[#888780]">
            <div className="mb-1 uppercase tracking-wider">{replyToMsg.self ? identity.self : identity.partner}</div>
            <div className="truncate">{replyToMsg.text}</div>
          </div>
        )}

        <div className={`rounded-2xl px-4 py-2.5 ${msg.self ? "bg-[#2C2C2A] text-white" : "bg-white border border-black/7 text-[#2C2C2A]"} ${isGrouped && !msg.self ? "rounded-tl-md" : ""} ${isGrouped && msg.self ? "rounded-tr-md" : ""}`}>
          {!isGrouped && !msg.self && <div className="mb-1 text-xs text-[#888780] font-medium">{identity.partner}</div>}
          <div className="break-words whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</div>
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {msg.reactions.map((r, i) => (
                <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[#2C2C2A] border border-black/5">{r.emoji}</span>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowReactions(!showReactions)} 
          className="absolute -bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-black/7 text-xs text-[#2C2C2A] opacity-0 transition shadow-sm group-hover:opacity-100"
        >
          +
        </button>

        {showReactions && (
          <div className="absolute -top-12 right-0 flex gap-2 rounded-full border border-black/7 bg-white px-3 py-2 shadow-lg animate-scale-in">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowReactions(false);
                }}
                className="text-xl transition hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const colors = {
    bronze: "bg-amber-600/70",
    silver: "bg-gray-400/80",
    gold: "bg-yellow-400",
    platinum: "bg-indigo-400",
  };

  return (
    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#888780]">
      <span className={`h-2 w-2 rounded-full ${colors[tier] || "bg-gray-300"}`} />
      <span className="capitalize">{tier}</span>
    </div>
  );
}

function subtlePing() {
  try {
    const audio = new Audio("/ping.mp3");
    audio.volume = 0.2;
    audio.play().catch(() => {});
  } catch (e) {}
}

function microHaptic() {
  try {
    navigator?.vibrate?.(10);
  } catch (e) {}
}
