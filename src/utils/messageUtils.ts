import React from "react";

/**
 * Add a unique message to the progress feed while avoiding duplicates
 * @param message The message to add to the progress feed
 * @param recentMessages Array of recent messages used for duplicate detection
 * @param setRecentMessages State setter for the recent messages array
 * @param setProgress State setter for the progress messages array
 * @param maxRecentMessages Maximum number of recent messages to keep for duplicate detection (default 10)
 * @returns void
 */
export const addUniqueMessage = (
  message: string,
  recentMessages: string[],
  setRecentMessages: React.Dispatch<React.SetStateAction<string[]>>,
  setProgress: React.Dispatch<React.SetStateAction<string[]>>,
  maxRecentMessages: number = 10,
): void => {
  // Create a unique fingerprint for this message
  const msgFingerprint = message.replace(/\d+/g, (match) => {
    // Keep the page numbers for page-specific messages
    if (
      message.includes("page") &&
      message.match(/page (\d+)/)?.[1] === match
    ) {
      return match;
    }
    return "X";
  });

  // Check if this exact message already exists in recent messages
  if (recentMessages.includes(message)) {
    return;
  }

  // Check for "pattern duplicates" - same message with just different numbers
  if (
    message.includes("page") ||
    message.includes("user") ||
    message.includes("User")
  ) {
    // Check if we have a message with the same pattern
    const isDuplicate = recentMessages.some((oldMsg) => {
      const oldPattern = oldMsg.replace(/\d+/g, (match) => {
        // Keep the page numbers for page-specific messages
        if (
          oldMsg.includes("page") &&
          oldMsg.match(/page (\d+)/)?.[1] === match
        ) {
          return match;
        }
        return "X";
      });

      return (
        oldPattern === msgFingerprint &&
        // If it's about the same page, it's definitely a duplicate
        message.includes("page") &&
        oldMsg.includes("page") &&
        message.match(/page (\d+)/)?.at(1) === oldMsg.match(/page (\d+)/)?.at(1)
      );
    });

    if (isDuplicate) {
      return;
    }
  }

  // Add the message to recent messages for future duplicate checking
  setRecentMessages((prev) => {
    const updated = [...prev, message];
    // Keep only the most recent messages
    return updated.length > maxRecentMessages
      ? updated.slice(updated.length - maxRecentMessages)
      : updated;
  });

  // Add the message to the progress
  setProgress((prev) => [...prev, message]);
};

/**
 * Determine the type of message for styling purposes
 * @param message The message to analyze
 * @returns The message type (success, error, warning, etc.)
 */
export const getMessageType = (message: string): string => {
  if (message.includes("✅")) return "success";
  if (
    message.includes("❌") ||
    message.includes("ERROR") ||
    message.includes("🛑")
  )
    return "error";
  if (message.includes("⚠️") || message.includes("RATE LIMITED"))
    return "warning";
  if (message.includes("⏭️")) return "skipped";
  if (message.includes("🔄")) return "processing";
  if (message.includes("🏁")) return "complete";
  if (message.includes("📥") || message.includes("📤")) return "data";
  return "info";
};
