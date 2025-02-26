import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserX, Copy, Check, X, AlertCircle } from "lucide-react";
import { addUniqueMessage, getMessageType } from "@/utils/messageUtils";
import {
  analyzeNotFollowingBack,
  excludeUser,
  bulkUnfollowUsers,
} from "@/api/notFollowingBack";

/**
 * NotFollowingBack - A page component that shows users who the current user follows but who don't follow back.
 *
 * Key features:
 * - Automatically loads followers and following data on mount
 * - Displays users not following back in a list
 * - Allows users to exclude specific users from analysis
 * - Provides bulk unfollow capabilities for multiple users at once
 * - Shows real-time progress and activity with categorized messages
 */
export default function NotFollowingBack() {
  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------
  // Core data state
  const [loading, setLoading] = useState(true);
  const [notFollowingBack, setNotFollowingBack] = useState<number[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Message handling state to prevent duplicates and manage rate limits
  const [recentMessages, setRecentMessages] = useState<string[]>([]);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // Refs for preventing double data loading and managing API requests
  const dataLoadStarted = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Add a mounted ref to track component lifecycle
  const isMounted = useRef<boolean>(true);

  /**
   * Helper function that wraps the global addUniqueMessage function with component state.
   * Handles special cases like rate limits and ensures emoji indicators are added consistently.
   *
   * @param message - The message to add to the activity feed
   */
  const addMessage = (message: string) => {
    // Don't update state if component is unmounted
    if (!isMounted.current) return;

    // Special handling for rate limit messages to avoid duplicates
    // and to schedule a completion message when the rate limit is over
    if (message.includes("RATE LIMITED") && !isRateLimited) {
      setIsRateLimited(true);

      // Schedule a message for when the rate limit is over (typically 61 seconds)
      setTimeout(() => {
        // Check if component is still mounted before updating state
        if (isMounted.current) {
          setIsRateLimited(false);
          addUniqueMessage(
            `✅ Rate limit wait completed (1m 1s)`,
            recentMessages,
            setRecentMessages,
            setProgress,
          );
        }
      }, 61000);
    }

    // Pass the message to the global utility function
    addUniqueMessage(message, recentMessages, setRecentMessages, setProgress);
  };

  // -------------------------------------------------------------------------
  // Data Loading - Automatically run on component mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Set mounted flag to true on component mount
    isMounted.current = true;
    // Reset dataLoadStarted flag to ensure we can reload data if needed
    dataLoadStarted.current = false;
    // Reset error state
    setError(null);

    /**
     * Asynchronous function to load data about users not following back.
     * Uses the analyzeNotFollowingBack API function to fetch and analyze data.
     */
    const loadData = async () => {
      // Prevent double execution if already started
      if (dataLoadStarted.current) return;
      dataLoadStarted.current = true;

      // Create a new AbortController for this operation
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setProgress([]);

        // Call the API function to analyze who's not following back
        // This will handle fetching followers and following lists and comparing them
        const { notFollowingBack: notFollowing, excludedIds: excluded } =
          await analyzeNotFollowingBack({
            signal: abortControllerRef.current.signal,
            onProgress: addMessage,
          });

        // Check if component is still mounted before updating state
        if (isMounted.current) {
          // Update state with the results
          setNotFollowingBack(notFollowing);
          setExcludedIds(excluded);
        }
      } catch (err) {
        // Only handle non-abort errors and only if component is still mounted
        if (isMounted.current && err instanceof Error) {
          // Only show the error if it's not an AbortError or if it contains a meaningful message
          // that isn't just about the signal being aborted
          if (
            err.name !== "AbortError" &&
            !err.message.includes("signal is aborted")
          ) {
            setError(err.message);
            addMessage(`❌ ERROR: ${err.message}`);
          }
        }
      } finally {
        // Only update state if component is still mounted
        if (isMounted.current) {
          setLoading(false);
          setIsRateLimited(false);
        }
      }
    };

    // Start the data loading process
    loadData();

    // Cleanup function to abort any pending requests if the component unmounts
    return () => {
      // Set the mounted flag to false to prevent state updates after unmount
      isMounted.current = false;

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // User Interaction Handlers
  // -------------------------------------------------------------------------
  /**
   * Handles excluding a user from the "not following back" analysis
   * This allows users to keep following certain accounts even if they don't follow back
   *
   * @param userId - The ID of the user to exclude
   */
  const handleExclude = (userId: number) => {
    // Call the API function to exclude the user and get the updated excluded list
    const newExcluded = excludeUser(userId, excludedIds, addMessage);

    // Update state
    setExcludedIds(newExcluded);
    // Remove the excluded user from the "not following back" list
    setNotFollowingBack((prev) => prev.filter((id) => id !== userId));
  };

  /**
   * Handles the bulk unfollow process for all users currently in the not following back list
   * This will attempt to unfollow each user and update the UI accordingly
   */
  const handleBulkUnfollow = async () => {
    // Don't proceed if component is unmounted
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    // Clean up any existing abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController for this operation
    abortControllerRef.current = new AbortController();

    try {
      // Call the API function to unfollow multiple users at once
      const { unfollowed } = await bulkUnfollowUsers(notFollowingBack, {
        signal: abortControllerRef.current.signal,
        onProgress: addMessage,
      });

      // Don't update state if component unmounted during the operation
      if (!isMounted.current) return;

      // Update state with the result - remove successfully unfollowed users from the list
      setNotFollowingBack((prev) =>
        prev.filter((id) => !unfollowed.includes(id)),
      );
    } catch (err) {
      // Only handle non-abort errors and only if component is still mounted
      if (
        isMounted.current &&
        err instanceof Error &&
        err.name !== "AbortError"
      ) {
        setError(err.message);
      }
    } finally {
      // Only update state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

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
          <h1 className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
            Not Following Back
          </h1>
          <p className="text-muted-foreground text-lg">
            Users who aren&apos;t following you back
          </p>
        </div>

        {/* Action Buttons Section */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Bulk Unfollow Button - Primary action */}
            <Button
              variant="destructive"
              size="lg"
              onClick={handleBulkUnfollow}
              disabled={loading || notFollowingBack.length === 0}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Bulk Unfollow ({notFollowingBack.length})
                </span>
              )}
            </Button>

            {/* Copy IDs Button - Secondary action */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(notFollowingBack.join(", "))}
                disabled={notFollowingBack.length === 0}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy IDs
              </Button>
            </div>
          </div>
        </Card>

        {/* Data Display Section - Two-column layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - User List */}
          <Card className="h-96">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="flex items-center gap-2 pr-4 text-xl font-semibold">
                <AlertCircle className="h-5 w-5" />
                User List
              </h2>
              <span className="text-muted-foreground text-sm">
                {notFollowingBack.length} users
              </span>
            </div>
            <ScrollArea className="h-80 p-4">
              {notFollowingBack.length > 0 ? (
                // Map through users not following back
                notFollowingBack.map((userId) => (
                  <div
                    key={userId}
                    className="mb-2 flex items-center justify-between rounded-lg bg-red-100/50 p-3 dark:bg-red-900/20"
                  >
                    <span className="font-mono">#{userId}</span>
                    <div className="flex gap-2">
                      {/* Copy individual user ID */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(userId.toString())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {/* Exclude user from analysis */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExclude(userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                // Empty state message
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  {loading
                    ? "Loading users..."
                    : "No users found not following back"}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Right Column - Activity Feed */}
          <Card className="h-96">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="flex items-center gap-2 pr-4 text-xl font-semibold">
                <Check className="h-5 w-5" />
                Activity Feed
              </h2>
              <span className="text-muted-foreground text-sm">
                {progress.length} events
              </span>
            </div>
            <ScrollArea className="h-80 p-4">
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
                                  : getMessageType(msg) === "data"
                                    ? "bg-blue-100/50 dark:bg-blue-900/20"
                                    : "bg-blue-100/50 dark:bg-blue-900/20"
                    }`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Error Display Section - Only shown when there's an error */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <div className="flex items-center gap-3 p-4">
              <AlertCircle className="text-destructive h-5 w-5" />
              <div>
                <h3 className="text-destructive font-medium">Error</h3>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
