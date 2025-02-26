export const API_URL = "https://graphql.anilist.co";

export interface GraphQLResult<T> {
  data: T;
  errors?: { message: string; [key: string]: unknown }[];
}

export function delayWithSignal(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false;

    const timeout = setTimeout(() => {
      done = true;
      cleanup();
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      } else {
        resolve();
      }
    }, ms);

    const onAbort = () => {
      if (!done) {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

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

export async function apiRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<GraphQLResult<T>> {
  let retries = 3;
  const delayTime = 61000;
  let attempt = 1;

  while (true) {
    const token = await Promise.resolve(window.electronAPI.getToken()).then(
      (storedToken: string) => storedToken || "",
    );

    try {
      if (attempt > 1) {
        onProgress?.(`Attempt ${attempt} - Sending request...`);
      }

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

      if (response.ok) {
        const result = (await response.json()) as GraphQLResult<T>;
        if (result.errors) {
          const err: Error & { response?: Response } = new Error(
            `GraphQL errors: ${JSON.stringify(result.errors)}`,
          );
          err.response = response;
          throw err;
        }
        return result;
      } else if (response.status === 429) {
        console.warn(`Rate limited. Retrying after 61 seconds...`);
        onProgress?.(`Retrying in 1m 1s - Rate limit hit (429)`);

        await delayWithSignal(delayTime, signal);
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        retries--;
        attempt++;
        if (retries <= 0) {
          const errMsg = "Max retries reached due to rate limiting";
          onProgress?.(errMsg);
          throw new Error(errMsg);
        }
      } else {
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
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("Request aborted by user.");
        onProgress?.("Request aborted by user");
        throw error;
      }

      console.error("Fetch failed with error:", error);
      if (error instanceof Error) {
        console.log(error.message);
      }

      if (retries <= 0) {
        onProgress?.(`Max retries exceeded. Request failed.`);
        throw error;
      }

      // Expanded check for rate limiting in error messages
      const isRateLimited =
        error instanceof Error &&
        (error.message.toLowerCase().includes("429") ||
          error.message.toLowerCase().includes("rate limit") ||
          error.message.toLowerCase().includes("too many requests"));

      const errorMessage = error instanceof Error ? `: ${error.message}` : "";
      const statusInfo = isRateLimited ? " - Rate limit hit (429)" : "";

      console.warn(`Request failed. Retrying in ${delayTime} ms...`);
      onProgress?.(`Retrying in 1m 1s${statusInfo}${errorMessage}`);

      await delayWithSignal(delayTime, signal);
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      retries--;
      attempt++;
    }
  }
}

interface GetUserIdData {
  Viewer: {
    id: number;
  };
}

export async function getUserId(
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number> {
  const query = `
    query {
      Viewer {
        id
      }
    }
  `;
  const data = await apiRequest<GetUserIdData>(query, {}, signal, onProgress);
  return data.data.Viewer.id;
}

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

export async function getFollowing(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number[]> {
  let followingIds: number[] = [];
  let page = 1;
  const perPage = 50;
  let hasNextPage = true;

  while (hasNextPage) {
    const query = `
      query ($userId: Int!, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            lastPage
            hasNextPage
          }
          following(userId: $userId) {
            id
          }
        }
      }
    `;
    const data = await apiRequest<GetFollowingPageData>(
      query,
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

interface BaseActivity {
  id: number;
  userId: number;
}
type GlobalActivity = BaseActivity;

interface GetGlobalActivitiesData {
  Page: {
    activities: GlobalActivity[];
  };
}

export async function getGlobalActivities(
  page: number,
  perPage: number = 50,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<GlobalActivity[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        activities(sort: ID_DESC) {
          ... on TextActivity {
            id
            userId
          }
          ... on ListActivity {
            id
            userId
          }
        }
      }
    }
  `;
  const data = await apiRequest<GetGlobalActivitiesData>(
    query,
    { page, perPage },
    signal,
    onProgress,
  );
  return data.data.Page.activities;
}

interface GetFollowerCountData {
  User: {
    statistics: {
      followerCount: number;
    };
  };
}

export async function getFollowerCount(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<number> {
  const query = `
    query ($userId: Int!) {
      User(id: $userId) {
        statistics {
          followerCount
        }
      }
    }
  `;
  const data = await apiRequest<GetFollowerCountData>(
    query,
    { userId },
    signal,
    onProgress,
  );
  return data.data.User.statistics.followerCount;
}

interface ToggleFollowData {
  ToggleFollow: {
    isFollowing: boolean;
  };
}

export async function followUser(
  userId: number,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<boolean> {
  const mutation = `
    mutation ($userId: Int!) {
      ToggleFollow(userId: $userId) {
        isFollowing
      }
    }
  `;
  const data = await apiRequest<ToggleFollowData>(
    mutation,
    { userId },
    signal,
    onProgress,
  );
  return data.data.ToggleFollow.isFollowing;
}

interface FollowerPageData {
  pageInfo: {
    total: number;
  };
  followers: { id: number }[];
}

interface GetMultipleFollowerCountsData {
  [key: string]: FollowerPageData;
}

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

type RelationResult<T extends "followers" | "following"> = T extends "followers"
  ? GetFollowersPageData
  : GetFollowingPageData;

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

  if (onProgress) {
    onProgress(`Starting to fetch ${relationType} for user ${userId}...`);
  }

  while (true) {
    const query = `
      query ($userId: Int!, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            lastPage
            hasNextPage
          }
          ${relation}(userId: $userId) {
            id
          }
        }
      }
    `;
    let retryCount = 0;
    const maxRetries = 5;
    let data: GraphQLResult<RelationResult<T>>;

    if (!processedPages.has(page)) {
      while (true) {
        try {
          data = await apiRequest<RelationResult<T>>(
            query,
            { userId, page, perPage },
            signal,
            (message) => {
              if (onProgress) {
                if (message.includes("Retrying")) {
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

      const pageData = data.data.Page;
      let ids: number[];
      if (relation === "followers") {
        const followersPage = pageData as GetFollowersPageData["Page"];
        ids = followersPage.followers.map((item: { id: number }) => item.id);
      } else {
        const followingPage = pageData as GetFollowingPageData["Page"];
        ids = followingPage.following.map((item: { id: number }) => item.id);
      }

      // Only add unique IDs
      for (const id of ids) {
        if (!allIds.includes(id)) {
          allIds.push(id);
        }
      }

      if (onProgress) {
        onProgress(
          `User ${userId}: Fetched page ${page} with ${ids.length} ${relationType}`,
        );
      }

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
  } else {
    // Count mode: use a single alias query with perPage=1
    if (onProgress) {
      onProgress(`Fetching ${relation} counts for ${userIds.length} users...`);
    }

    const perPageValue = 1;
    const queryParts = userIds
      .map((userId) => {
        return `${relation}${userId}: Page(perPage: ${perPageValue}) {
          pageInfo {
            total
          }
          ${relation}(userId: ${userId}) {
            id
          }
        }`;
      })
      .join("\n");

    const query = `
      query {
        ${queryParts}
      }
    `;

    let data: GraphQLResult<GetMultipleFollowerCountsData>;
    try {
      data = await apiRequest<GetMultipleFollowerCountsData>(
        query,
        {},
        signal,
        onProgress,
      );
    } catch (error) {
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

    const result: Record<number, number> = {};
    userIds.forEach((userId) => {
      const pageData = data.data[`${relation}${userId}`];
      result[userId] =
        pageData && pageData.pageInfo ? pageData.pageInfo.total : 0;
    });

    if (onProgress) {
      onProgress(
        `Completed fetching ${relation} counts for ${userIds.length} users`,
      );
    }

    return result;
  }
}

interface GetFollowersData {
  Page: {
    followers: { id: number }[];
  };
}

export async function getFollowers(
  userId: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const query = `
    query ($userId: Int!) {
      Page(page: 1, perPage: 50) {
        followers(userId: $userId) {
          id
        }
      }
    }
  `;
  const data = await apiRequest<GetFollowersData>(query, { userId }, signal);
  return data.data.Page?.followers.map((f) => f.id);
}

export async function unfollowUser(
  userId: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const query = `
    mutation ($userId: Int!) {
      ToggleFollow(userId: $userId) {
        id
        isFollowing
      }
    }
  `;
  const response = await apiRequest<ToggleFollowData>(
    query,
    { userId },
    signal,
  );
  return response?.data?.ToggleFollow?.isFollowing === false;
}
