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
import { addUniqueMessage, getMessageType } from "@/utils/messageUtils";

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

  // Helper function that wraps the global addUniqueMessage function with component state
  const addMessage = (message: string) => {
    addUniqueMessage(message, recentMessages, setRecentMessages, setProgress);
  };

  useEffect(() => {
    const loadData = async () => {
      // If we've already started loading data, don't start again
      if (dataLoadStarted.current) return;
      dataLoadStarted.current = true;

      try {
        setLoading(true);
        setProgress(["🚀 Starting analysis of users not following back..."]);

        const opKey = "getUserId";
        if (!processedOps.current.has(opKey)) {
          processedOps.current.add(opKey);
          const currentUserId = await getUserId();
          addMessage(`🔍 Obtained current user ID: ${currentUserId}`);

          addMessage("🔄 Fetching followers list...");
          const followers = await getMultipleUserRelations(
            [currentUserId],
            undefined,
            (message) => {
              if (message.includes("Fetched")) {
                // Only add messages that contain "Fetched" and aren't duplicates
                addMessage(`📥 FOLLOWERS: ${message}`);
              } else if (message.includes("Retrying") && !isRateLimited) {
                // Only show one rate limiting message at a time
                setIsRateLimited(true);

                // Always use 61 seconds for rate limit retries
                const timeDisplayed = "1m 1s";
                addMessage(
                  `⚠️ RATE LIMITED: ${message.replace(/Retrying in [\d.]+[ms]+/i, "Retrying in 1m 1s")}`,
                );

                // Always use 61 seconds (61000ms) for the wait
                setTimeout(() => {
                  setIsRateLimited(false);
                  addMessage(`✅ Rate limit wait completed (${timeDisplayed})`);
                }, 61000);
              }
            },
            "followers",
            { returnIds: true },
          );

          addMessage("🔄 Fetching following list...");
          setIsRateLimited(false); // Reset rate limited state before next operation

          const following = await getMultipleUserRelations(
            [currentUserId],
            undefined,
            (message) => {
              if (message.includes("Fetched")) {
                // Only add messages that contain "Fetched" and aren't duplicates
                addMessage(`📤 FOLLOWING: ${message}`);
              } else if (message.includes("Retrying") && !isRateLimited) {
                // Only show one rate limiting message at a time
                setIsRateLimited(true);

                // Always use 61 seconds for rate limit retries
                const timeDisplayed = "1m 1s";
                addMessage(
                  `⚠️ RATE LIMITED: ${message.replace(/Retrying in [\d.]+[ms]+/i, "Retrying in 1m 1s")}`,
                );

                // Always use 61 seconds (61000ms) for the wait
                setTimeout(() => {
                  setIsRateLimited(false);
                  addMessage(`✅ Rate limit wait completed (${timeDisplayed})`);
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

          addMessage(
            `📊 Data collected: ${followingIds.length} following and ${followerIds.length} followers`,
          );

          const notFollowing = followingIds.filter(
            (id) => !followerIds.includes(id) && !excluded.includes(id),
          );

          // Add information about excluded users if any exist
          if (excluded.length > 0) {
            addMessage(
              `ℹ️ ${excluded.length} users are excluded from analysis`,
            );
          }

          setNotFollowingBack(notFollowing);
          setExcludedIds(excluded);

          if (notFollowing.length > 0) {
            addMessage(
              `🚨 Found ${notFollowing.length} users not following you back`,
            );
          } else {
            addMessage(
              `✅ Great news! All users you follow are following you back`,
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        addMessage(
          `❌ ERROR: ${err instanceof Error ? err.message : "Failed to load data"}`,
        );
      } finally {
        setLoading(false);
        setIsRateLimited(false);
        addMessage(`🏁 Analysis complete. Ready for action.`);
      }
    };

    loadData();
  }, []);

  const handleExclude = (userId: number) => {
    const newExcluded = [...excludedIds, userId];
    setExcludedIds(newExcluded);
    setNotFollowingBack((prev) => prev.filter((id) => id !== userId));
    saveExcludedIds(new Set(newExcluded));
    addMessage(`⏭️ Excluded user #${userId} from analysis`);
  };

  const handleBulkUnfollow = async () => {
    setLoading(true);
    setError(null);
    const unfollowed: number[] = [];

    addMessage(
      `🔄 Starting bulk unfollow process for ${notFollowingBack.length} users...`,
    );

    try {
      let successCount = 0;
      let failCount = 0;

      for (const userId of notFollowingBack) {
        try {
          const success = await unfollowUser(userId);
          if (success) {
            unfollowed.push(userId);
            successCount++;
            addMessage(
              `✅ Unfollowed user #${userId} (${successCount}/${notFollowingBack.length})`,
            );
          } else {
            failCount++;
            addMessage(
              `❌ Failed to unfollow user #${userId} - API returned unsuccessful status`,
            );
          }
        } catch (err) {
          failCount++;
          addMessage(
            `❌ Error unfollowing user #${userId}: ${(err as Error).message}`,
          );
        }
      }

      saveUnfollowedIds(new Set([...loadUnfollowedIds(), ...unfollowed]));
      setNotFollowingBack((prev) =>
        prev.filter((id) => !unfollowed.includes(id)),
      );

      addMessage(
        `🏁 Bulk unfollow complete: ${successCount} unfollowed, ${failCount} failed`,
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addMessage(`📋 Copied user IDs to clipboard`);
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
                disabled={notFollowingBack.length === 0}
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
              {notFollowingBack.length > 0 ? (
                notFollowingBack.map((userId) => (
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
                ))
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  {loading
                    ? "Loading users..."
                    : "No users found not following back"}
                </div>
              )}
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
