import Connection from "../models/Connection.model";

export async function getUserConnections(userId: string) {

  const connections = await Connection.find({
    participants: userId
  })
  .sort({ lastMessageAt: -1 })
  .limit(20);

  return connections;

}