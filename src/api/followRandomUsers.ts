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
  const { signal, onProgress } = options || {};
  const followedUserIds: number[] = [];
  let page = 1;
  let peopleProcessed = 0;

  onProgress?.("Initializing follow process...");

  if (signal?.aborted) {
    onProgress?.("Operation aborted by user before start.");
    return followedUserIds;
  }

  onProgress?.("Getting current user ID...");
  const apiCallWithProgress = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Retrying")) {
        onProgress?.(error.message);
      }
      throw error;
    }
  };

  const currentUserId = await apiCallWithProgress(() =>
    getUserId(signal, onProgress),
  );
  onProgress?.(`Current user ID: ${currentUserId}`);

  onProgress?.("Fetching current following list...");
  const following = await apiCallWithProgress(() =>
    getFollowing(currentUserId, signal, onProgress),
  );
  onProgress?.(`Currently following ${following.length} users`);

  const unfollowedIds: Set<number> = loadUnfollowedIds();
  onProgress?.(
    `Loaded ${unfollowedIds.size} previously unfollowed users to exclude`,
  );

  try {
    while (peopleProcessed < totalPeopleToFollow) {
      if (signal?.aborted) {
        onProgress?.("Operation aborted by user.");
        break;
      }

      onProgress?.(`Processing global activity page ${page}...`);
      await delayWithSignal(1000, signal);

      const activities = await apiCallWithProgress(() =>
        getGlobalActivities(page, 50, signal, onProgress),
      );
      onProgress?.(`Fetched ${activities.length} activities from page ${page}`);

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
      if (candidateUserIds.size === 0) {
        onProgress?.("No more candidate users found. Moving to next page...");
        page++;

        // Safety check to avoid infinite loops
        if (page > 10) {
          onProgress?.("Reached maximum page limit (100). Ending process.");
          break;
        }

        continue;
      }

      const candidateUserIdsArray = Array.from(candidateUserIds);

      const followerCounts = await apiCallWithProgress(() =>
        getMultipleUserRelations(
          candidateUserIdsArray,
          signal,
          onProgress,
          "followers",
          { returnIds: false },
        ),
      );

      let peopleFollowedThisPage = 0;
      onProgress?.(
        `Evaluating ${candidateUserIdsArray.length} users against follower threshold (${followerThreshold}+)...`,
      );

      for (const userId of candidateUserIdsArray) {
        if (signal?.aborted) {
          onProgress?.(
            "Operation aborted by user during processing candidates.",
          );
          break;
        }

        const followerCount = followerCounts[userId];
        if (
          typeof followerCount === "number" &&
          followerCount >= followerThreshold
        ) {
          onProgress?.(
            `Attempting to follow user ${userId} (Follower Count: ${followerCount})...`,
          );
          const success = await apiCallWithProgress(() =>
            followUser(userId, signal, onProgress),
          );
          if (success) {
            followedUserIds.push(userId);
            following.push(userId);
            peopleProcessed++;
            peopleFollowedThisPage++;
            onProgress?.(
              `Successfully followed user ${userId} (${peopleProcessed}/${totalPeopleToFollow})`,
            );
            if (peopleProcessed >= totalPeopleToFollow) {
              onProgress?.(
                `Reached target of ${totalPeopleToFollow} users followed. Finishing process.`,
              );
              break;
            }
          } else {
            onProgress?.(
              `Failed to follow user ${userId} - API returned unsuccessful status`,
            );
          }
        } else {
          onProgress?.(
            `Skipping user ${userId} (Follower Count: ${followerCount} < Threshold: ${followerThreshold})`,
          );
        }
      }

      onProgress?.(
        `Page ${page} complete: Followed ${peopleFollowedThisPage} users`,
      );
      page++;

      // Small delay between pages
      await delayWithSignal(500, signal);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      onProgress?.("Operation aborted by user (caught exception).");
      return followedUserIds;
    }
    onProgress?.(
      `Error during follow process: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }

  onProgress?.(
    `Follow process completed. Total users followed: ${followedUserIds.length}/${totalPeopleToFollow}`,
  );
  return followedUserIds;
}
