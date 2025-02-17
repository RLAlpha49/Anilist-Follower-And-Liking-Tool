import React from "react";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, RefreshCw, UserX, UserPlus } from "lucide-react";
import { Link, Outlet } from "@tanstack/react-router";

export default function FollowerAndFollowing() {
  return (
    <div
      className="bg-accent/40 custom-scrollbar m-4 flex flex-col overflow-x-auto rounded-lg p-4"
      style={{ height: "calc(100% - 56px)" }}
    >
      <div className="flex flex-1 flex-col items-center gap-4">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text font-mono text-4xl font-bold text-transparent">
            Relationship Manager
          </h1>
          <p
            className="text-muted-foreground mt-2 text-sm uppercase"
            data-testid="pageTitle"
          >
            Manage Your Anilist Connections
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Follow Random Users Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-blue-500">
              <UserPlus className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Follow Random Users</h3>
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Follow random users from global activity
              </p>
              <Link to="/follower-and-following/random">
                <Button className="w-full" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Find Random Users
                </Button>
              </Link>
            </div>
          </div>

          {/* Not Following Back Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-red-500">
              <UserX className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Not Following Back</h3>
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Users who aren&apos;t following you back
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10">
                  View List
                </Button>
                <Button variant="outline" className="h-10">
                  Bulk Unfollow
                </Button>
              </div>
            </div>
          </div>

          {/* You're Not Following Back Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-green-500">
              <UserCheck className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Your Follow Backs</h3>
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Users you&apos;re not following back
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10">
                  View List
                </Button>
                <Button variant="outline" className="h-10">
                  Bulk Follow
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-purple-500">
              <Users className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Total Followers" value="-" />
              <StatItem label="Total Following" value="-" />
              <StatItem label="Pending Follows" value="-" />
              <StatItem label="Recent Unfollows" value="-" />
            </div>
          </div>
        </div>
        <Outlet />
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
