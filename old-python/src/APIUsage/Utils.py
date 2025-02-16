"""
This module contains utility functions for the Anilist API.

It includes functions for setting and checking access tokens, retrieving user IDs,
getting follow data, comparing followers and following, and validating user input.
"""

# pylint: disable=C0103, E0401, E0402

# Import necessary modules
import operator
import logging
import requests  # pylint: disable=C0411

from .. import Config
from .. import QueriesAndMutations as QM
from .API import get_access_token
from .APIRequests import API_Request, Set_Headers

# Configure logging
logging.basicConfig(level=logging.INFO)

# Define the API endpoint
URL = "https://graphql.anilist.co"


def set_access_token():
    """
    Sets the access token for the API requests.

    This function retrieves the access token from the configuration file,
    sets it in the headers for the API requests, and saves it back to the
    configuration file if it was not found.
    """
    config = Config.load_config("config.json")
    try:
        if config["ACCESS_TOKEN"] is not None:
            # Get the access token
            access_token = config["ACCESS_TOKEN"]

            # Define the headers for the API request
            headers = {"Authorization": f"Bearer {access_token}"}
            Set_Headers(headers)
        else:
            logging.info("No access token found.")
            config["ACCESS_TOKEN"] = get_access_token()
            Config.save_config(config, "config.json")
            Config.Set_Environment_Variables(config)
    except TypeError:
        logging.error("No config file found")
        return


def check_access_token(headers: dict) -> bool:
    """
    Checks the validity of the access token.

    This function sends a request to the API with the current access token.
    If the response status code indicates an error, it logs an error message
    and returns True. If the token is valid, it logs a success message and
    returns False. If the headers are not set, it sets the access token and
    checks again.

    Returns:
        bool: True if the access token is invalid, False otherwise.
    """
    try:
        query = QM.Queries.Check_Authentication()
        response = requests.post(
            URL, json={"query": query}, headers=headers, timeout=10
        )
        status_code_errors = {
            401: "Error: Invalid Access Token",
            400: "Error: Invalid Access Token",
        }
        if response.status_code in status_code_errors:
            logging.error(status_code_errors[response.status_code])
            return True
        logging.info("Token is valid.")
        return False
    except NameError:
        set_access_token()
        return check_access_token(headers)


def get_user_id() -> int:
    """
    Retrieves the user ID of the authenticated user.

    This function sends a request to the API to retrieve the user ID of the
    authenticated user and returns this value.

    Returns:
        int: The user ID of the authenticated user.
    """
    query = QM.Queries.Check_Authentication()
    response = API_Request(query)
    return response["data"]["Viewer"]["id"]


def get_user_id_from_username(username: str) -> int:
    """
    Retrieves the user ID of a user given their username.

    Args:
        username (str): The username of the user.

    Returns:
        int: The user ID of the user if found, None otherwise.
    """
    query, variables = QM.Queries.Get_User_ID_Query(username)
    response = API_Request(query, variables)
    if "User" in response["data"] and "id" in response["data"]["User"]:
        return response["data"]["User"]["id"]
    logging.error(f"Error: User {username} not found")
    return None


def get_follow_data(
    query_func, message: str, key: str, headers: dict, user_id: int, page: int = 1
) -> list:
    """
    Retrieves follow data for a user.

    This function sends requests to the API to retrieve follow data for a user
    and returns a list of IDs of the followed users.

    Args:
        query_func (function): The function to generate the query and variables.
        message (str): The message to log for each page of results.
        key (str): The key to use to extract the data from the response.
        headers (dict): The headers for the API request.
        user_id (int): The user ID of the authenticated user.
        page (int, optional): The page of results to start from. Defaults to 1.

    Returns:
        list: A list of IDs of the followed users.
    """
    ids = []

    while True:
        query, variables = query_func(user_id, page)
        response = API_Request(query, variables)

        for user in response["data"]["Page"][key]:
            ids.append(user["id"])

        logging.info(
            f"{message}, Page {page} ID's: {ids[-len(response['data']['Page'][key]):]}"
        )
        if not response["data"]["Page"]["pageInfo"]["hasNextPage"]:
            break
        page += 1
    return ids


def get_followers(headers: dict, user_id: int) -> list:
    """
    Retrieves the followers of the authenticated user.

    This function sends a request to the API to retrieve the followers of the
    authenticated user and returns a list of IDs of the followers.

    Args:
        headers (dict): The headers for the API request.
        user_id (int): The user ID of the authenticated user.

    Returns:
        list: A list of IDs of the followers.
    """
    return get_follow_data(
        QM.Queries.Follower_Query, "Checking Followers", "followers", headers, user_id
    )


def get_following(headers: dict, user_id: int) -> list:
    """
    Retrieves the users that the authenticated user is following.

    This function sends a request to the API to retrieve the users that the
    authenticated user is following and returns a list of IDs of these users.

    Args:
        headers (dict): The headers for the API request.
        user_id (int): The user ID of the authenticated user.

    Returns:
        list: A list of IDs of the users that the authenticated user is following.
    """
    return get_follow_data(
        QM.Queries.Following_Query, "Checking Following", "following", headers, user_id
    )


def compare_followers(followers: list, following: list, operation: callable) -> list:
    """
    Compares the followers and following lists using a specified operation.

    Args:
        followers (list): A list of IDs of the followers.
        following (list): A list of IDs of the users being followed.
        operation (function): The operation to use to compare the lists.

    Returns:
        list: The result of the operation on the followers and following lists.
    """
    result = operation(set(following), set(followers))
    return list(result)


def get_mutual_followers(headers: dict, user_id: int) -> list:
    """
    Retrieves the mutual followers of the authenticated user.

    This function sends requests to the API to retrieve the followers and
    following of the authenticated user and returns a list of IDs of the
    mutual followers.

    Returns:
        list: A list of IDs of the mutual followers.
    """
    followers = get_followers(headers, user_id)
    logging.info("")
    following = get_following(headers, user_id)
    logging.info("")
    return compare_followers(followers, following, operator.and_)


def get_not_followed_followers(headers: dict) -> list:
    """
    Retrieves the followers of the authenticated user that the user is not following back.

    This function sends requests to the API to retrieve the followers and
    following of the authenticated user and returns a list of IDs of the
    followers that the user is not following back.

    Returns:
        list: A list of IDs of the followers that the user is not following back.
    """
    followers = get_followers(headers)
    logging.info("")
    following = get_following(headers)
    logging.info("")
    return compare_followers(followers, following, operator.sub)


def get_valid_input(
    prompt: str, valid_inputs: list = None, validation_func: callable = None
) -> str:
    """
    Prompts the user for input and validates it.

    This function prompts the user for input and checks if it is in a list of
    valid inputs or if it passes a validation function. If the input is valid,
    it is returned. If not, the user is prompted again.

    Args:
        prompt (str): The prompt to display to the user.
        valid_inputs (list, optional): A list of valid inputs. Defaults to None.
        validation_func (function, optional): A function to validate the input.
            Defaults to None.

    Returns:
        str or int: The user's input if it is valid. If the validation function
            is Is_Positive_Integer, the input is returned as an int.
    """
    while True:
        user_input = input(prompt)
        if valid_inputs and user_input in valid_inputs:
            return user_input
        if validation_func and validation_func(user_input):
            return (
                int(user_input)
                if validation_func == is_positive_integer  # pylint: disable=W0143
                else user_input
            )
        logging.error("Invalid input. Please try again.")


def is_positive_integer(s: str) -> bool:
    """
    Checks if a string represents a positive integer.

    Args:
        s (str): The string to check.

    Returns:
        bool: True if the string represents a positive integer, False otherwise.
    """
    return s.isdigit() and int(s) > 0


def is_valid_time_period(s: str) -> bool:
    """
    Checks if a string represents a valid time period.

    A valid time period is a positive integer followed by an optional unit.
    The unit can be 'w' for weeks, 'm' for months, or 'y' for years. If no
    unit is provided, the time period is assumed to be in days.

    Args:
        s (str): The string to check.

    Returns:
        bool: True if the string represents a valid time period, False otherwise.
    """
    if s.isdigit():
        return True  # Days
    if s.endswith("w") and s[:-1].isdigit():
        return True  # Weeks
    if s.endswith("m") and s[:-1].isdigit():
        return True  # Months
    if s.endswith("y") and s[:-1].isdigit():
        return True  # Years
    return False


def convert_time_to_seconds(time_back: str) -> int:
    """
    Converts a time period to seconds.

    The time period is a string that ends with 'w', 'm', 'y', or no unit.
    'w' stands for weeks, 'm' stands for months, 'y' stands for years. If no
    unit is provided, the time period is assumed to be in days.

    Args:
        time_back (str): The time period to convert.

    Returns:
        int: The time period in seconds.
    """
    # Convert the time period to seconds
    if time_back.endswith("w"):
        time_back_seconds = int(time_back[:-1]) * 7 * 24 * 60 * 60
    elif time_back.endswith("m"):
        time_back_seconds = int(time_back[:-1]) * 30 * 24 * 60 * 60
    elif time_back.endswith("y"):
        time_back_seconds = int(time_back[:-1]) * 365 * 24 * 60 * 60
    else:
        time_back_seconds = int(time_back) * 24 * 60 * 60
    return time_back_seconds
