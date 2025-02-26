import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserX, Copy, Check, X, AlertCircle } from "lucide-react";
import {
  getMultipleUserRelations,
  getUserId,
  unfollowUser,
} from "@/api/anilistApi";
import {
  loadExcludedIds,
  saveExcludedIds,
  loadUnfollowedIds,
  saveUnfollowedIds,
} from "@/api/config";

export default function NotFollowingBack() {
  const [loading, setLoading] = useState(true);
  const [notFollowingBack, setNotFollowingBack] = useState<number[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track recent messages to avoid duplicates (not just the last one)
  const [recentMessages, setRecentMessages] = useState<string[]>([]);
  // Track if we're currently rate limited to avoid duplicate messages
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // Use a ref to track if we've started loading data to prevent double execution
  const dataLoadStarted = useRef<boolean>(false);
  // Use a ref to track processed operations to prevent duplicates
  const processedOps = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      // If we've already started loading data, don't start again
      if (dataLoadStarted.current) return;
      dataLoadStarted.current = true;

      try {
        setLoading(true);
        setProgress(["Starting to fetch data..."]);

        const opKey = "getUserId";
        if (!processedOps.current.has(opKey)) {
          processedOps.current.add(opKey);
          const currentUserId = await getUserId();
          addUniqueMessage(`Obtained current user ID: ${currentUserId}`);

          addUniqueMessage("⏳ Fetching followers list...");
          const followers = await getMultipleUserRelations(
            [currentUserId],
            undefined,
            (message) => {
              if (message.includes("Fetched")) {
                // Only add messages that contain "Fetched" and aren't duplicates
                addUniqueMessage(`📥 FOLLOWERS: ${message}`);
              } else if (message.includes("Retrying") && !isRateLimited) {
                // Only show one rate limiting message at a time
                setIsRateLimited(true);

                // Always use 61 seconds for rate limit retries
                const timeDisplayed = "1m 1s";
                addUniqueMessage(
                  `⚠️ RATE LIMITED: ${message.replace(/Retrying in [\d.]+[ms]+/i, "Retrying in 1m 1s")}`,
                );

                // Always use 61 seconds (61000ms) for the wait
                setTimeout(() => {
                  setIsRateLimited(false);
                  addUniqueMessage(
                    `✅ Rate limit wait completed (${timeDisplayed})`,
                  );
                }, 61000);
              }
            },
            "followers",
            { returnIds: true },
          );

          addUniqueMessage("⏳ Fetching following list...");
          setIsRateLimited(false); // Reset rate limited state before next operation

          const following = await getMultipleUserRelations(
            [currentUserId],
            undefined,
            (message) => {
              if (message.includes("Fetched")) {
                // Only add messages that contain "Fetched" and aren't duplicates
                addUniqueMessage(`📤 FOLLOWING: ${message}`);
              } else if (message.includes("Retrying") && !isRateLimited) {
                // Only show one rate limiting message at a time
                setIsRateLimited(true);

                // Always use 61 seconds for rate limit retries
                const timeDisplayed = "1m 1s";
                addUniqueMessage(
                  `⚠️ RATE LIMITED: ${message.replace(/Retrying in [\d.]+[ms]+/i, "Retrying in 1m 1s")}`,
                );

                // Always use 61 seconds (61000ms) for the wait
                setTimeout(() => {
                  setIsRateLimited(false);
                  addUniqueMessage(
                    `✅ Rate limit wait completed (${timeDisplayed})`,
                  );
                }, 61000);
              }
            },
            "following",
            { returnIds: true },
          );

          const excluded = Array.from(loadExcludedIds());
          const followingData = following[currentUserId];
          const followerData = followers[currentUserId];
          const followingIds: number[] = Array.isArray(followingData)
            ? followingData
            : typeof followingData === "number"
              ? [followingData]
              : [];
          const followerIds: number[] = Array.isArray(followerData)
            ? followerData
            : typeof followerData === "number"
              ? [followerData]
              : [];

          addUniqueMessage(
            `✅ Completed: Found ${followingIds.length} following and ${followerIds.length} followers`,
          );

          const notFollowing = followingIds.filter(
            (id) => !followerIds.includes(id) && !excluded.includes(id),
          );

          setNotFollowingBack(notFollowing);
          setExcludedIds(excluded);
          addUniqueMessage(
            `✅ Analysis complete: Found ${notFollowing.length} users not following back`,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        addUniqueMessage(
          `❌ ERROR: ${err instanceof Error ? err.message : "Failed to load data"}`,
        );
      } finally {
        setLoading(false);
        setIsRateLimited(false);
      }
    };

    // Helper function to add a message only if it's not a duplicate
    const addUniqueMessage = (message: string) => {
      // Keep track of the last 10 messages to check for duplicates
      const MAX_RECENT_MESSAGES = 10;

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
      if (message.includes("Fetched page") || message.includes("User")) {
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
            message.match(/page (\d+)/)?.at(1) ===
              oldMsg.match(/page (\d+)/)?.at(1)
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
        return updated.length > MAX_RECENT_MESSAGES
          ? updated.slice(updated.length - MAX_RECENT_MESSAGES)
          : updated;
      });

      // Add the message to the progress
      setProgress((prev) => [...prev, message]);
    };

    loadData();
  }, []);

  const handleExclude = (userId: number) => {
    const newExcluded = [...excludedIds, userId];
    setExcludedIds(newExcluded);
    setNotFollowingBack((prev) => prev.filter((id) => id !== userId));
    saveExcludedIds(new Set(newExcluded));
    setProgress((prev) => [...prev, `Excluded user #${userId} from list`]);
  };

  const handleBulkUnfollow = async () => {
    setLoading(true);
    setError(null);
    const unfollowed: number[] = [];

    try {
      for (const userId of notFollowingBack) {
        try {
          const success = await unfollowUser(userId);
          if (success) {
            unfollowed.push(userId);
            setProgress((prev) => [
              ...prev,
              `Successfully unfollowed user #${userId}`,
            ]);
          }
        } catch (err) {
          setProgress((prev) => [
            ...prev,
            `Failed to unfollow user #${userId}: ${(err as Error).message}`,
          ]);
        }
      }

      saveUnfollowedIds(new Set([...loadUnfollowedIds(), ...unfollowed]));
      setNotFollowingBack((prev) =>
        prev.filter((id) => !unfollowed.includes(id)),
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
            Not Following Back
          </h1>
          <p className="text-muted-foreground text-lg">
            Users who aren&apos;t following you back
          </p>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(notFollowingBack.join(", "))}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy IDs
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
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
              {notFollowingBack.map((userId) => (
                <div
                  key={userId}
                  className="mb-2 flex items-center justify-between rounded-lg bg-red-100/50 p-3 dark:bg-red-900/20"
                >
                  <span className="font-mono">#{userId}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(userId.toString())}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExclude(userId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </Card>

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
                {progress.map((msg, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-3 ${
                      msg.includes("ERROR")
                        ? "bg-red-100/50 dark:bg-red-900/20"
                        : msg.includes("RATE LIMITED")
                          ? "bg-yellow-100/50 dark:bg-yellow-900/20"
                          : msg.includes("Rate limit wait completed")
                            ? "bg-green-100/50 dark:bg-green-900/20"
                            : msg.includes("FOLLOWERS")
                              ? "bg-blue-100/50 dark:bg-blue-900/20"
                              : msg.includes("FOLLOWING")
                                ? "bg-purple-100/50 dark:bg-purple-900/20"
                                : msg.includes("complete")
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
        </div>

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
