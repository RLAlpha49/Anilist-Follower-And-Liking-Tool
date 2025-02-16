"""
This module contains functions for liking users' activities on a social media platform.

The main function is `LikeUsersActivity`, which likes a number of activities for a list of users.
The list of users can be manually entered by the user, or it can be the whole follower list,
only followers who follow the user back, or followers not followed back by the user.
The user also specifies the number of activities to like and whether to include message activities.

This module also contains helper functions `get_user_list` and `get_activities_to_like`.
"""

import logging
from src.APIUsage.ActivityActions import like_activities
from src.APIUsage.Utils import (
    get_mutual_followers,
    get_not_followed_followers,
    get_user_id,
    get_user_id_from_username,
    get_valid_input,
    is_positive_integer,
)

logging.basicConfig(level=logging.INFO)


def get_user_list(choice: str) -> list:
    """
    Returns a list of users based on the user's choice.

    Args:
        choice (str): The user's choice. Can be 'list', 'mutual', 'not followed', or 'followers'.

    Returns:
        list: A list of user IDs or usernames, or None if the user chooses 'followers'.
    """
    user_id = get_user_id()
    headers = {"Authorization": f"Bearer {user_id}"}

    if choice == "list":
        return [
            int(user.strip())
            if user.strip().isdigit()
            else get_user_id_from_username(user.strip())
            for user in input(
                "Enter a comma-separated list of user IDs or usernames (e.g., 12345, 67890, username1, username2): "
            ).split(",")
        ]
    if choice == "mutual":
        return get_mutual_followers(headers, user_id)
    if choice == "not followed":
        return get_not_followed_followers(headers, user_id)
    if choice == "followers":
        return None
    return []


def get_activities_to_like() -> tuple:
    """
    Prompts the user for the number of activities to like per user and whether to include message activities.

    Returns:
        tuple: A tuple containing the total number of activities to like per user and a boolean indicating whether to include message activities.
    """
    total_activities_to_like = int(
        get_valid_input(
            "Enter the number of activities you would like to like per user (Max 100): ",
            validation_func=is_positive_integer,
        )
    )
    include_message_activity = (
        get_valid_input(
            "Do you want to like message activities? - Messages sent to the user are considered that user's activity. (y/n): ",
            ["y", "n"],
        ).lower()
        == "y"
    )
    return total_activities_to_like, include_message_activity


def LikeUsersActivity() -> None:
    """
    Likes a specified number of activities for a list of users.

    The list of users can be manually entered by the user, or it can be the whole follower list,
    only followers who follow the user back, or followers not followed back by the user.
    The user specifies the number of activities to like and whether to include message activities.
    """
    logging.info("Starting to like users' activities.")
    get_user_id()

    choice = get_valid_input(
        "Do you want to enter a list of users, use the whole follower list, or only followers who follow you back? (Enter 'list', 'followers', 'mutual', or 'not followed'): ",
        ["list", "followers", "mutual", "not followed"],
    )

    user_list = get_user_list(choice)
    total_activities_to_like, include_message_activity = get_activities_to_like()

    like_activities(total_activities_to_like, include_message_activity, user_list)
    logging.info("Finished liking users' activities.")
