"use client";

import { useEffect, useState } from "react";
import { connectSocket, onSocket, emitSocket } from "@/lib/socket";

export default function SocketProvider({ children }) {
  const [incomingDM, setIncomingDM] = useState(null);

  useEffect(() => {
    connectSocket();

    // ================= DM EVENTS =================

    onSocket("dm-error", (data) => {
      alert(data.message);
    });

    onSocket("dm-request-sent", () => {
      alert("Request sent 💌");
    });

    onSocket("dm-request", (data) => {
      setIncomingDM(data);
    });

    onSocket("dm-accepted", (data) => {
      alert("Connection unlocked 🎉");
      // later: redirect to inbox
    });

    onSocket("dm-rejected", () => {
      alert("Request declined");
    });

  }, []);

  const acceptDM = () => {
    emitSocket("accept-dm-request", incomingDM.fromUserId);
    setIncomingDM(null);
  };

  const rejectDM = () => {
    emitSocket("reject-dm-request", incomingDM.fromUserId);
    setIncomingDM(null);
  };

  return (
    <>
      {children}

      {/* 🔥 DM POPUP */}
      {incomingDM && (
        <div className="fixed bottom-24 left-4 right-4 bg-[#1A1D2E] p-4 rounded-xl border border-[#262A38]">
          <p className="text-sm text-white mb-2">
            Someone wants to connect 💌
          </p>

          <div className="flex gap-2">
            <button
              onClick={acceptDM}
              className="bg-green-500 px-4 py-1 rounded text-white text-sm"
            >
              Accept
            </button>

            <button
              onClick={rejectDM}
              className="bg-red-500 px-4 py-1 rounded text-white text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </>
  );
}