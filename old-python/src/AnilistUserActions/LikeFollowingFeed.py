"""
This module contains the function `LikeFollowingFeed` which is used to like
activities from the following feed.

The user specifies the refresh interval and the number of pages to like
activities from. The function will continue to like activities until the
'F12' key is pressed.
"""

# pylint: disable=C0103

import logging
from src.APIUsage.ActivityActions import like_following_activities
from src.APIUsage.Utils import get_user_id, get_valid_input

logging.basicConfig(level=logging.INFO)


def get_user_inputs() -> tuple:
    """
    Gets user inputs for refresh interval and total pages.

    Returns:
        tuple: A tuple containing refresh interval (int) and total pages (int).
    """
    refresh_interval = int(
        get_valid_input(
            "Enter the refresh interval in minutes "
            "(Give it some time, the Anilist API takes some time to sort from newest to oldest): ",
            list(map(str, range(1, 101))),
        )
    )
    total_pages = int(
        get_valid_input(
            "Enter the number of pages to like activities from (Max 100): ",
            list(map(str, range(1, 101))),
        )
    )
    return refresh_interval, total_pages


def LikeFollowingFeed() -> None:
    """
    Likes activities from the following feed.

    The user specifies the refresh interval and the number of pages to like activities from.
    The function will continue to like activities until the 'F12' key is pressed.
    """
    logging.info("Starting to like activities from the following feed.")
    get_user_id()

    logging.info(
        "Press the 'F12' key to stop liking activities. "
        "(There may be a slight delay before the program stops)"
    )

    refresh_interval, total_pages = get_user_inputs()
    like_following_activities(refresh_interval, total_pages)
    logging.info("Finished liking activities from the following feed.")
