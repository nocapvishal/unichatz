import Message from "../models/Message.model";
import Connection from "../models/Connection.model";

export async function saveMessage(
  connectionId: string | null,
  senderId: string,
  text: string,
  messageId: string,
  roomId?: string
) {

  const message = await Message.create({
    connectionId: connectionId || undefined,
    roomId: roomId || undefined,
    senderId,
    text,
    messageId
  });

  // Update connection preview if it exists
  if (connectionId) {
    await Connection.findByIdAndUpdate(connectionId, {
      lastMessageAt: new Date(),
      lastMessagePreview: text.slice(0, 120),
      locked: false
    });
  }

  return message;
}

export async function getMessages(connectionId: string) {

  return Message.find({ connectionId })
    .sort({ createdAt: 1 })
    .limit(200);

}