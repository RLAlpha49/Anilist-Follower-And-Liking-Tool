"""
This module contains functions for making API requests to the Anilist GraphQL API.

Functions:
- handle_status_code(status_code): Handles the status code of the API response.
- API_Request(query, variables=None, max_retries=10): Sends a POST request to the API.
- Set_Headers(header): Sets the headers for the API requests.

The module uses the `requests` library to send HTTP requests and the `logging` library for logging information.
"""

import time
import requests
import logging

# Define the API endpoint
URL = "https://graphql.anilist.co"

# Configure logging
logging.basicConfig(level=logging.INFO)


def handle_status_code(status_code):
    """
    Handles the status code of the API response.

    Args:
        status_code (int): The HTTP status code from the API response.

    Returns:
        bool: True if the status code is 200, False otherwise.
        str: 'retry' if the status code indicates a server error, 'rate_limit' if rate limit is hit.
    """
    if status_code == 200:
        return True
    elif status_code == 429:
        logging.info("Rate limit hit. Waiting for 60 seconds.")
        time.sleep(60)
        return "rate_limit"
    elif status_code in {500, 502}:
        logging.info("Server error. Retrying in 5 seconds.")
        time.sleep(5)
        return "retry"
    else:
        logging.error(f"Failed to retrieve data. Status code: {status_code}")
        return False


def API_Request(query, variables=None, max_retries=10):
    """
    Sends a POST request to the API.

    Args:
        query (str): The GraphQL query to send.
        variables (dict, optional): The variables for the GraphQL query. Defaults to None.
        max_retries (int, optional): The maximum number of retries if the request fails. Defaults to 10.

    Returns:
        dict: The JSON response from the API if the request is successful, None otherwise.
    """
    retry_count = 0
    for _ in range(max_retries):
        try:
            response = requests.post(
                URL,
                json={"query": query, "variables": variables},
                headers=headers,
                timeout=20,
            )
            status = handle_status_code(response.status_code)
            if status is True:
                return response.json()
            elif status == "retry":
                retry_count += 1
                if retry_count >= 3:
                    logging.error("Max retries for server errors reached.")
                    break
        except requests.exceptions.ReadTimeout:
            logging.warning("Request timed out. Retrying...")
    return None


def Set_Headers(header):
    """
    Sets the headers for the API requests.

    Args:
        header (dict): The headers to set for the API requests.
    """
    global headers  # pylint: disable=W0601
    headers = header
