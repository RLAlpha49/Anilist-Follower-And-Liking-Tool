"""
This module contains a function to follow a specified number of random users.
It gets user inputs for the number of people they would like to follow,
then calls a function to get the global activities of the specified number of people.
"""

# pylint: disable=C0103

# Import necessary modules
import logging
from src.APIUsage.ActivityActions import get_global_activities
from src.APIUsage.Utils import get_user_id, get_valid_input, is_positive_integer

# Configure logging
logging.basicConfig(level=logging.INFO)


def FollowRandomUsers() -> None:
    """
    Follows a specified number of random users.

    The function asks the user for the number of people they would like to follow,
    and the follower threshold, then calls a function to get the global activities
    of the specified number of people.
    """
    logging.info("Starting to follow random users.")
    get_user_id()
    total_people_to_follow = get_valid_input(
        "Enter the number of people you would like to follow: ",
        validation_func=is_positive_integer,
    )
    follower_threshold = get_valid_input(
        "Enter the follower threshold (number of followers the users need to be followed): ",
        validation_func=is_positive_integer,
    )
    get_global_activities(total_people_to_follow, follower_threshold)
    logging.info("Finished following random users.")
