import {
  getUserId,
  getFollowing,
  getGlobalActivities,
  getMultipleUserRelations,
  followUser,
  delayWithSignal,
} from "./anilistApi";
import { loadUnfollowedIds } from "./config";

/**
 * Follows random users based on global activity.
 *
 * @param totalPeopleToFollow - The total number of people to follow.
 * @param followerThreshold - The minimum follower count a candidate must have.
 * @param options - Optional options containing an AbortSignal and an onProgress callback.
 * @returns An array of user IDs that were followed.
 */
export async function followRandomUsers(
  totalPeopleToFollow: number,
  followerThreshold: number,
  options?: { signal?: AbortSignal; onProgress?: (message: string) => void },
): Promise<number[]> {
  // Extract options with default empty object
  const { signal, onProgress } = options || {};

  // Track results and state
  const followedUserIds: number[] = []; // Array to store successfully followed user IDs
  let page = 1; // Current page of global activity being processed
  let peopleProcessed = 0; // Counter for number of people successfully followed so far
  const MAX_PAGES = 10; // Maximum number of pages to search to prevent infinite loops

  // -------------------------------------------------------------------------
  // Initialization and preparation
  // -------------------------------------------------------------------------
  onProgress?.("Initializing follow process...");

  // Check if operation was aborted before it even started
  if (signal?.aborted) {
    onProgress?.("Operation aborted by user before start.");
    return followedUserIds;
  }

  // Helper function to handle API calls with progress reporting
  // Catches and reports rate limit errors before re-throwing them
  const apiCallWithProgress = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Retrying")) {
        // Pass through rate limit messages to the UI
        onProgress?.(error.message);
      }
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  // -------------------------------------------------------------------------
  // Step 1: Get current user information
  // -------------------------------------------------------------------------
  onProgress?.("Getting current user ID...");
  // Get the current user's ID (needed for following operations)
  const currentUserId = await apiCallWithProgress(() =>
    getUserId(signal, onProgress),
  );
  onProgress?.(`Current user ID: ${currentUserId}`);

  // Get the list of users the current user is already following
  onProgress?.("Fetching current following list...");
  const following = await apiCallWithProgress(() =>
    getFollowing(currentUserId, signal, onProgress),
  );
  onProgress?.(`Currently following ${following.length} users`);

  // Load list of previously unfollowed users to avoid following them again
  const unfollowedIds: Set<number> = loadUnfollowedIds();
  onProgress?.(
    `Loaded ${unfollowedIds.size} previously unfollowed users to exclude`,
  );

  // -------------------------------------------------------------------------
  // Step 2: Main processing loop - follow random users until target is reached
  // -------------------------------------------------------------------------
  try {
    // Continue until we've followed the requested number of users
    while (peopleProcessed < totalPeopleToFollow) {
      // Check if the operation has been aborted by user
      if (signal?.aborted) {
        onProgress?.("Operation aborted by user.");
        break;
      }

      // Safety check to avoid infinite loops if we can't find enough users
      if (page > MAX_PAGES) {
        onProgress?.(
          `Reached maximum page limit (${MAX_PAGES}). Ending process.`,
        );
        break; // Exit the loop entirely
      }

      // -------------------------------------------------------------------------
      // Step 2.1: Fetch and analyze global activity for candidate users
      // -------------------------------------------------------------------------
      onProgress?.(`Processing global activity page ${page}...`);
      // Small delay to avoid hitting rate limits
      await delayWithSignal(1000, signal);

      // Get a page of global activity from the API
      const activities = await apiCallWithProgress(() =>
        getGlobalActivities(page, 50, signal, onProgress),
      );
      onProgress?.(`Fetched ${activities.length} activities from page ${page}`);

      // Build a set of candidate user IDs from the activities
      // Filters out users we're already following and users we've previously unfollowed
      const candidateUserIds = new Set<number>();
      for (const activity of activities) {
        if (activity.userId) {
          const userId = activity.userId;
          if (!following.includes(userId) && !unfollowedIds.has(userId)) {
            candidateUserIds.add(userId);
          }
        }
      }

      onProgress?.(
        `Found ${candidateUserIds.size} potential users to follow on page ${page}`,
      );

      // If no candidates were found on this page, move to the next page
      if (candidateUserIds.size === 0) {
        onProgress?.("No more candidate users found. Moving to next page...");
        page++;
        continue; // Skip to the next iteration of the loop
      }

      // Convert the Set to an Array for the API call
      const candidateUserIdsArray = Array.from(candidateUserIds);

      // -------------------------------------------------------------------------
      // Step 2.2: Get follower counts for all candidates and filter by threshold
      // -------------------------------------------------------------------------
      // Get follower counts for all candidate users in a single batch API call
      const followerCounts = await apiCallWithProgress(() =>
        getMultipleUserRelations(
          candidateUserIdsArray,
          signal,
          onProgress,
          "followers",
          { returnIds: false }, // Return counts rather than IDs
        ),
      );

      // Track how many users we've followed on this page
      let peopleFollowedThisPage = 0;
      onProgress?.(
        `Evaluating ${candidateUserIdsArray.length} users against follower threshold (${followerThreshold}+)...`,
      );

      // -------------------------------------------------------------------------
      // Step 2.3: Process each candidate and follow if they meet the criteria
      // -------------------------------------------------------------------------
      for (const userId of candidateUserIdsArray) {
        // Check if the operation has been aborted during candidate processing
        if (signal?.aborted) {
          onProgress?.(
            "Operation aborted by user during processing candidates.",
          );
          break;
        }

        // Get the follower count for this user
        const followerCount = followerCounts[userId];

        // Only follow users with sufficient followers (above the threshold)
        if (
          typeof followerCount === "number" &&
          followerCount >= followerThreshold
        ) {
          onProgress?.(
            `Attempting to follow user ${userId} (Follower Count: ${followerCount})...`,
          );

          // Call the API to follow this user
          const success = await apiCallWithProgress(() =>
            followUser(userId, signal, onProgress),
          );

          if (success) {
            // Track successful follows
            followedUserIds.push(userId);
            following.push(userId); // Add to our following list to avoid duplicates
            peopleProcessed++;
            peopleFollowedThisPage++;

            onProgress?.(
              `Successfully followed user ${userId} (${peopleProcessed}/${totalPeopleToFollow})`,
            );

            // If we've reached our target, exit the loop
            if (peopleProcessed >= totalPeopleToFollow) {
              onProgress?.(
                `Reached target of ${totalPeopleToFollow} users followed. Finishing process.`,
              );
              break;
            }
          } else {
            // Log unsuccessful follow attempts
            onProgress?.(
              `Failed to follow user ${userId} - API returned unsuccessful status`,
            );
          }
        } else {
          // Skip users that don't meet the follower threshold
          onProgress?.(
            `Skipping user ${userId} (Follower Count: ${followerCount} < Threshold: ${followerThreshold})`,
          );
        }
      }

      // Log summary for this page before moving to the next
      onProgress?.(
        `Page ${page} complete: Followed ${peopleFollowedThisPage} users`,
      );
      page++;

      // Small delay between pages to avoid rate limits
      await delayWithSignal(500, signal);
    }
  } catch (error: unknown) {
    // -------------------------------------------------------------------------
    // Error handling
    // -------------------------------------------------------------------------

    // If the error is an AbortError, it means the operation was cancelled by the user
    if (error instanceof Error && error.name === "AbortError") {
      onProgress?.("Operation aborted by user (caught exception).");
      return followedUserIds; // Return partial results
    }

    // Log other errors before re-throwing
    onProgress?.(
      `Error during follow process: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error; // Re-throw the error to be handled by the caller
  }

  // -------------------------------------------------------------------------
  // Completion
  // -------------------------------------------------------------------------
  onProgress?.(
    `Follow process completed. Total users followed: ${followedUserIds.length}/${totalPeopleToFollow}`,
  );
  return followedUserIds;
}
