import { Server, Socket } from "socket.io";
import { ModerationService } from "../services/moderation.service";
import User from "../models/User.model";
import mongoose from "mongoose";

interface ReportPayload {
  targetUserId: string;
  category: string;
}

interface BlockPayload {
  targetUserId: string;
}

export const registerModerationSockets = (io: Server, socket: Socket) => {
  const currentUserId = socket.data.userId as string;

  socket.on("report-user", async (payload: ReportPayload) => {
    try {
      const { targetUserId, category } = payload;

      if (!targetUserId || !category) return;

      const result = await ModerationService.applyReport(targetUserId, category);
      if (!result) return;

      if (result.warningTriggered) {
        const sockets = await io.fetchSockets();
        const targetSocket = sockets.find((s) => s.data.userId === targetUserId);

        if (targetSocket) {
          targetSocket.emit("behavior-warning", {
            message:
              "Please maintain respectful conversation. Continued violations may limit your matching visibility.",
            level: 1,
          });
        }
      }
    } catch (error) {
      console.error("Report error:", error);
    }
  });

  socket.on("block-user", async (payload: BlockPayload) => {
    try {
      const { targetUserId } = payload;

      if (!targetUserId || !currentUserId) return;

      const currentUser = await User.findById(currentUserId);
      if (!currentUser) return;

      const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

      if (
        !currentUser.blockList.some((id: mongoose.Types.ObjectId) =>
          id.equals(targetObjectId)
        )
      ) {
        currentUser.blockList.push(targetObjectId);
        await currentUser.save();
      }

      socket.emit("partner-left");
    } catch (error) {
      console.error("Block error:", error);
    }
  });
};
