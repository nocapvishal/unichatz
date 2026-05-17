import Analytics from "../models/Analytics.model";

export const logEvent = async (
  type: string,
  data?: any
) => {
  try {
    await Analytics.create({
      type,
      ...data,
    });
  } catch (err) {
    console.error("Analytics log failed:", err);
  }
};