"""
This module contains functions for interacting with users and activities.

Functions:
    like_activity: Sends a 'like' action for a specific activity.
    toggle_follow_user: Toggles the follow status of a user.
    unfollow_user: Unfollows a user.
    follow_user: Follows a user.
"""

# pylint: disable=C0103, E0401, E0402

# Import necessary modules
from .. import QueriesAndMutations as QM
from .APIRequests import API_Request
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)


def like_activity(activity_id: str) -> bool:
    """
    Sends a 'like' action for a specific activity.

    Args:
        activity_id (str): The ID of the activity to be liked.

    Returns:
        bool: True if the like action was successful, False otherwise.
    """
    query, variables = QM.Mutations.Like_Mutation(activity_id)
    response = API_Request(query, variables)
    if response is not None and "errors" not in response:
        return True
    logging.error(f"Failed to like activity with ID: {activity_id}")
    return False


def toggle_follow_user(
    user_id: str, desired_status: bool, success_message: str, error_message: str
) -> bool:
    """
    Toggles the follow status of a user.

    Args:
        user_id (str): The ID of the user to follow/unfollow.
        desired_status (bool): The desired follow status. True for follow, False for unfollow.
        success_message (str): The message to log if the operation is successful.
        error_message (str): The message to log if the operation fails.

    Returns:
        bool: True if the operation was successful, False otherwise.
    """
    query, variables = QM.Mutations.Follow_Mutation(user_id)
    response = API_Request(query, variables)
    if response is not None:
        if response["data"]["ToggleFollow"]["isFollowing"] == desired_status:
            logging.info(
                success_message.format(
                    response["data"]["ToggleFollow"]["name"], user_id
                )
            )
            return True
        logging.error(
            error_message.format(response["data"]["ToggleFollow"]["name"], user_id)
        )
        return toggle_follow_user(
            user_id, desired_status, success_message, error_message
        )
    logging.error(
        f"Failed to update follow status for user with ID: {user_id}. User account most likely deleted."
    )
    return False


def unfollow_user(user_id: str) -> bool:
    """
    Unfollows a user.

    Args:
        user_id (str): The ID of the user to unfollow.

    Returns:
        bool: True if the unfollow operation was successful, False otherwise.
    """
    return toggle_follow_user(
        user_id,
        False,
        "Unfollowed {} with ID: {}",
        "Error: {} already unfollowed with ID: {}",
    )


def follow_user(user_id: str) -> bool:
    """
    Follows a user.

    Args:
        user_id (str): The ID of the user to follow.

    Returns:
        bool: True if the follow operation was successful, False otherwise.
    """
    return toggle_follow_user(
        user_id,
        True,
        "Followed {} with ID: {}",
        "Error: {} already followed with ID: {}",
    )
