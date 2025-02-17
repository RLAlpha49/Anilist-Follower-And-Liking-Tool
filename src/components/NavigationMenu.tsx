import React from "react";
import { Link } from "@tanstack/react-router";
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import ToggleTheme from "@/components/ToggleTheme";

export default function NavigationMenu() {
  return (
    <div className="mt-2 mr-4 ml-4 flex items-center justify-between">
      <NavigationMenuBase className="text-muted-foreground px-2 font-mono">
        <div className="flex w-full items-center">
          <NavigationMenuList className="flex space-x-4">
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink
                  className={`${navigationMenuTriggerStyle()} !bg-accent/50`}
                >
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/follower-and-following">
                <NavigationMenuLink
                  data-testid="nav-followers"
                  className={`${navigationMenuTriggerStyle()} !bg-accent/50`}
                >
                  Follower And Following
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/activity">
                <NavigationMenuLink
                  data-testid="nav-activity"
                  className={`${navigationMenuTriggerStyle()} !bg-accent/50`}
                >
                  Activity
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </div>
      </NavigationMenuBase>
      <div className="ml-auto p-2">
        <ToggleTheme />
      </div>
    </div>
  );
}
