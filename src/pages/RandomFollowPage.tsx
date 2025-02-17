import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { followRandomUsers } from "@/api/followRandomUsers";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, X, Info, AlertCircle, Users } from "lucide-react";

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

  async function handleFollow() {
    setLoading(true);
    setError(null);
    setProgress([]); // Clear previous progress messages
    abortControllerRef.current = new AbortController();
    try {
      const followedIds = await followRandomUsers(totalPeople, threshold, {
        signal: abortControllerRef.current.signal,
        onProgress: (msg: string) => {
          setProgress((prev) => [...prev, msg]);
        },
      });
      setFollowed(followedIds);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  // Copy to clipboard functionality
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Parse progress messages for styling
  const getMessageType = (message: string) => {
    if (message.includes("Successfully")) return "success";
    if (
      message.includes("Failed") ||
      message.includes("Error") ||
      message.includes("aborted")
    )
      return "error";
    if (message.includes("Skipping") || message.includes("Retrying"))
      return "warning";
    return "info";
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
                  onClick={() => abortControllerRef.current?.abort()}
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
              <div className="space-y-4">
                {progress.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 rounded-lg p-3 ${
                      getMessageType(msg) === "success"
                        ? "bg-green-100/50 dark:bg-green-900/20"
                        : getMessageType(msg) === "error"
                          ? "bg-red-100/50 dark:bg-red-900/20"
                          : getMessageType(msg) === "warning"
                            ? "bg-yellow-100/50 dark:bg-yellow-900/20"
                            : "bg-blue-100/50 dark:bg-blue-900/20"
                    }`}
                  >
                    <span className="mt-1">
                      {getMessageType(msg) === "success" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : getMessageType(msg) === "error" ? (
                        <X className="h-4 w-4 text-red-600" />
                      ) : getMessageType(msg) === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600" />
                      )}
                    </span>
                    <span className="flex-1">{msg}</span>
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
