"""
This module contains the Setup function which is responsible for setting up the
environment for the application. It loads the configuration from a JSON file,
sets up the environment variables, and manages the access token for the Anilist API.
"""

# pylint: disable=C0103

# Import necessary modules
from src import Config
from src.APIUsage.Utils import check_access_token, get_access_token, set_access_token
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)


def prompt_for_client_and_secret() -> dict:
    """
    Prompts the user to enter the Client ID and Secret ID.

    Returns:
        dict: A dictionary containing the Client ID and Secret ID.
    """
    input("Config file not found. Press enter to continue...")
    print(
        "Please create an API on Anilist for the following values "
        "(Set Redirect URL to: https://anilist.co/api/v2/oauth/pin):"
    )
    client = input("Enter Client ID: ")
    secret = input("Enter Secret ID: ")
    return {"client": client, "secret": secret}


def setup_environment(config: dict):
    """
    Sets up the environment variables and access token.

    Args:
        config (dict): The configuration dictionary.
    """
    Config.Set_Environment_Variables(config)
    set_access_token()


def refresh_access_token(client: str, secret: str, headers: dict):
    """
    Refreshes the access token if it is not valid.

    Args:
        client (str): The Client ID.
        secret (str): The Secret ID.
        headers (dict): The headers for the API request.
    """
    refresh = check_access_token(headers)
    while refresh:
        config = Config.create_config(client, secret, get_access_token())
        Config.save_config(config, "config.json")
        set_access_token()
        refresh = check_access_token(headers)


def Setup():
    """
    Loads the configuration from a JSON file and sets up the environment variables.
    If the configuration file is not found, it prompts the user to enter the
    Client ID and Secret ID. It then creates and saves a new configuration, sets
    the environment variables, and sets the access token. If the access token is
    not valid, it refreshes the access token.
    """
    # Load configuration and ask for client and secret IDs if not found
    config = Config.load_config("config.json")
    if not config:
        credentials = prompt_for_client_and_secret()
        config = Config.create_config(
            credentials["client"], credentials["secret"], get_access_token()
        )
        Config.save_config(config, "config.json")
        setup_environment(config)
    else:
        setup_environment(config)

    # Refresh access token if it's not valid
    headers = {"Authorization": f"Bearer {config['ACCESS_TOKEN']}"}
    refresh_access_token(
        config["ANILIST_CLIENT_ID"], config["ANILIST_CLIENT_SECRET"], headers
    )
