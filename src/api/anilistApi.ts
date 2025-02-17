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
  let delayTime = 1000;

  while (true) {
    const token = await Promise.resolve(window.electronAPI.getToken()).then(
      (storedToken: string) => storedToken || "",
    );

    try {
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
        const retryAfterHeader = response.headers.get("Retry-After");
        const waitTime = retryAfterHeader
          ? parseFloat(retryAfterHeader) * 1000 + 1000
          : 61000;
        console.warn(`Rate limited. Retrying after ${waitTime} ms...`);
        await delayWithSignal(waitTime, signal);
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        delayTime *= 2;
        retries--;
        if (retries <= 0) {
          throw new Error("Max retries reached due to rate limiting");
        }
      } else {
        console.error(response);
        const err: Error & { response?: Response } = new Error(
          `GraphQL query failed: ${response.statusText}`,
        );
        err.response = response;
        throw err;
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("Request aborted by user.");
        throw error;
      }

      console.error("Fetch failed with error:", error);
      if (error instanceof Error) {
        console.log(error.message);
      }
      if (retries <= 0) {
        throw error;
      }
      const currentWait =
        error instanceof Error &&
        (error.message.includes("429") ||
          error.message.includes("Failed to fetch"))
          ? 61000
          : delayTime;
      console.warn(`Request failed. Retrying in ${currentWait} ms...`);
      onProgress?.(`Request failed. Retrying in ${currentWait} ms...`);
      await delayWithSignal(currentWait, signal);
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      delayTime *= 2;
      retries--;
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

export async function getMultipleFollowerCounts(
  userIds: number[],
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<Record<number, number>> {
  if (userIds.length === 0) return {};

  // Construct GraphQL query by aliasing each request with "followers<userId>"
  const queryParts = userIds
    .map((userId) => {
      return `followers${userId}: Page(perPage: 1) {
      pageInfo {
        total
      }
      followers(userId: ${userId}) {
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
  const data = await apiRequest<GetMultipleFollowerCountsData>(
    query,
    {},
    signal,
    onProgress,
  );
  const result: Record<number, number> = {};
  userIds.forEach((userId) => {
    const followersData = data.data[`followers${userId}`];
    result[userId] =
      followersData && followersData.pageInfo
        ? followersData.pageInfo.total
        : 0;
  });
  return result;
}
