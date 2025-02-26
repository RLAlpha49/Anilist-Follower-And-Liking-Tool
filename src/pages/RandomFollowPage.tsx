import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { followRandomUsers } from "@/api/followRandomUsers";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, X, Info, AlertCircle, Users } from "lucide-react";
import { addUniqueMessage, getMessageType } from "@/utils/messageUtils";

export default function RandomFollowPage() {
  // State for user inputs
  const [totalPeople, setTotalPeople] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(1000);
  // State for loading, error and results
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  // State for progress updates
  const [progress, setProgress] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  // Track if we're currently rate limited to avoid duplicate messages
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  // Track recent messages to avoid duplicates
  const [recentMessages, setRecentMessages] = useState<string[]>([]);

  // Ref to hold the AbortController for cancelling the follow process
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add scroll handler
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress, autoScroll]);

  // Add scroll position detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const atBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;
    setAutoScroll(atBottom);
  };

  // Helper function that wraps the global addUniqueMessage function with component state
  const addMessage = (message: string) => {
    addUniqueMessage(message, recentMessages, setRecentMessages, setProgress);
  };

  async function handleFollow() {
    setLoading(true);
    setError(null);
    setProgress([]); // Clear previous progress messages
    setRecentMessages([]); // Clear recent messages tracking
    setIsRateLimited(false); // Reset rate limited state
    abortControllerRef.current = new AbortController();

    try {
      const followedIds = await followRandomUsers(totalPeople, threshold, {
        signal: abortControllerRef.current.signal,
        onProgress: (msg: string) => {
          // Format and improve messages before adding them
          let formattedMsg = msg;

          // Add emoji indicators based on message content
          if (msg.includes("Successfully followed")) {
            formattedMsg = `✅ ${msg}`;
          } else if (msg.includes("Failed") || msg.includes("Error")) {
            formattedMsg = `❌ ${msg}`;
          } else if (msg.includes("Skipping")) {
            formattedMsg = `⏭️ ${msg}`;
          } else if (msg.includes("Attempting to follow")) {
            formattedMsg = `🔄 ${msg}`;
          } else if (msg.includes("Fetching") || msg.includes("Processing")) {
            formattedMsg = `🔍 ${msg}`;
          } else if (msg.includes("Initializing") || msg.includes("Starting")) {
            formattedMsg = `🚀 ${msg}`;
          } else if (
            msg.includes("Completed") ||
            msg.includes("Reached target")
          ) {
            formattedMsg = `🏁 ${msg}`;
          } else if (msg.includes("aborted")) {
            formattedMsg = `🛑 ${msg}`;
          }

          // Handle rate limiting messages
          if (msg.includes("Retrying") && !isRateLimited) {
            setIsRateLimited(true);
            const timeDisplayed = "1m 1s";
            const standardizedMsg = msg.replace(
              /Retrying in [\d.]+[ms]+/i,
              "Retrying in 1m 1s",
            );
            formattedMsg = `⚠️ RATE LIMITED: ${standardizedMsg}`;

            // Schedule rate limit completion message
            setTimeout(() => {
              setIsRateLimited(false);
              addMessage(`✅ Rate limit wait completed (${timeDisplayed})`);
            }, 61000);
          } else if (msg.includes("Retrying") && isRateLimited) {
            // Skip duplicate rate limit messages
            return;
          }

          addMessage(formattedMsg);
        },
      });
      setFollowed(followedIds);
    } catch (err) {
      setError((err as Error).message);
      addMessage(`❌ ERROR: ${(err as Error).message}`);
    }
    setLoading(false);
  }

  // Copy to clipboard functionality
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

        {/* Control Panel */}
        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFollow();
            }}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

        {/* Progress & Results */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Progress Feed */}
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

          {/* Followed Users */}
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
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-80 p-4">
              {followed.length > 0 ? (
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
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  No followed users yet
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Error Display */}
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
