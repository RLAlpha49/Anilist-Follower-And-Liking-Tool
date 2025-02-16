"""
This module contains functions for managing followers and following relationships on AniList.

Functions:
    print_statistics: Logs statistics about followers, following, excluded IDs, and users not following back.
    handle_exclusion: Handles the exclusion of IDs from the not_following_back set.
    edit_excluded_ids: Edits the list of excluded IDs.
    unfollow_users: Unfollows users that are not following back.
    GetUsersNotFollowingBack: Identifies users that are not following back and offers to unfollow them.
"""

import logging
from src import Config
from src.APIUsage.UserActions import unfollow_user
from src.APIUsage.Utils import (
    get_followers,
    get_following,
    get_user_id,
    get_valid_input,
    is_positive_integer,
)

logging.basicConfig(level=logging.INFO)


def print_statistics(
    followers: list, following: list, excluded_ids: list, not_following_back: list
) -> None:
    """
    Logs statistics about followers, following, excluded IDs, and users not following back.

    Args:
        followers (list): List of follower IDs.
        following (list): List of following IDs.
        excluded_ids (list): List of excluded IDs.
        not_following_back (list): List of IDs not following back.
    """
    logging.info(f"Number of Followers: {len(followers)}")
    logging.info(f"Number of Following: {len(following)}")
    logging.info(f"Number of Excluded IDs: {len(excluded_ids)}")
    logging.info(f"Number of Following Not Following Back: {len(not_following_back)}")
    logging.info(f"List of IDs: {list(not_following_back)}")


def handle_exclusion(not_following_back: set, excluded_ids: list) -> tuple:
    """
    Handles the exclusion of IDs from the not_following_back set.

    Args:
        not_following_back (set): Set of IDs not following back.
        excluded_ids (list): List of excluded IDs.

    Returns:
        tuple: Updated not_following_back set and excluded_ids list.
    """
    while True:
        action = get_valid_input(
            "Enter 'add' to exclude an ID, 'edit' to edit excluded IDs, 'done' to finish: ",
            ["add", "edit", "done"],
        )
        if action == "add":
            exclude_id = get_valid_input(
                "Enter an ID to exclude: ", validation_func=is_positive_integer
            )
            excluded_id = int(exclude_id)
            not_following_back.discard(excluded_id)
            excluded_ids.append(excluded_id)
        elif action == "edit":
            edit_excluded_ids(excluded_ids)
        elif action == "done":
            break
    Config.save_excluded_ids(set(excluded_ids))
    return not_following_back, excluded_ids


def edit_excluded_ids(excluded_ids: list) -> None:
    """
    Edits the list of excluded IDs.

    Args:
        excluded_ids (list): List of excluded IDs.
    """
    while True:
        for i, excluded_id in enumerate(excluded_ids, start=1):
            logging.info(f"{i}. {excluded_id}")
        edit_id = get_valid_input(
            "Enter the number of the ID to remove or edit, 'add' to add a new ID, or 'done' to finish: ",
            list(map(str, range(1, len(excluded_ids) + 1))) + ["add", "done"],
        )
        if edit_id == "add":
            new_id = get_valid_input(
                "Enter the new ID to add: ", validation_func=is_positive_integer
            )
            excluded_ids.append(int(new_id))
        elif edit_id != "done":
            edit_id = int(edit_id) - 1
            action = get_valid_input(
                "Enter 'remove' to remove the ID or 'change' to change it: ",
                ["remove", "change"],
            )
            if action == "remove":
                excluded_ids.pop(edit_id)
            elif action == "change":
                new_id = get_valid_input(
                    "Enter the new ID: ", validation_func=is_positive_integer
                )
                excluded_ids[edit_id] = int(new_id)
        else:
            break
    logging.info("Excluded IDs:")
    for i, excluded_id in enumerate(excluded_ids, start=1):
        logging.info(f"{i}. {excluded_id}")


def unfollow_users(not_following_back: set, unfollowed_ids: list) -> None:
    """
    Unfollows users that are not following back.

    Args:
        not_following_back (set): Set of IDs not following back.
        unfollowed_ids (list): List of unfollowed IDs.
    """
    if (
        get_valid_input("Would you like to unfollow these users? (y/n): ", ["y", "n"])
        == "y"
    ):
        for user_id in not_following_back:
            unfollow_user(user_id)
            unfollowed_ids.append(user_id)
        logging.info("Unfollowed all users not following back.")
        if (
            get_valid_input(
                "Would you like to save the IDs of the unfollowed users so they are not followed again? (y/n): ",
                ["y", "n"],
            )
            == "y"
        ):
            Config.save_unfollowed_ids(set(unfollowed_ids))


def GetUsersNotFollowingBack() -> None:
    """
    Identifies users that are not following back and offers to unfollow them.
    """
    user_id = get_user_id()
    headers = {"Authorization": f"Bearer {user_id}"}

    followers = get_followers(headers, user_id)
    following = get_following(headers, user_id)

    not_following_back = set(following) - set(followers)
    excluded_ids = list(Config.load_excluded_ids())
    not_following_back -= set(excluded_ids)
    old_not_following_back = not_following_back
    unfollowed_ids = list(Config.load_unfollowed_ids())

    if not_following_back:
        print_statistics(followers, following, excluded_ids, not_following_back)
        not_following_back, excluded_ids = handle_exclusion(
            not_following_back, excluded_ids
        )
        if old_not_following_back != not_following_back:
            logging.info(f"New List: {list(not_following_back)}")
        else:
            logging.info("The list has not changed.")
        unfollow_users(not_following_back, unfollowed_ids)
    else:
        logging.info("No Followers Not Following Back.")
