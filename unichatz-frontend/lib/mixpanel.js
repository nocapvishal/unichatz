"use client";

import mixpanel from "mixpanel-browser";

let isInitialized = false;

export function initMixpanel() {
  if (isInitialized) return;

  mixpanel.init("1fe8b247e46011b70f06eb81eebe2bc9", {
    debug: true,
    track_pageview: true,
    persistence: "localStorage",
  });

  isInitialized = true;
}

/* ---------- TRACK HELPERS ---------- */

export const trackPage = (name) => {
  if (!isInitialized) return;
  mixpanel.track("Page Viewed", { page: name });
};

export const trackMatchStart = () => {
  mixpanel.track("Started Matching");
};

export const trackMatched = () => {
  mixpanel.track("User Matched");
};

export const trackMessageSent = () => {
  mixpanel.track("Message Sent");
};

export const trackSkip = () => {
  mixpanel.track("Skipped Partner");
};

// ── Added to fix missing imports in chat/page.js ──
export const trackChatStarted = () => {
  mixpanel.track("Chat Started");
};

export const trackMessageReceived = () => {
  mixpanel.track("Message Received");
};

export const trackChatSkipped = () => {
  mixpanel.track("Chat Skipped");
};

// ── Added to fix missing imports in match/page.js ──
export const trackSearchCancelled = () => {
  mixpanel.track("Search Cancelled");
};

export const trackRelaxAccepted = () => {
  mixpanel.track("Relax Intent Accepted");
};

export const trackOpenAccepted = () => {
  mixpanel.track("Open Match Accepted");
};