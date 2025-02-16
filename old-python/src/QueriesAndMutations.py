"""
This module contains two classes, Queries and Mutations, that construct and
return various GraphQL queries and mutations.

The Queries class contains static methods that construct and return various
GraphQL queries. Each method corresponds to a specific type of query, such as
checking authentication, creating a page query, creating variables for a query,
and more.

The Mutations class contains static methods that construct and return various
GraphQL mutations. Each method corresponds to a specific type of mutation,
such as following a user or liking an activity.
"""

# pylint: disable=C0103


class Queries:
    """
    This class contains static methods that construct and return various GraphQL queries.
    Each method corresponds to a specific type of query, such as checking authentication,
    creating a page query, creating variables for a query, and more.
    """

    def __init__(self):
        pass

    @staticmethod
    def Check_Authentication():
        """
        Constructs and returns a GraphQL query to check the authentication of the viewer.

        Returns:
            str: A GraphQL query that requests the ID and name of the viewer.
        """
        Query = """
        query {
            Viewer {
                id
                name
            }
        }
        """
        return Query

    @staticmethod
    def create_page_query(query_name):
        """
        Constructs and returns a GraphQL query for a specific page.

        Args:
            query_name (str): The name of the query to be executed.

        Returns:
            str: A GraphQL query that requests the page information and the specified query.
        """
        return f"""
        query ($userId: Int!, $page: Int, $perPage: Int) {{
            Page (page: $page, perPage: $perPage) {{
                pageInfo {{
                    total
                    currentPage
                    lastPage
                    hasNextPage
                    perPage
                }}
                {query_name}(userId: $userId) {{
                    id
                }}
            }}
        }}
        """

    @staticmethod
    def create_variables(user_id, page):
        """
        Creates and returns a dictionary of variables for a GraphQL query.

        Args:
            user_id (int): The ID of the user.
            page (int): The page number.

        Returns:
            dict: A dictionary of variables for a GraphQL query.
        """
        return {"userId": user_id, "page": page, "perPage": 50}

    @staticmethod
    def Follower_Query(user_id, page):
        """
        Constructs and returns a GraphQL query for the followers of a user and
        the variables for the query.

        Args:
            user_id (int): The ID of the user.
            page (int): The page number.

        Returns:
            tuple: A tuple containing a GraphQL query for the followers of a user
            and the variables for the query.
        """
        return Queries.create_page_query("followers"), Queries.create_variables(
            user_id, page
        )

    @staticmethod
    def Get_Multiple_Follower_Counts_Query(user_ids):
        """
        Constructs and returns a GraphQL query to get the follower count of multiple users.

        Args:
            user_ids (list): The IDs of the users.

        Returns:
            str: A GraphQL query that requests the follower count of the users.
        """
        user_queries = "\n".join(
            (
                f"followers{user_id}: Page(perPage: 1) {{"
                f" pageInfo {{ total }}"
                f" followers(userId: {user_id}) {{ id }}"
                f" }}"
            )
            for user_id in user_ids
        )
        Query = f"""
        query {{
            {user_queries}
        }}
        """
        return Query

    @staticmethod
    def Following_Query(user_id, page):
        """
        Constructs and returns a GraphQL query for the users followed by a user and
        the variables for the query.

        Args:
            user_id (int): The ID of the user.
            page (int): The page number.

        Returns:
            tuple: A tuple containing a GraphQL query for the users followed by a user
            and the variables for the query.
        """
        return Queries.create_page_query("following"), Queries.create_variables(
            user_id, page
        )

    @staticmethod
    def Global_Activity_Feed_Query(page):
        """
        Constructs and returns a GraphQL query for the global activity feed and
        the variables for the query.

        Args:
            page (int): The page number.

        Returns:
            tuple: A tuple containing a GraphQL query for the global activity feed
            and the variables for the query.
        """
        Query = """
        query ($page: Int, $perPage: Int) {
            Page (page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    currentPage
                    lastPage
                    hasNextPage
                    perPage
                }
                activities(sort: ID_DESC) {
                    ... on TextActivity {
                        id
                        user {
                            id
                        }
                    }
                    ... on ListActivity {
                        id
                        user {
                            id
                        }
                    }
                    ... on MessageActivity {
                        id
                        messengerId
                    }
                }
            }
        }
        """
        Variables = {"page": page, "perPage": 50}
        return Query, Variables

    @staticmethod
    def Following_Activity_Feed_Query(page):
        """
        Constructs and returns a GraphQL query for the activity feed of the users
        followed by the viewer and the variables for the query.

        Args:
            page (int): The page number.

        Returns:
            tuple: A tuple containing a GraphQL query for the activity feed of the users
            followed by the viewer and the variables for the query.
        """
        Query = """
        query ($page: Int, $perPage: Int, $isFollowing: Boolean) {
            Page (page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    currentPage
                    lastPage
                    hasNextPage
                    perPage
                }
                activities(sort: ID_DESC, type_in:[TEXT,ANIME_LIST,MANGA_LIST], isFollowing: $isFollowing) {
                    ... on TextActivity {
                        id
                        isLiked
                        user {
                            id
                            isFollower
                        }
                    }
                    ... on ListActivity {
                        id
                        isLiked
                        user {
                            id
                            isFollower
                        }
                    }
                }
            }
        }
        """
        Variables = {"page": page, "perPage": 50, "isFollowing": True}
        return Query, Variables

    @staticmethod
    def Get_User_ID_Query(username):
        """
        Constructs and returns a GraphQL query to get the ID of a user and
        the variables for the query.

        Args:
            username (str): The username of the user.

        Returns:
            tuple: A tuple containing a GraphQL query to get the ID of a user
            and the variables for the query.
        """
        Query = """
        query ($name: String) {
            User(name: $name) {
                id
            }
        }
        """
        Variables = {"name": username}
        return Query, Variables

    @staticmethod
    def User_Activity_Feed_Query(  # pylint: disable=R0913
        userId, page, perPage, include_message_activity, start_time=None, end_time=None
    ):
        """
        Constructs and returns a GraphQL query for the activity feed of a user and
        the variables for the query.

        Args:
            userId (int): The ID of the user.
            page (int): The page number.
            perPage (int): The number of items per page.
            include_message_activity (bool): Whether to include message activities.
            start_time (int, optional): The start time for the activities. Defaults to None.
            end_time (int, optional): The end time for the activities. Defaults to None.

        Returns:
            tuple: A tuple containing a GraphQL query for the activity feed of a user
            and the variables for the query.
        """
        Query = """
        query ($userId: Int, $page: Int, $perPage: Int, $createdAtGreater: Int, $createdAtLesser: Int) {
            Page(page: $page, perPage: $perPage) {
                activities(
                    userId: $userId,
                    sort: ID_DESC,
                    createdAt_greater: $createdAtGreater,
                    createdAt_lesser: $createdAtLesser
                ) {
                    ... on TextActivity {
                        id
                        isLiked
                        likes {
                            id
                        }
                        user {
                            id
                        }
                    }
                    ... on ListActivity {
                        id
                        isLiked
                        likes {
                            id
                        }
                        user {
                            id
                        }
                    }
        """
        if include_message_activity:
            Query += """
                    ... on MessageActivity {
                        id
                        isLiked
                        likes {
                            id
                        }
                        recipientId
                    }
            """
        Query += """
                }
            }
        }
        """
        Variables = {
            "userId": userId,
            "page": page,
            "perPage": perPage,
            "createdAtGreater": start_time,
            "createdAtLesser": end_time,
        }
        return Query, Variables


class Mutations:
    """
    This class contains static methods that construct and return various
    GraphQL mutations. Each method corresponds to a specific type of mutation,
    such as following a user or liking an activity.
    """

    def __init__(self):
        pass

    @staticmethod
    def Follow_Mutation(user_id):
        """
        Constructs and returns a GraphQL mutation to follow or unfollow a user and
        the variables for the mutation.

        Args:
            user_id (int): The ID of the user.

        Returns:
            tuple: A tuple containing a GraphQL mutation to follow or unfollow a user
            and the variables for the mutation.
        """
        Mutation = """
        mutation ($id: Int) {
            ToggleFollow(userId: $id) {
                id
                name
                isFollowing
            }
        }
        """
        Variables = {"id": user_id}
        return Mutation, Variables

    @staticmethod
    def Like_Mutation(activity_id):
        """
        Constructs and returns a GraphQL mutation to like or unlike an activity and
        the variables for the mutation.

        Args:
            activity_id (int): The ID of the activity.

        Returns:
            tuple: A tuple containing a GraphQL mutation to like or unlike an activity
            and the variables for the mutation.
        """
        Mutation = """
        mutation ($id: Int, $type: LikeableType) {
            ToggleLike(id: $id, type: $type) {
                id
            }
        }
        """
        Variables = {"id": activity_id, "type": "ACTIVITY"}
        return Mutation, Variables
