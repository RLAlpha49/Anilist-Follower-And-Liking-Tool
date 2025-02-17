import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User, Sliders } from "lucide-react";

export default function SettingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authPin, setAuthPin] = useState("");
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthUrl, setOauthUrl] = useState("");

  useEffect(() => {
    Promise.resolve(window.electronAPI.getToken()).then(
      (storedToken: string) => {
        if (storedToken) {
          setIsLoggedIn(true);
        }
      },
    );
  }, []);

  const handleLogin = () => {
    const clientId = "24456";
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=token`;
    setOauthUrl(authUrl);
    setShowOAuthModal(true);
  };

  const handleSaveToken = () => {
    setIsLoggedIn(true);
    window.electronAPI.saveToken(authPin);
  };

  const handleClearToken = () => {
    window.electronAPI.clearToken();
    setIsLoggedIn(false);
    setAuthPin("");
  };

  return (
    <div
      className="bg-accent/40 custom-scrollbar m-4 flex flex-col overflow-x-auto rounded-lg p-4"
      style={{ height: "calc(100% - 56px)" }}
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
                  ? `Logged in to Anilist.`
                  : "You are not logged in."}
              </p>
              {isLoggedIn && (
                <Button
                  variant="outline"
                  className="mt-2 h-10"
                  onClick={handleClearToken}
                >
                  Clear Token
                </Button>
              )}
            </div>
            {!isLoggedIn && (
              <>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleLogin}
                >
                  Login to Anilist
                </Button>
                <div className="mt-4">
                  <p>Please enter the token provided:</p>
                  <input
                    type="text"
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    className="w-full rounded border p-2 md:w-64"
                    placeholder="Enter token here"
                  />
                  <Button
                    variant="outline"
                    className="mt-2 h-10"
                    onClick={handleSaveToken}
                  >
                    Save Token
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="bg-background/50 rounded-lg border p-4 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-purple-500">
              <Sliders className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {/* Additional preference inputs can be added here */}
              </div>
              <div className="flex items-center gap-2">
                {/* Additional preference inputs can be added here */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOAuthModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative h-5/6 w-11/12 rounded bg-white shadow-lg md:w-3/4 lg:w-1/2">
            <button
              className="bg-accent absolute top-2 right-2 rounded px-2 py-1"
              onClick={() => setShowOAuthModal(false)}
            >
              Exit
            </button>
            <webview src={oauthUrl} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      )}
    </div>
  );
}
