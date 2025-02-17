import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Sliders } from "lucide-react";

export default function SettingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    console.log("Login to Anilist clicked");
    setIsLoggedIn(true);
  };

  return (
    <div
      className="bg-accent/40 custom-scrollbar m-4 flex flex-col overflow-x-auto rounded-lg p-4"
      style={{ height: "93.5%" }}
    >
      <div className="flex flex-1 flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text font-mono text-4xl font-bold text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-sm uppercase">
            Manage your account and application settings
          </p>
        </div>

        <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-blue-500">
              <User className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Account Settings</h3>
            </div>
            <div className="mb-4">
              <p>
                {isLoggedIn
                  ? "You are logged in to Anilist."
                  : "You are not logged in. Connect your Anilist account to sync your profile and preferences."}
              </p>
            </div>
            {!isLoggedIn && (
              <Button variant="outline" className="h-10" onClick={handleLogin}>
                Login to Anilist
              </Button>
            )}
          </div>

          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-purple-500">
              <Sliders className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 