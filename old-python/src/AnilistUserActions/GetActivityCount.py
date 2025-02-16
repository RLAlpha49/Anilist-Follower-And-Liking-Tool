"""
This module contains a function to fetch and return the activity count of the user.
It gets user inputs for activities per page, total pages, and whether to include message activity.
Then, it fetches liked activities based on user inputs.
"""

# pylint: disable=C0103

# Import necessary modules
import logging
from src.APIUsage.ActivityActions import get_liked_activities
from src.APIUsage.Utils import get_valid_input

# Configure logging
logging.basicConfig(level=logging.INFO)


def get_user_inputs() -> tuple:
    """
    Gets user inputs for activities per page, total pages, and whether to include message activity.

    Returns:
        tuple: A tuple containing activities per page (int), total pages (int), and include message activity (bool).
    """
    per_page = int(
        get_valid_input(
            "\nEnter the number of activities per page (Max 50): ",
            list(map(str, range(1, 51))),
        )
    )
    total_pages = int(
        input(
            "Enter the total number of pages to go through "
            "(There is no Max, program will stop when activities stop returning): "
        )
    )
    logging.info(f"Total activities to check: {per_page * total_pages}\n")
    include_message_activity = (
        get_valid_input(
            "Do you want to include message activities? (y/n): ", ["y", "n"]
        ).lower()
        == "y"
    )
    return per_page, total_pages, include_message_activity


def GetActivityCount() -> int:
    """
    Fetches and returns the activity count of the user.

    Returns:
        int: The activity count of the user.
    """
    per_page, total_pages, include_message_activity = get_user_inputs()
    logging.info("Fetching liked activities based on user inputs.")
    get_liked_activities(per_page, total_pages, include_message_activity)
    logging.info("Finished fetching liked activities.")
