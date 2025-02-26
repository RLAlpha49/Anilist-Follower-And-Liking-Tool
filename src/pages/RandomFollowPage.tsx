import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, X, Info, AlertCircle, Users } from "lucide-react";
import { followRandomUsers } from "@/api/followRandomUsers";
import { addUniqueMessage, getMessageType } from "@/utils/messageUtils";

/**
 * RandomFollowPage - A page component that allows users to follow random AniList users.
 *
 * Key features:
 * - Configurable number of users to follow
 * - Minimum follower threshold to target more active accounts
 * - Real-time progress monitoring with activity feed
 * - Process can be manually stopped at any point
 * - Displays results with copy functionality
 */
export default function RandomFollowPage() {
  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------
  // User input configuration
  const [totalPeople, setTotalPeople] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(1000);

  // Operation state tracking
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Progress tracking and display
  const [progress, setProgress] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Message handling state to prevent duplicates and rate limits
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [recentMessages, setRecentMessages] = useState<string[]>([]);

  // Ref to hold the AbortController for cancelling the follow process
  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Auto-scroll for activity feed - keeps the most recent messages visible
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Automatically scroll to bottom when new messages are added
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress, autoScroll]);

  /**
   * Handles scroll events on the activity feed to detect when user manually scrolls
   * This prevents auto-scrolling when the user is looking at previous messages
   *
   * @param e - The scroll event
   */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const atBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;
    setAutoScroll(atBottom);
  };

  /**
   * Helper function that wraps the global addUniqueMessage function with component state.
   * Handles special cases like rate limits and ensures emoji indicators are added consistently.
   *
   * @param message - The message to add to the activity feed
   */
  const addMessage = (message: string) => {
    // Handle rate limit messages specially to avoid duplicates
    // and to schedule a completion message when the rate limit is over
    if (message.includes("RATE LIMITED") && !isRateLimited) {
      setIsRateLimited(true);

      // Schedule a message for when the rate limit is over (typically 61 seconds)
      setTimeout(() => {
        setIsRateLimited(false);
        addUniqueMessage(
          `✅ Rate limit wait completed (1m 1s)`,
          recentMessages,
          setRecentMessages,
          setProgress,
        );
      }, 61000);
    } else if (message.includes("Retrying") && !isRateLimited) {
      // Convert generic retry messages to our standardized format
      setIsRateLimited(true);
      const standardizedMsg = message.replace(
        /Retrying in [\d.]+[ms]+/i,
        "Retrying in 1m 1s",
      );

      // Add emoji indicator for rate limit
      message = `⚠️ RATE LIMITED: ${standardizedMsg}`;

      // Schedule a rate limit completion message
      setTimeout(() => {
        setIsRateLimited(false);
        addUniqueMessage(
          `✅ Rate limit wait completed (1m 1s)`,
          recentMessages,
          setRecentMessages,
          setProgress,
        );
      }, 61000);
    } else if (message.includes("Retrying") && isRateLimited) {
      // Skip duplicate rate limit messages to avoid spamming the activity feed
      return;
    }

    // Add emoji indicators based on message content if not already present
    // This enhances readability by giving visual cues about message types
    if (!message.match(/^[^\w\s]/)) {
      // Check if message doesn't start with an emoji
      if (
        message.includes("Successfully followed") ||
        message.includes("success")
      ) {
        message = `✅ ${message}`;
      } else if (message.includes("Failed") || message.includes("Error")) {
        message = `❌ ${message}`;
      } else if (message.includes("Skipping")) {
        message = `⏭️ ${message}`;
      } else if (message.includes("Attempting to follow")) {
        message = `🔄 ${message}`;
      } else if (
        message.includes("Fetching") ||
        message.includes("Processing")
      ) {
        message = `🔍 ${message}`;
      } else if (
        message.includes("Initializing") ||
        message.includes("Starting")
      ) {
        message = `🚀 ${message}`;
      } else if (
        message.includes("Completed") ||
        message.includes("Reached target")
      ) {
        message = `🏁 ${message}`;
      } else if (message.includes("aborted")) {
        message = `🛑 ${message}`;
      }
    }

    // Add the message to the activity feed using the global utility
    addUniqueMessage(message, recentMessages, setRecentMessages, setProgress);
  };

  /**
   * Main function to handle the follow process
   * Invokes the followRandomUsers API function with the user's configuration
   */
  async function handleFollow() {
    setLoading(true);
    setError(null);
    setProgress([]); // Clear previous progress messages
    setRecentMessages([]); // Clear recent messages tracking
    setIsRateLimited(false); // Reset rate limited state

    // Create a new AbortController for this operation
    // This allows the process to be cancelled by the user
    abortControllerRef.current = new AbortController();

    try {
      // Call the API function to follow random users
      // This will handle finding and following users based on the criteria
      const followedIds = await followRandomUsers(totalPeople, threshold, {
        signal: abortControllerRef.current.signal,
        onProgress: addMessage,
      });

      // Store the results for display
      setFollowed(followedIds);
      addMessage("✅ Process completed! Check your AniList following list.");
    } catch (err) {
      // Handle errors, distinguishing between user cancellation and actual errors
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
        addMessage(`❌ ERROR: ${err.message}`);
      } else if (err instanceof Error && err.name === "AbortError") {
        addMessage("🛑 Process was manually stopped by user.");
      }
    } finally {
      // Clean up state regardless of success, failure, or cancellation
      setLoading(false);
      setIsRateLimited(false);
    }
  }

  /**
   * Copies user IDs to clipboard and shows a confirmation message
   *
   * @param text - The text (user IDs) to copy to clipboard
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addMessage(`📋 Copied user IDs to clipboard`);
  };

  // -------------------------------------------------------------------------
  // Component Rendering
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header Section */}
        <div className="space-y-2 text-center">
          <h1 className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-4xl font-bold text-transparent">
            Follow Random Users
          </h1>
          <p className="text-muted-foreground text-lg">
            Follow random users based on follower count
          </p>
        </div>

        {/* Control Panel - User configuration and action buttons */}
        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFollow();
            }}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Input for number of users to follow */}
              <div className="space-y-2">
                <Label
                  htmlFor="totalPeople"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Users to Follow
                </Label>
                <Input
                  id="totalPeople"
                  type="number"
                  value={totalPeople}
                  onChange={(e) => setTotalPeople(Number(e.target.value))}
                  min="1"
                  className="text-lg"
                />
              </div>

              {/* Input for minimum follower threshold */}
              <div className="space-y-2">
                <Label htmlFor="threshold" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Minimum Followers
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  min="0"
                  className="text-lg"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Start Following Button - Primary action */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">⏳</span>
                    Following Users...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Start Following
                  </span>
                )}
              </Button>

              {/* Stop Process Button - Only shown when following is in progress */}
              {loading && (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => {
                    abortControllerRef.current?.abort();
                    addMessage("🛑 Process manually stopped by user");
                  }}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-5 w-5" />
                  Stop Process
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Progress & Results Section - Two-column layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Progress Feed */}
          <Card className="h-96">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="flex items-center gap-2 pr-4 text-xl font-semibold">
                <Info className="h-5 w-5" />
                Activity Feed
              </h2>
              <span className="text-muted-foreground text-sm">
                {progress.length} events
              </span>
            </div>
            <ScrollArea
              ref={scrollRef}
              className="h-80 p-4"
              onScroll={handleScroll}
            >
              <div className="space-y-2">
                {/* Map through progress messages with color coding by type */}
                {progress.map((msg, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-3 ${
                      getMessageType(msg) === "success"
                        ? "bg-green-100/50 dark:bg-green-900/20"
                        : getMessageType(msg) === "error"
                          ? "bg-red-100/50 dark:bg-red-900/20"
                          : getMessageType(msg) === "warning"
                            ? "bg-yellow-100/50 dark:bg-yellow-900/20"
                            : getMessageType(msg) === "skipped"
                              ? "bg-gray-100/50 dark:bg-gray-800/30"
                              : getMessageType(msg) === "processing"
                                ? "bg-purple-100/50 dark:bg-purple-900/20"
                                : getMessageType(msg) === "complete"
                                  ? "bg-green-100/50 dark:bg-green-900/20"
                                  : "bg-blue-100/50 dark:bg-blue-900/20"
                    }`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Right Column - Followed Users List */}
          <Card className="h-96">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="flex items-center gap-2 pr-4 text-xl font-semibold">
                <Check className="h-5 w-5" />
                Successful Follows
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {followed.length} users
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(followed.join(", "))}
                  disabled={followed.length === 0}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-80 p-4">
              {followed.length > 0 ? (
                // Grid of successfully followed users with copy functionality
                <div className="grid grid-cols-2 gap-3">
                  {followed.map((id) => (
                    <div
                      key={id}
                      className="bg-muted/50 flex items-center justify-between rounded-lg p-2"
                    >
                      <span className="font-mono">#{id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(id.toString())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty state message
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  No followed users yet
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Error Display Section - Only shown when there's an error */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <div className="flex items-center gap-3 p-4">
              <AlertCircle className="text-destructive h-5 w-5" />
              <div>
                <h3 className="text-destructive font-medium">Process Error</h3>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
