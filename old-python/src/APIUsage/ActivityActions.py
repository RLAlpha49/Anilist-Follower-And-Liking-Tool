"""
This module contains the actions related to activities.
"""

# pylint: disable=C0103, E0401, E0402

# Import necessary modules
import time
import logging
import keyboard  # pylint: disable=C0411
import requests  # pylint: disable=C0411

from .. import Config
from .. import QueriesAndMutations as QM
from .APIRequests import API_Request
from .UserActions import follow_user, like_activity, unfollow_user
from .Utils import (
    convert_time_to_seconds,
    get_following,
    get_user_id,
    get_valid_input,
    is_positive_integer,
    is_valid_time_period,
)

# Configure logging
logging.basicConfig(level=logging.INFO)


def get_global_activities(total_people_to_follow: int, follower_threshold: int) -> list:
    """
    Retrieves global activities, gets follower counts of users, and follows them.

    Args:
        total_people_to_follow (int): The total number of people to process.
        follower_threshold (int): The minimum number of followers a user must have.

    Returns:
        list: A list of user IDs who have been followed.
    """
    page = 1
    people_processed = 0
    followed_user_ids = []
    user_id = get_user_id()
    headers = {"Authorization": f"Bearer {user_id}"}
    following = get_following(headers, user_id)
    unfollowed_ids = Config.load_unfollowed_ids()

    while people_processed < total_people_to_follow:
        user_ids = set()
        query, variables = QM.Queries.Global_Activity_Feed_Query(page)
        response = API_Request(query, variables)

        for activity in response["data"]["Page"]["activities"]:
            if "user" in activity:
                user_id = activity["user"]["id"]
                if user_id not in following and user_id not in unfollowed_ids:
                    user_ids.add(user_id)

        follower_count_query = QM.Queries.Get_Multiple_Follower_Counts_Query(
            list(user_ids)
        )
        follower_count_response = API_Request(follower_count_query, {})

        people_followed_this_page = 0
        for user_id in user_ids:
            follower_count = follower_count_response["data"][f"followers{user_id}"][
                "pageInfo"
            ]["total"]
            if follower_count >= follower_threshold:
                if follow_user(user_id):
                    followed_user_ids.append(user_id)
                    following.append(user_id)
                    people_processed += 1
                    people_followed_this_page += 1

        if people_followed_this_page > 0:
            logging.info(f"Page {page}: Followed {people_followed_this_page} people.")
        else:
            logging.info(
                f"Page {page}: No one was followed. (Consider decreasing follower threshold)"
            )

        page += 1

    return followed_user_ids


def like_activities(
    total_activities_to_like: int,
    include_message_activity: bool,
    user_list: list = None,
):
    """
    Likes activities of users.

    Args:
        total_activities_to_like (int): The total number of activities to like per user.
        include_message_activity (bool): Whether to include message activities.
        user_list (list, optional): A list of user IDs. Defaults to None.

    Returns:
        None
    """
    if user_list is None:
        user_list = get_following()
    viewer_ID = get_user_id()

    counters = {
        "expected_likes": total_activities_to_like * len(user_list),
        "total_likes": 0,
        "no_activities_users": 0,
        "failed_requests": 0,
    }
    no_activities_user_ids = []

    logging.info(f"Expected number of likes: {counters['expected_likes']}")

    for user_id in user_list:
        page = 1
        activities_liked = 0
        while activities_liked < total_activities_to_like:
            query, variables = QM.Queries.User_Activity_Feed_Query(
                user_id, page, 50, include_message_activity
            )
            response = API_Request(query, variables)

            if response is None:
                counters["failed_requests"] += 1
                break

            activities = [
                activity
                for activity in response["data"]["Page"]["activities"]
                if activity
                and "isLiked" in activity
                and not activity["isLiked"]
                and ("user" not in activity or activity["user"]["id"] != viewer_ID)
                and (
                    "recipientId" not in activity or activity["recipientId"] == user_id
                )
            ]

            for activity in activities:
                if activities_liked < total_activities_to_like:
                    activity_liked = like_activity(activity["id"])
                    if activity_liked:
                        logging.info(
                            f"Liked activity with ID: {activity['id']}, User ID: {user_id}"
                        )
                        activities_liked += 1
                        counters["total_likes"] += 1
                    else:
                        logging.error(f"Error: Activity with ID: {activity['id']}")
                        counters["failed_requests"] += 1

            if not response["data"]["Page"]["activities"]:
                if not activities:
                    counters["no_activities_users"] += 1
                    no_activities_user_ids.append(user_id)
                break

            page += 1

    logging.info(f"Expected number of likes: {counters['expected_likes']}")
    logging.info(f"Total number of likes: {counters['total_likes']}")
    logging.info(f"Users with no activities to like: {counters['no_activities_users']}")
    logging.info(f"Failed requests: {counters['failed_requests']}")
    logging.info(f"User IDs with no more activities: {no_activities_user_ids}")


def like_following_activities(refresh_interval: int, total_pages: int):
    """
    Likes activities of the users the viewer is following.

    Args:
        refresh_interval (int): The interval in minutes after which to refresh the activity feed.
        total_pages (int): The total number of pages to like activities from.

    Returns:
        None
    """
    state = {
        "page": 1,
        "last_checked_page": 1,
        "pages_without_likes": 0,
        "start_time": time.time(),
        "stop": False,
        "total_likes": 0,
        "failed_requests": 0,
        "already_liked": 0,
        "timer_reset": False,
    }

    viewer_ID = get_user_id()

    def set_stop(event):  # pylint: disable=W0613
        nonlocal state
        state["stop"] = True

    keyboard.on_press_key("F12", set_stop)

    while not state["stop"]:
        handle_page_limit(state, total_pages)
        handle_no_likes(state, total_pages)
        handle_activities(state, viewer_ID)
        handle_page_likes(state)
        handle_refresh_interval(state, refresh_interval)

    logging.info(f"Total likes: {state['total_likes']}")
    logging.info(f"Activities skipped: {state['already_liked']}")
    logging.info(f"Failed requests: {state['failed_requests']}")

    keyboard.unhook_all()


def handle_page_limit(state: dict, total_pages: int):
    """
    Handles the page limit for liking activities.

    Args:
        state (dict): A dictionary that holds the state of the activity liking process.
        total_pages (int): The total number of pages to like activities from.

    Returns:
        None
    """
    if state["page"] == total_pages + 1:
        logging.info("Page limit reached. Resetting to page 1.")
        time.sleep(5)
        state["page"] = 1


def handle_no_likes(state: dict, total_pages: int):
    """
    Handles the scenario where no activities are liked on a page.

    Args:
        state (dict): A dictionary that holds the state of the activity liking process.
        total_pages (int): The total number of pages to like activities from.

    Returns:
        None
    """
    if total_pages >= 5 and state["pages_without_likes"] >= 2 and state["timer_reset"]:
        state["page"] = (
            state["last_checked_page"] if state["last_checked_page"] > 1 else 1
        )
        state["pages_without_likes"] = 0
        state["timer_reset"] = False
        logging.info(
            f"No activities liked after 2 pages. Skipping to page {state['last_checked_page']}"
        )


def handle_activities(state: dict, viewer_ID: str):
    """
    Handles the activities for a given page.

    Args:
        state (dict): A dictionary that holds the state of the activity liking process.
        viewer_ID (str): The ID of the viewer.

    Returns:
        None
    """
    query, variables = QM.Queries.Following_Activity_Feed_Query(state["page"])
    while True:
        try:
            response = API_Request(query, variables)
            if response is not None:
                break
        except requests.exceptions.ConnectionError:
            logging.warning("A connection error occurred. Retrying...")
    following_activity_feed = response["data"]["Page"]["activities"]
    logging.info(f"Checking Page {state['page']} for following activity feed")

    state["page_likes"] = 0
    for activity in following_activity_feed:
        try:
            if activity["isLiked"]:
                state["already_liked"] += 1
                continue
        except KeyError:
            continue

        user_id = activity["user"]["id"] if "user" in activity else None
        if user_id != viewer_ID:
            activity_liked = like_activity(activity["id"])
            if activity_liked:
                logging.info(
                    f"Liked activity with ID: {activity['id']}, User ID: {user_id}"
                )
                state["total_likes"] += 1
                state["page_likes"] += 1
            else:
                logging.error(
                    f"Error: Activity with ID: {activity['id']}, User ID: {user_id}"
                )
                state["failed_requests"] += 1

        if state["stop"]:
            break


def handle_page_likes(state: dict):
    """
    Handles the likes for a given page.

    Args:
        state (dict): A dictionary that holds the state of the activity liking process.

    Returns:
        None
    """
    if state["page_likes"] > 0:
        state["pages_without_likes"] = 0
    else:
        state["pages_without_likes"] += 1

    if not state["timer_reset"]:
        state["last_checked_page"] = state["page"]
    state["page"] += 1


def handle_refresh_interval(state: dict, refresh_interval: int):
    """
    Handles the refresh interval for the activity feed.

    Args:
        state (dict): A dictionary that holds the state of the activity liking process.
        refresh_interval (int): The interval in minutes after which to refresh the activity feed.

    Returns:
        None
    """
    if (
        time.time() - state["start_time"] >= refresh_interval * 60
        and not state["timer_reset"]
    ):
        logging.info(
            f"Refreshing following activity feed after {refresh_interval} minutes"
        )
        state["page"] = 1
        state["start_time"] = time.time()
        state["timer_reset"] = True
        state["pages_without_likes"] = 0


class ActivityProcessingContext:
    """
    A class to represent the context for processing activities.

    Attributes:
        viewer_ID (str): The ID of the viewer.
        perPage (int): The number of activities to retrieve per page.
        totalPages (int): The total number of pages to retrieve.
        include_message_activity (bool): Whether to include message activities.
        start_time (int): The start time for retrieving activities.
        end_time (int): The end time for retrieving activities.
        following_users (list): The list of users the viewer is following.
        unfollowed_ids (list): The list of users the viewer has unfollowed.
        follow_unfollowed_users (bool): Whether to follow users the viewer has unfollowed.
        user_likes_count (dict): A dictionary to count the likes per user.
        not_appeared_users (dict): A dictionary to track the users who have not appeared.
        followed_users (list): The list of users the viewer has followed.
    """

    def __init__(
        self,
        viewer_ID: str,
        perPage: int,
        totalPages: int,
        include_message_activity: bool,
        start_time: int,
        end_time: int,
        following_users: list,
        unfollowed_ids: list,
        follow_unfollowed_users: bool,
    ):
        self.viewer_ID = viewer_ID
        self.perPage = perPage
        self.totalPages = totalPages
        self.include_message_activity = include_message_activity
        self.start_time = start_time
        self.end_time = end_time
        self.following_users = following_users
        self.unfollowed_ids = unfollowed_ids
        self.follow_unfollowed_users = follow_unfollowed_users
        self.user_likes_count = {}
        self.not_appeared_users = {user_id: 0 for user_id in following_users}
        self.followed_users = []


def get_liked_activities(perPage: int, totalPages: int, include_message_activity: bool):
    """
    Retrieves and processes liked activities.

    Args:
        perPage (int): The number of activities to retrieve per page.
        totalPages (int): The total number of pages to retrieve.
        include_message_activity (bool): Whether to include message activities.

    Returns:
        None
    """
    viewer_ID, following_users = get_viewer_id_and_following_users()
    follow_unfollowed_users, time_back, likes_threshold = get_user_input()
    unfollowed_ids = Config.load_unfollowed_ids()
    time_back_seconds = convert_time_to_seconds(time_back)
    end_time = int(time.time())
    start_time = end_time - time_back_seconds

    context = ActivityProcessingContext(
        viewer_ID,
        perPage,
        totalPages,
        include_message_activity,
        start_time,
        end_time,
        following_users,
        unfollowed_ids,
        follow_unfollowed_users,
    )

    context.user_likes_count, context.not_appeared_users, context.followed_users = (
        process_activities(context)
    )

    context.followed_users, context.following_users = follow_users(
        context.followed_users,
        context.user_likes_count,
        likes_threshold,
        context.following_users,
    )
    context.user_likes_count, context.not_appeared_users = display_user_likes_count(
        context.user_likes_count,
        likes_threshold,
        context.following_users,
        context.not_appeared_users,
    )
    display_not_appeared_users(context.not_appeared_users)


def get_viewer_id_and_following_users() -> tuple:
    """
    Retrieves the viewer's ID and the list of users they are following.

    Returns:
        tuple: A tuple containing the viewer's ID and a list of users they are following.
    """
    viewer_ID = get_user_id()
    following_users = get_following()
    return viewer_ID, following_users


def get_user_input() -> tuple:
    """
    Prompts the user for various inputs needed for the program.

    Returns:
        tuple: A tuple containing the user's responses to the prompts.
    """
    follow_unfollowed_users = (
        get_valid_input(
            "Would you like to follow users who like your activity but you are not following them? (y/n): ",
            valid_inputs=["y", "n"],
        ).lower()
        == "y"
    )
    time_back = get_valid_input(
        "How far back should it check for activities? Enter a number for days, or append 'w' for weeks, 'm' for months, or 'y' for years (e.g., '2w' for 2 weeks): ",
        validation_func=is_valid_time_period,
    )
    likes_threshold = get_valid_input(
        "Enter the minimum number of activities a user needs to have liked to be included in the list: ",
        validation_func=is_positive_integer,
    )
    return follow_unfollowed_users, time_back, likes_threshold


def process_activities(context: ActivityProcessingContext) -> tuple:
    """
    Processes the activities of the user.

    Args:
        context (ActivityProcessingContext): The context containing all the necessary information for processing activities.

    Returns:
        tuple: A tuple containing the updated user likes count, not appeared users, and followed users.
    """
    for page in range(1, context.totalPages + 1):
        logging.info(f"Checking page {page}...")
        query, variables = QM.Queries.User_Activity_Feed_Query(
            context.viewer_ID,
            page,
            context.perPage,
            context.include_message_activity,
            context.start_time,
            context.end_time,
        )
        response = API_Request(query, variables)
        activities = response["data"]["Page"]["activities"]
        if not activities:
            logging.info("No more activities to retrieve.")
            break
        for activity in activities:
            if "likes" in activity:
                for user in activity["likes"]:
                    user_id = user["id"]
                    context.user_likes_count[user_id] = (
                        context.user_likes_count.get(user_id, 0) + 1
                    )
                    context.not_appeared_users.pop(user_id, None)
                    if (
                        user_id not in context.following_users
                        and user_id not in context.unfollowed_ids
                        and context.follow_unfollowed_users
                        and user_id != context.viewer_ID
                        and user_id not in context.followed_users
                    ):
                        context.followed_users.append(user_id)
    return context.user_likes_count, context.not_appeared_users, context.followed_users


def follow_users(
    followed_users: list,
    user_likes_count: dict,
    likes_threshold: int,
    following_users: list,
) -> tuple:
    """
    Follows users based on the likes threshold.

    Args:
        followed_users (list): The list of users the viewer has followed.
        user_likes_count (dict): A dictionary to count the likes per user.
        likes_threshold (int): The minimum number of likes a user must have to be followed.
        following_users (list): The list of users the viewer is following.

    Returns:
        tuple: A tuple containing the updated lists of followed users and following users.
    """
    for user_id in list(followed_users):
        if user_likes_count.get(user_id, 0) >= likes_threshold:
            if follow_user(user_id):
                following_users.append(user_id)
        else:
            followed_users.remove(user_id)
    return followed_users, following_users


def display_user_likes_count(
    user_likes_count: dict,
    likes_threshold: int,
    following_users: list,
    not_appeared_users: dict,
) -> tuple:
    """
    Displays the count of likes per user and updates the lists of users.

    Args:
        user_likes_count (dict): A dictionary to count the likes per user.
        likes_threshold (int): The minimum number of likes a user must have to be displayed.
        following_users (list): The list of users the viewer is following.
        not_appeared_users (dict): A dictionary to track the users who have not appeared.

    Returns:
        tuple: A tuple containing the updated user_likes_count dictionary and
        not_appeared_users dictionary.
    """
    sorted_user_likes = sorted(
        user_likes_count.items(), key=lambda item: item[1], reverse=True
    )
    logging.info(f"\nUser Likes Count ({len(sorted_user_likes)}):")
    for user_id, count in sorted_user_likes:
        if count >= likes_threshold:
            logging.info(f"User ID: {user_id}, Count: {count}")
        else:
            del user_likes_count[user_id]
            if user_id in following_users:
                not_appeared_users[user_id] = 0
    return user_likes_count, not_appeared_users


def display_not_appeared_users(not_appeared_users: dict):
    """
    Displays the users who have not appeared and optionally unfollows them.

    Args:
        not_appeared_users (dict): A dictionary to track the users who have not appeared.
    """
    display_not_appeared = input("\nDisplay users not appeared? (y/n): ").lower() == "y"
    if display_not_appeared:
        excluded_ids = Config.load_excluded_ids()
        not_appeared_users = {
            user_id: count
            for user_id, count in not_appeared_users.items()
            if user_id not in excluded_ids
        }
        logging.info(
            f"\nUsers Not Appeared ({len(not_appeared_users)}): {not_appeared_users}"
        )
        unfollow_not_appeared = (
            input("\nUnfollow users not appeared? (y/n): ").lower() == "y"
        )
        if unfollow_not_appeared:
            unfollowed_ids = []
            for user_id in not_appeared_users:
                unfollow_user(user_id)
                unfollowed_ids.append(user_id)
            save_unfollowed = (
                input("\nSave unfollowed user IDs? (y/n): ").lower() == "y"
            )
            if save_unfollowed:
                Config.save_unfollowed_ids(set(unfollowed_ids))
