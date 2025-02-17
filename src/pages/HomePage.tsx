import React from "react";
import {
  UserCheck,
  Heart,
  RefreshCw,
  Users,
  Activity,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div
      className="bg-accent/40 custom-scrollbar m-4 flex flex-col overflow-x-auto rounded-lg p-4"
      style={{ height: "93.5%" }}
    >
      <div className="flex flex-1 flex-col items-center gap-4">
        {/* Hero Section with Gradient */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text font-mono text-4xl font-bold text-transparent">
            Nakama
          </h1>
          <p
            className="text-muted-foreground mt-2 text-sm uppercase"
            data-testid="pageTitle"
          >
            Anilist Relationship Manager
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Relationship Management Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-pink-500">
              <Users className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Relationship Management</h3>
            </div>
            <ul className="prose prose-sm list-disc space-y-2 pl-5">
              <li>Find users not following back</li>
              <li>Discover users you&apos;re not following back</li>
              <li>Bulk unfollow/follow actions</li>
              <li>Exclusion list management</li>
            </ul>
          </div>

          {/* Activity Interactions Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-purple-500">
              <Activity className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Activity Interactions</h3>
            </div>
            <ul className="prose prose-sm list-disc space-y-2 pl-5">
              <li>Like followed users&apos; activities</li>
              <li>Auto-like following feed</li>
              <li>Customizable liking intervals</li>
              <li>Activity type filters</li>
            </ul>
          </div>

          {/* Smart Follow Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-blue-500">
              <UserCheck className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Smart Follow</h3>
            </div>
            <ul className="prose prose-sm list-disc space-y-2 pl-5">
              <li>Follow random users from global feed</li>
              <li>Smart followback suggestions</li>
              <li>Activity-based following</li>
              <li>Follow rate limiting</li>
            </ul>
          </div>

          {/* Statistics Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-green-500">
              <ThumbsUp className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Engagement Analytics</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Total Followers" value="-" />
              <StatItem label="Total Following" value="-" />
              <StatItem label="Pending Actions" value="-" />
              <StatItem label="Recent Likes" value="-" />
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-orange-500">
              <RefreshCw className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10">
                Run Safety Check
              </Button>
              <Button variant="outline" className="h-10">
                Sync Data
              </Button>
              <Button variant="outline" className="h-10">
                Export Data
              </Button>
              <Button variant="outline" className="h-10">
                View Logs
              </Button>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-red-500">
              <Heart className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="prose prose-sm space-y-2">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
