import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
      {
        autoConnect: false,
        transports: ["websocket"],
        withCredentials: true,
      }
    );
  }

  return socket;
}

// 🔥 CONNECT WITH AUTH (VERY IMPORTANT)
export function connectSocket(token) {
  const socketInstance = getSocket();

  if (token) {
    socketInstance.auth = { token }; // 👈 attach JWT here
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

// 🔥 SAFE DISCONNECT
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners(); // 👈 VERY IMPORTANT
    socket.disconnect();
  }
}

// 🔥 SAFE EVENT BINDING (PREVENT DUPLICATES)
export function onSocket(event, callback) {
  const socketInstance = getSocket();

  socketInstance.off(event); // 👈 remove old listener
  socketInstance.on(event, callback);
}

// 🔥 EMIT HELPER
export function emitSocket(event, data) {
  const socketInstance = getSocket();
  socketInstance.emit(event, data);
}

// 🔥 REMOVE SPECIFIC LISTENER (used for cleanup in useEffect)
export function offSocket(event, callback) {
  const socketInstance = getSocket();
  if (callback) {
    socketInstance.off(event, callback);
  } else {
    socketInstance.off(event);
  }
}