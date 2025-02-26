/**
 * AniList API Integration Module
 *
 * This module provides a comprehensive set of functions for interacting with the AniList GraphQL API.
 * It handles authentication, API requests, rate limiting, error handling, and data processing.
 *
 * Key features:
 * - Smart retrying with rate limit awareness
 * - Support for abort signals to cancel in-flight requests
 * - Progress reporting for long-running operations
 * - Type-safe GraphQL responses
 */

export const API_URL = "https://graphql.anilist.co";

import {
  GET_USER_ID,
  GET_FOLLOWING,
  GET_FOLLOWERS,
  GET_FOLLOWER_COUNT,
  GET_GLOBAL_ACTIVITIES,
  GET_USER_FOLLOWERS_PAGE,
  GET_USER_FOLLOWING_PAGE,
  TOGGLE_FOLLOW,
  TOGGLE_FOLLOW_WITH_ID,
  buildMultipleUserRelationsQuery,
} from "./anilistQueries";

// -------------------------------------------------------------------------
// Types and Interfaces
// -------------------------------------------------------------------------

/**
 * Standard GraphQL response format with data and optional errors
 */
export interface GraphQLResult<T> {
  data: T;
  errors?: { message: string; [key: string]: unknown }[];
}

// -------------------------------------------------------------------------
// Utility Functions
// -------------------------------------------------------------------------

/**
 * Creates a Promise that resolves after a delay, but can be cancelled via AbortSignal
 * This is primarily used for rate limiting controls and retries
 *
 * @param ms - Time to delay in milliseconds
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns Promise that resolves after delay or rejects if aborted
 */
export function delayWithSignal(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false;

    // Create the timeout that will resolve the promise after the delay
    const timeout = setTimeout(() => {
      done = true;
      cleanup();
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      } else {
        resolve();
      }
    }, ms);

    // Handler for abort events on the signal
    const onAbort = () => {
      if (!done) {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      }
    };

    // Helper to clean up listeners and timeouts
    const cleanup = () => {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    // Initial check if already aborted
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      } else {
        signal.addEventListener("abort", onAbort);
      }
    }
  });
}

// -------------------------------------------------------------------------
// Core API Request Function
// -------------------------------------------------------------------------

/**
 * Core function to send GraphQL requests to the AniList API
 *
 * Features:
 * - Automatic authentication token handling
 * - Smart retry mechanism for rate limits (429 errors)
 * - Support for progress reporting via callback
 * - AbortSignal support for cancellation
 *
 * @param query - GraphQL query or mutation string
 * @param variables - Variables to pass to the GraphQL operation
 * @param signal - AbortSignal for cancelling the request
 * @param onProgress - Callback for reporting progress/status messages
 * @returns Promise resolving to typed GraphQL response
 */
export async function apiRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<GraphQLResult<T>> {
  let retries = 3;
  const delayTime = 61000; // AniList rate limit window (just over 1 minute)
  let attempt = 1;

  while (true) {
    // Retrieve authentication token from Electron main process
    const token = await Promise.resolve(window.electronAPI.getToken()).then(
      (storedToken: string) => storedToken || "",
    );

    try {
      // Log additional attempts beyond the first
      if (attempt > 1) {
        onProgress?.(`Attempt ${attempt} - Sending request...`);
      }

      // Send the actual API request
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        },
        signal,
        body: JSON.stringify({ query, variables }),
      });

      // Handle successful API response
      if (response.ok) {
        const result = (await response.json()) as GraphQLResult<T>;

        // GraphQL can return 200 OK but still contain errors
        if (result.errors) {
          const err: Error & { response?: Response } = new Error(
            `GraphQL errors: ${JSON.stringify(result.errors)}`,
          );
          err.response = response;
          throw err;
        }
        return result;
      }
      // Handle rate limiting (HTTP 429)
      else if (response.status === 429) {
        console.warn(`Rate limited. Retrying after 61 seconds...`);
        onProgress?.(`Retrying in 1m 1s - Rate limit hit (429)`);

        // Wait for the rate limit window to expire
        await delayWithSignal(delayTime, signal);

        // If aborted during the delay, throw an abort error
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        // Decrement retries and increment attempt
        retries--;
        attempt++;

        // Stop if we've exhausted all retries
        if (retries <= 0) {
          const errMsg = "Max retries reached due to rate limiting";
          onProgress?.(errMsg);
          throw new Error(errMsg);
        }
      }
      // Handle other HTTP errors
      else {
        console.error(response);
        const errMsg = `Request failed with status ${response.status}: ${response.statusText}`;
        onProgress?.(errMsg);
        const err: Error & { response?: Response } = new Error(
          `GraphQL query failed: ${response.statusText}`,
        );
        err.response = response;
        throw err;
      }
    } catch (error: unknown) {
      // Special handling for user-initiated aborts
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("Request aborted by user.");
        onProgress?.("Request aborted by user");
        throw error;
      }

      // Log the error for debugging
      console.error("Fetch failed with error:", error);
      if (error instanceof Error) {
        console.log(error.message);
      }

      // Stop if we've exhausted all retries
      if (retries <= 0) {
        onProgress?.(`Max retries exceeded. Request failed.`);
        throw error;
      }

      // Check if the error is related to rate limiting
      const isRateLimited =
        error instanceof Error &&
        (error.message.toLowerCase().includes("429") ||
          error.message.toLowerCase().includes("rate limit") ||
          error.message.toLowerCase().includes("too many requests"));

      // Format a user-friendly error message
      const errorMessage = error instanceof Error ? `: ${error.message}` : "";
      const statusInfo = isRateLimited ? " - Rate limit hit (429)" : "";

      // Log retry attempt and wait
      console.warn(`Request failed. Retrying in ${delayTime} ms...`);
      onProgress?.(`Retrying in 1m 1s${statusInfo}${errorMessage}`);

      // Wait before retrying
      await delayWithSignal(delayTime, signal);

      // If aborted during the delay, throw an abort error
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      // Decrement retries and increment attempt
      retries--;
      attempt++;
    }
  }
}

// -------------------------------------------------------------------------
// User Information API Functions
// -------------------------------------------------------------------------

/**
 * Data interface for the user ID query response
 */
interface GetUserIdData {
  Viewer: {
    id: number;
  };
}

/**
 * Gets the currently authenticated user's ID from the AniList API
 * This is typically the first step in many operations as it identifies the current user
 *
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the user's numeric ID
 */
export async function getUserId(
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number> {
  const data = await apiRequest<GetUserIdData>(
    GET_USER_ID,
    {},
    signal,
    onProgress,
  );
  return data.data.Viewer.id;
}

/**
 * Data interface for the following page query response
 */
interface GetFollowingPageData {
  Page: {
    pageInfo: {
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
    };
    following: {
      id: number;
    }[];
  };
}

/**
 * Gets all users that a specified user is following
 * Handles pagination automatically by fetching all pages
 *
 * @param userId - ID of the user whose following list to fetch
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to an array of user IDs being followed
 */
export async function getFollowing(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number[]> {
  let followingIds: number[] = [];
  let page = 1;
  const perPage = 50;
  let hasNextPage = true;

  // Fetch pages until there are no more
  while (hasNextPage) {
    const data = await apiRequest<GetFollowingPageData>(
      GET_FOLLOWING,
      { userId, page, perPage },
      signal,
      onProgress,
    );
    const pageFollowing = data.data.Page.following.map((item) => item.id);
    followingIds = followingIds.concat(pageFollowing);
    hasNextPage = data.data.Page.pageInfo.hasNextPage;
    page++;
  }
  return followingIds;
}

// -------------------------------------------------------------------------
// Activity Feed API Functions
// -------------------------------------------------------------------------

/**
 * Base interface for activity types
 */
interface BaseActivity {
  id: number;
  userId: number;
}

/**
 * Type alias for global activity feed items
 */
type GlobalActivity = BaseActivity;

/**
 * Data interface for the global activities query response
 */
interface GetGlobalActivitiesData {
  Page: {
    activities: GlobalActivity[];
  };
}

/**
 * Gets activities from the global AniList feed
 * Used to find random active users for the random follow feature
 *
 * @param page - Page number to fetch
 * @param perPage - Number of activities per page (default: 50)
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to an array of activity objects
 */
export async function getGlobalActivities(
  page: number,
  perPage: number = 50,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<GlobalActivity[]> {
  const data = await apiRequest<GetGlobalActivitiesData>(
    GET_GLOBAL_ACTIVITIES,
    { page, perPage },
    signal,
    onProgress,
  );
  return data.data.Page.activities;
}

// -------------------------------------------------------------------------
// Follower Data API Functions
// -------------------------------------------------------------------------

/**
 * Data interface for the follower count query response
 */
interface GetFollowerCountData {
  User: {
    statistics: {
      followerCount: number;
    };
  };
}

/**
 * Gets the number of followers for a specified user
 *
 * @param userId - ID of the user whose follower count to fetch
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the follower count
 */
export async function getFollowerCount(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number> {
  const data = await apiRequest<GetFollowerCountData>(
    GET_FOLLOWER_COUNT,
    { userId },
    signal,
    onProgress,
  );
  return data.data.User.statistics.followerCount;
}

// -------------------------------------------------------------------------
// Follow/Unfollow API Functions
// -------------------------------------------------------------------------

/**
 * Data interface for the toggle follow mutation response
 */
interface ToggleFollowData {
  ToggleFollow: {
    isFollowing: boolean;
  };
}

/**
 * Follows a user on AniList
 * Uses the toggle follow mutation which acts as both follow and unfollow
 *
 * @param userId - ID of the user to follow
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to a boolean indicating if now following
 */
export async function followUser(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<boolean> {
  const data = await apiRequest<ToggleFollowData>(
    TOGGLE_FOLLOW,
    { userId },
    signal,
    onProgress,
  );
  return data.data.ToggleFollow.isFollowing;
}

// -------------------------------------------------------------------------
// Multiple Users Relation Functions
// -------------------------------------------------------------------------

/**
 * Interface for paginated follower data
 */
interface FollowerPageData {
  pageInfo: {
    total: number;
  };
  followers: { id: number }[];
}

/**
 * Data interface for the multiple follower counts query response
 */
interface GetMultipleFollowerCountsData {
  [key: string]: FollowerPageData;
}

/**
 * Data interface for the followers page query response
 */
interface GetFollowersPageData {
  Page: {
    pageInfo: {
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
    };
    followers: { id: number }[];
  };
}

/**
 * Data interface for the following page query response
 */
interface GetFollowingPageData {
  Page: {
    pageInfo: {
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
    };
    following: { id: number }[];
  };
}

/**
 * Type to handle the different relation result shapes based on relation type
 */
type RelationResult<T extends "followers" | "following"> = T extends "followers"
  ? GetFollowersPageData
  : GetFollowingPageData;

/**
 * Helper function to fetch all relation IDs for a user across all pages
 * Handles pagination and retries automatically
 *
 * @param userId - ID of the user whose relations to fetch
 * @param relation - Type of relation ("followers" or "following")
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @param perPage - Number of relations per page (default: 50)
 * @returns Promise resolving to an array of user IDs
 */
async function fetchAllUserRelationIds<T extends "followers" | "following">(
  userId: number,
  relation: T,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
  perPage: number = 50,
): Promise<number[]> {
  let page = 1;
  const allIds: number[] = [];
  const relationType = relation === "followers" ? "followers" : "following";
  const processedPages = new Set<number>();

  // Report startup
  if (onProgress) {
    onProgress(`Starting to fetch ${relationType} for user ${userId}...`);
  }

  // Loop until we've fetched all pages
  while (true) {
    // Select the appropriate query based on relation type
    const query =
      relation === "followers"
        ? GET_USER_FOLLOWERS_PAGE
        : GET_USER_FOLLOWING_PAGE;
    let retryCount = 0;
    const maxRetries = 5;
    let data: GraphQLResult<RelationResult<T>>;

    // Skip pages we've already processed (avoids duplicates on retries)
    if (!processedPages.has(page)) {
      // Retry loop for individual pages
      while (true) {
        try {
          data = await apiRequest<RelationResult<T>>(
            query,
            { userId, page, perPage },
            signal,
            (message) => {
              if (onProgress) {
                if (message.includes("Retrying")) {
                  // Standardize retry messages for consistency
                  const standardizedMessage = message.replace(
                    /Retrying in [\d.]+[ms]+/i,
                    "Retrying in 1m 1s",
                  );
                  onProgress(
                    `${relationType.toUpperCase()}: ${standardizedMessage}`,
                  );
                }
              }
            },
          );

          // Mark this page as processed to avoid duplicates
          processedPages.add(page);
          break;
        } catch (err) {
          // Handle retry logic with backoff
          retryCount++;
          if (retryCount >= maxRetries) {
            if (onProgress) {
              onProgress(
                `Failed to fetch ${relationType} after ${maxRetries} retries`,
              );
            }
            throw err;
          }
          if (onProgress) {
            onProgress(
              `Retry ${retryCount}/${maxRetries} for ${relationType} - waiting 1m 1s...`,
            );
          }
          await delayWithSignal(61000, signal);
        }
      }

      // Extract the page data and IDs based on relation type
      const pageData = data.data.Page;
      let ids: number[];
      if (relation === "followers") {
        const followersPage = pageData as GetFollowersPageData["Page"];
        ids = followersPage.followers.map((item: { id: number }) => item.id);
      } else {
        const followingPage = pageData as GetFollowingPageData["Page"];
        ids = followingPage.following.map((item: { id: number }) => item.id);
      }

      // Only add unique IDs to avoid duplicates
      for (const id of ids) {
        if (!allIds.includes(id)) {
          allIds.push(id);
        }
      }

      // Report progress
      if (onProgress) {
        onProgress(
          `User ${userId}: Fetched page ${page} with ${ids.length} ${relationType}`,
        );
      }

      // Exit loop if we've reached the last page
      if (!pageData.pageInfo.hasNextPage) {
        if (onProgress) {
          onProgress(
            `Completed fetching all ${allIds.length} ${relationType} for user ${userId}`,
          );
        }
        break;
      }
      page++;
    }
  }
  return allIds;
}

/**
 * Gets relations (followers or following) for multiple users efficiently
 * Can return either full ID lists or just count information
 *
 * @param userIds - Array of user IDs to fetch relations for
 * @param signal - Optional AbortSignal to cancel the request
 * @param onProgress - Optional callback for progress updates
 * @param relation - Type of relation to fetch ("followers" or "following")
 * @param options - Optional settings (returnIds, perPage)
 * @returns Promise resolving to a record mapping user IDs to relation data
 */
export async function getMultipleUserRelations(
  userIds: number[],
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
  relation: "followers" | "following" = "followers",
  options?: { returnIds?: boolean; perPage?: number },
): Promise<Record<number, number> | Record<number, number[]>> {
  if (userIds.length === 0) return {};

  // Track which user relations we've already requested to prevent duplicates
  const processedRelations = new Set<string>();

  // ID mode: fetch all IDs for detailed analysis
  if (options?.returnIds) {
    // Fetch all pages per userID using the helper function
    const result: Record<number, number[]> = {};

    for (const userId of userIds) {
      const relationKey = `${relation}-${userId}`;

      // Skip if we've already processed this relation
      if (processedRelations.has(relationKey)) {
        if (onProgress) {
          onProgress(
            `Skipping duplicate request for ${relation} of user ${userId}`,
          );
        }
        continue;
      }

      processedRelations.add(relationKey);

      try {
        // Fetch all relation IDs across all pages
        result[userId] = await fetchAllUserRelationIds(
          userId,
          relation,
          signal,
          onProgress,
          options.perPage ?? 50,
        );
      } catch (error) {
        // If there's an error, log it but continue with other users
        if (onProgress) {
          onProgress(
            `Error fetching ${relation} for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
        result[userId] = [];
      }
    }
    return result;
  }
  // Count mode: only get the total counts, not the individual IDs
  else {
    // Report startup
    if (onProgress) {
      onProgress(`Fetching ${relation} counts for ${userIds.length} users...`);
    }

    // Use a single efficiency-optimized query with aliases
    const perPageValue = 1;
    const query = buildMultipleUserRelationsQuery(
      userIds,
      relation,
      perPageValue,
    );

    let data: GraphQLResult<GetMultipleFollowerCountsData>;
    try {
      // Execute the combined query
      data = await apiRequest<GetMultipleFollowerCountsData>(
        query,
        {},
        signal,
        onProgress,
      );
    } catch (error) {
      // Handle errors gracefully
      if (onProgress) {
        onProgress(
          `Error fetching ${relation} counts: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      // Return empty counts on error
      const result: Record<number, number> = {};
      userIds.forEach((id) => {
        result[id] = 0;
      });
      return result;
    }

    // Extract count data for each user
    const result: Record<number, number> = {};
    userIds.forEach((userId) => {
      const pageData = data.data[`${relation}${userId}`];
      result[userId] =
        pageData && pageData.pageInfo ? pageData.pageInfo.total : 0;
    });

    // Report completion
    if (onProgress) {
      onProgress(
        `Completed fetching ${relation} counts for ${userIds.length} users`,
      );
    }

    return result;
  }
}

/**
 * Data interface for the followers query response
 */
interface GetFollowersData {
  Page: {
    followers: { id: number }[];
  };
}

/**
 * Gets the followers for a specified user (simplified version, first page only)
 *
 * @param userId - ID of the user whose followers to fetch
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to an array of follower user IDs
 */
export async function getFollowers(
  userId: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const data = await apiRequest<GetFollowersData>(
    GET_FOLLOWERS,
    { userId },
    signal,
  );
  return data.data.Page?.followers.map((f) => f.id);
}

/**
 * Unfollows a user on AniList
 * Uses a specialized toggle follow mutation that returns additional fields
 *
 * @param userId - ID of the user to unfollow
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to boolean indicating success (true = unfollowed)
 */
export async function unfollowUser(
  userId: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await apiRequest<ToggleFollowData>(
    TOGGLE_FOLLOW_WITH_ID,
    { userId },
    signal,
  );
  return response?.data?.ToggleFollow?.isFollowing === false;
}
