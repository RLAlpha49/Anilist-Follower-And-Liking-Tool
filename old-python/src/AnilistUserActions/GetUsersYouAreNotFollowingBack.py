"""
This module contains functions to identify and follow users that the current
user is not following back.

The main function `GetUsersYouAreNotFollowingBack` fetches the user's followers
and following lists, identifies users that are followers but not being followed
back, and offers to exclude them from the unfollowed IDs list. If there are such
users, the function offers to follow them.
"""

# pylint: disable=C0103, R0801

import logging
from src.APIUsage.UserActions import follow_user
from src.APIUsage.Utils import (
    get_followers,
    get_following,
    get_user_id,
    get_valid_input,
)
from src.Config import load_unfollowed_ids

logging.basicConfig(level=logging.INFO)


def print_statistics(followers: list, following: list, not_following: list) -> None:
    """
    Logs statistics about followers, following, and users not being followed back.

    Args:
        followers (list): A list of followers.
        following (list): A list of users being followed.
        not_following (list): A list of followers not being followed back.
    """
    logging.info(f"Number of Followers: {len(followers)}")
    logging.info(f"Number of Following: {len(following)}")
    logging.info(f"Number of Followers Not Following Back: {len(not_following)}")
    logging.info(f"List of IDs: {list(not_following)}")


def exclude_unfollowed_users(not_following: set) -> set:
    """
    Excludes unfollowed users from being followed again, if the user chooses to do so.

    Args:
        not_following (set): A set of user IDs that the current user is not following.

    Returns:
        set: The updated set of user IDs that the current user is not following,
        with unfollowed users excluded if the user chose to do so.
    """
    if (
        get_valid_input(
            "Would you like to exclude unfollowed users from being followed again? (y/n): ",
            ["y", "n"],
        )
        == "y"
    ):
        unfollowed_ids = load_unfollowed_ids()
        not_following -= unfollowed_ids
        logging.info(f"List of IDs: {list(not_following)}")
    return not_following


def follow_users(not_following: set) -> None:
    """
    Follows users that the current user is not following back, if the user chooses to do so.

    Args:
        not_following (set): A set of user IDs that the current user is not following.
    """
    if (
        get_valid_input("Would you like to follow these users? (y/n): ", ["y", "n"])
        == "y"
    ):
        for user_id in not_following:
            follow_user(user_id)
        logging.info("Followed all users not followed.")


def GetUsersYouAreNotFollowingBack() -> None:
    """
    Fetches the user's followers and following lists, identifies users that are followers
    but not being followed back, and offers to exclude them from the unfollowed IDs list.
    If there are such users, the function offers to follow them.
    """
    user_id = get_user_id()
    headers = {"Authorization": f"Bearer {user_id}"}

    followers = get_followers(headers, user_id)
    following = get_following(headers, user_id)
    not_following = set(followers) - set(following)

    if not_following:
        print_statistics(followers, following, not_following)
        not_following = exclude_unfollowed_users(not_following)
        follow_users(not_following)
    else:
        logging.info("You are following all your followers.")
