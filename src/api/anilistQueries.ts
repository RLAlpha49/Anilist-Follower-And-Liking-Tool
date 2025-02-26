/**
 * This file contains all GraphQL queries and mutations used in the application
 * for interacting with the AniList API. Centralizing these queries makes them
 * easier to maintain and update.
 */

// ======================= USER INFORMATION QUERIES =======================

/**
 * Query to get the current authenticated user's ID
 */
export const GET_USER_ID = `
  query {
    Viewer {
      id
    }
  }
`;

/**
 * Query to get a user's following (with pagination)
 */
export const GET_FOLLOWING = `
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

/**
 * Query to get a user's followers (first page)
 */
export const GET_FOLLOWERS = `
  query ($userId: Int!) {
    Page(page: 1, perPage: 50) {
      followers(userId: $userId) {
        id
      }
    }
  }
`;

/**
 * Query to get a user's follower count
 */
export const GET_FOLLOWER_COUNT = `
  query ($userId: Int!) {
    User(id: $userId) {
      statistics {
        followerCount
      }
    }
  }
`;

/**
 * Query to get followers for a specific user (with pagination)
 * Used in fetchAllUserRelationIds function
 */
export const GET_USER_FOLLOWERS_PAGE = `
  query ($userId: Int!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        lastPage
        hasNextPage
      }
      followers(userId: $userId) {
        id
      }
    }
  }
`;

/**
 * Query to get following for a specific user (with pagination)
 * Used in fetchAllUserRelationIds function
 */
export const GET_USER_FOLLOWING_PAGE = `
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

// ======================= ACTIVITY QUERIES =======================

/**
 * Query to get global activities (for finding random users)
 */
export const GET_GLOBAL_ACTIVITIES = `
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

// ======================= FOLLOW/UNFOLLOW MUTATIONS =======================

/**
 * Mutation to toggle following a user
 */
export const TOGGLE_FOLLOW = `
  mutation ($userId: Int!) {
    ToggleFollow(userId: $userId) {
      isFollowing
    }
  }
`;

/**
 * Mutation to toggle following a user (with ID field for checking results)
 */
export const TOGGLE_FOLLOW_WITH_ID = `
  mutation ($userId: Int!) {
    ToggleFollow(userId: $userId) {
      id
      isFollowing
    }
  }
`;

// ======================= DYNAMIC QUERY BUILDERS =======================

/**
 * Builds a GraphQL query string to fetch follower/following counts for multiple users in a single request.
 *
 * @param userIds - Array of user IDs to include in the query
 * @param relation - Type of relation ("followers" or "following")
 * @param perPage - Number of results per page (defaults to 1 for count queries)
 * @returns A GraphQL query string with aliases for each user
 */
export function buildMultipleUserRelationsQuery(
  userIds: number[],
  relation: "followers" | "following",
  perPage: number = 1,
): string {
  const queryParts = userIds
    .map((userId) => {
      return `${relation}${userId}: Page(perPage: ${perPage}) {
        pageInfo {
          total
        }
        ${relation}(userId: ${userId}) {
          id
        }
      }`;
    })
    .join("\n");

  return `
    query {
      ${queryParts}
    }
  `;
}
