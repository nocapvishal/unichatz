import Notification from "../models/Notification.model";

export async function createNotification(
  userId: string,
  type: string,
  referenceId?: string
) {

  return Notification.create({
    userId,
    type,
    referenceId
  });

}

export async function getNotifications(userId: string) {

  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30);

}