import {
  getMultipleUserRelations,
  getUserId,
  unfollowUser,
} from "./anilistApi";
import {
  loadExcludedIds,
  saveExcludedIds,
  loadUnfollowedIds,
  saveUnfollowedIds,
} from "./config";

/**
 * Analyzes the current user's followers and following lists to identify users not following back
 * @param options Optional settings including abort signal and progress callback
 * @returns An object containing notFollowingBack and excluded user IDs
 */
export async function analyzeNotFollowingBack(options?: {
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}): Promise<{ notFollowingBack: number[]; excludedIds: number[] }> {
  // Extract options with default empty object
  const { signal, onProgress } = options || {};

  // -------------------------------------------------------------------------
  // Initialization and progress reporting
  // -------------------------------------------------------------------------
  onProgress?.("🚀 Starting analysis of users not following back...");

  try {
    // -------------------------------------------------------------------------
    // Step 1: Get current user ID and relationship data
    // -------------------------------------------------------------------------

    // Get the current user's ID (required for all subsequent operations)
    const currentUserId = await getUserId(signal, (message) => {
      // Only pass through rate limit messages to keep the UI informed
      if (message.includes("Retrying")) {
        onProgress?.(message);
      }
    });
    onProgress?.(`🔍 Obtained current user ID: ${currentUserId}`);

    // -------------------------------------------------------------------------
    // Step 2: Fetch followers - people who follow the current user
    // -------------------------------------------------------------------------
    onProgress?.("🔄 Fetching followers list...");
    const followers = await getMultipleUserRelations(
      [currentUserId],
      signal,
      (message) => {
        // Only forward specific messages to the UI
        if (message.includes("Fetched")) {
          // Mark follower-related messages with a special prefix for clarity
          onProgress?.(`📥 FOLLOWERS: ${message}`);
        } else if (message.includes("Retrying")) {
          // Format rate limit messages consistently for better UI feedback
          // Create a completely new message rather than trying to modify the existing one
          onProgress?.(`⚠️ RATE LIMITED: Waiting for API rate limit (1m 1s)`);
        }
      },
      "followers", // Specifically request followers data
      { returnIds: true }, // We want IDs, not counts
    );

    // -------------------------------------------------------------------------
    // Step 3: Fetch following - people the current user follows
    // -------------------------------------------------------------------------
    onProgress?.("🔄 Fetching following list...");
    const following = await getMultipleUserRelations(
      [currentUserId],
      signal,
      (message) => {
        // Only forward specific messages to the UI
        if (message.includes("Fetched")) {
          // Mark following-related messages with a special prefix for clarity
          onProgress?.(`📤 FOLLOWING: ${message}`);
        } else if (message.includes("Retrying")) {
          // Format rate limit messages consistently for better UI feedback
          // Create a completely new message rather than trying to modify the existing one
          onProgress?.(`⚠️ RATE LIMITED: Waiting for API rate limit (1m 1s)`);
        }
      },
      "following", // Specifically request following data
      { returnIds: true }, // We want IDs, not counts
    );

    // -------------------------------------------------------------------------
    // Step 4: Process the data and generate results
    // -------------------------------------------------------------------------

    // Load users that have been manually excluded from analysis
    const excluded = Array.from(loadExcludedIds());

    // Extract data from API responses (handles different possible response formats)
    const followingData = following[currentUserId];
    const followerData = followers[currentUserId];

    // Convert to arrays, handling different possible response formats
    // The API might return a single number or an array depending on the context
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

    // Log the counts for user feedback
    onProgress?.(
      `📊 Data collected: ${followingIds.length} following and ${followerIds.length} followers`,
    );

    // Core analysis: find users that we follow but who don't follow us back
    // Also filter out any users that have been manually excluded
    const notFollowing = followingIds.filter(
      (id) => !followerIds.includes(id) && !excluded.includes(id),
    );

    // -------------------------------------------------------------------------
    // Step 5: Generate report and return results
    // -------------------------------------------------------------------------

    // Add information about excluded users if any exist
    if (excluded.length > 0) {
      onProgress?.(`ℹ️ ${excluded.length} users are excluded from analysis`);
    }

    // Report the results with appropriate messaging
    if (notFollowing.length > 0) {
      onProgress?.(
        `🚨 Found ${notFollowing.length} users not following you back`,
      );
    } else {
      onProgress?.(
        `✅ Great news! All users you follow are following you back`,
      );
    }

    onProgress?.(`🏁 Analysis complete. Ready for action.`);

    // Return both the users not following back and the excluded users list
    // for potential UI operations on both lists
    return {
      notFollowingBack: notFollowing,
      excludedIds: excluded,
    };
  } catch (error) {
    // Format error messages consistently for the UI, but filter out abort errors
    // Only report non-abort errors to the progress feed
    if (
      !(
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("signal is aborted"))
      )
    ) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
      onProgress?.(`❌ ERROR: ${errorMessage}`);
    }
    throw error; // Re-throw for the caller to handle
  }
}

/**
 * Excludes a user from the not-following-back analysis
 * This is used when a user wants to continue following someone even though they don't follow back
 *
 * @param userId The user ID to exclude
 * @param currentExcludedIds The current list of excluded user IDs
 * @param onProgress Optional callback for progress updates
 * @returns The updated list of excluded user IDs
 */
export function excludeUser(
  userId: number,
  currentExcludedIds: number[],
  onProgress?: (message: string) => void,
): number[] {
  // Create a new array with the user added to the excluded list
  const newExcluded = [...currentExcludedIds, userId];

  // Persist the updated excluded list to storage
  saveExcludedIds(new Set(newExcluded));

  // Notify UI of the change
  onProgress?.(`⏭️ Excluded user #${userId} from analysis`);

  // Return the updated list for immediate UI updates
  return newExcluded;
}

/**
 * Unfollows multiple users who are not following back
 * This is the main "bulk unfollow" functionality that allows users to quickly unfollow
 * users who aren't following them back
 *
 * @param userIds Array of user IDs to unfollow
 * @param options Optional settings including abort signal and progress callback
 * @returns Object containing successful and failed unfollow counts
 */
export async function bulkUnfollowUsers(
  userIds: number[],
  options?: { signal?: AbortSignal; onProgress?: (message: string) => void },
): Promise<{ unfollowed: number[]; successCount: number; failCount: number }> {
  // Extract options with default empty object
  const { signal, onProgress } = options || {};

  // Track results
  const unfollowed: number[] = []; // Array of successfully unfollowed user IDs
  let successCount = 0; // Counter for successful unfollows
  let failCount = 0; // Counter for failed unfollows

  // -------------------------------------------------------------------------
  // Initialize the bulk unfollow process
  // -------------------------------------------------------------------------
  onProgress?.(
    `🔄 Starting bulk unfollow process for ${userIds.length} users...`,
  );

  // -------------------------------------------------------------------------
  // Process each user ID sequentially
  // -------------------------------------------------------------------------
  for (const userId of userIds) {
    // Check if the operation has been aborted by user
    if (signal?.aborted) {
      onProgress?.("🛑 Operation aborted by user.");
      break;
    }

    try {
      // Attempt to unfollow this user via the API
      const success = await unfollowUser(userId);

      if (success) {
        // Track successful unfollows
        unfollowed.push(userId);
        successCount++;
        onProgress?.(
          `✅ Unfollowed user #${userId} (${successCount}/${userIds.length})`,
        );
      } else {
        // Track API failures (when the API returns false)
        failCount++;
        onProgress?.(
          `❌ Failed to unfollow user #${userId} - API returned unsuccessful status`,
        );
      }
    } catch (error) {
      // Track exceptions during the unfollow process
      failCount++;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      onProgress?.(`❌ Error unfollowing user #${userId}: ${errorMessage}`);
    }
  }

  // -------------------------------------------------------------------------
  // Finalize process and update persistent storage
  // -------------------------------------------------------------------------

  // Save the unfollowed users to persistent storage to avoid suggesting them again
  // in future operations (like the random follow feature)
  saveUnfollowedIds(new Set([...loadUnfollowedIds(), ...unfollowed]));

  // Report completion with success/failure statistics
  onProgress?.(
    `🏁 Bulk unfollow complete: ${successCount} unfollowed, ${failCount} failed`,
  );

  // Return comprehensive results for potential UI updates
  return {
    unfollowed, // List of successfully unfollowed users
    successCount, // Number of successful unfollows
    failCount, // Number of failed unfollows
  };
}
