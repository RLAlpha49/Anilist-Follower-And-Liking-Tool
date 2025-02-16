"""
This module contains helper functions for loading and saving JSON data,
managing configuration dictionaries, and handling sets of IDs.

Functions:
    load_json(file_path)
    save_json(data, file_path)
    create_config(client, secret, token=None)
    save_config(config, file_path)
    load_config(file_path)
    Set_Environment_Variables(config)
    load_excluded_ids()
    save_excluded_ids(excluded_ids)
    load_unfollowed_ids()
    save_unfollowed_ids(unfollowed_ids)
"""

# pylint: disable=C0103

# Import necessary modules
import json
import os


# Helper function to load JSON data from a file
def load_json(file_path):
    """
    Loads a JSON file and returns its contents as a Python object.

    Args:
        file_path (str): The path to the JSON file.

    Returns:
        dict: The contents of the JSON file as a Python dictionary.
        If the file is not found, returns None.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        return None


# Helper function to save JSON data to a file
def save_json(data, file_path):
    """
    Saves a Python object as a JSON file.

    Args:
        data (dict): The Python object to be saved. This should be a dictionary.
        file_path (str): The path where the JSON file will be saved.

    This function converts the Python object into JSON format and writes it to a file.
    The JSON file is formatted with an indentation of 4 spaces.
    """
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)


# Function to create a configuration dictionary
def create_config(client, secret, token=None):
    """
    Creates a configuration dictionary for the Anilist API.

    Args:
        client (str): The client ID for the Anilist API.
        secret (str): The secret ID for the Anilist API.
        token (str, optional): The access token for the Anilist API.
        Defaults to None.

    Returns:
        dict: A dictionary containing the client ID, secret ID,
        and access token for the Anilist API.
    """
    return {
        "ANILIST_CLIENT_ID": client,
        "ANILIST_CLIENT_SECRET": secret,
        "ACCESS_TOKEN": token,
    }


# Function to save a configuration dictionary to a file
def save_config(config, file_path):
    """
    Saves a configuration dictionary to a JSON file.

    Args:
        config (dict): The configuration dictionary to be saved.
        file_path (str): The path where the JSON file will be saved.
    """
    save_json(config, file_path)


# Function to load a configuration dictionary from a file
def load_config(file_path):
    """
    Loads a configuration dictionary from a JSON file.

    Args:
        file_path (str): The path to the JSON file.

    Returns:
        dict: The configuration dictionary. If the file is not found, returns None.
    """
    config = load_json(file_path)
    return config if config is not None else None


# Function to set environment variables from a configuration dictionary
def Set_Environment_Variables(config):
    """
    Sets environment variables from a configuration dictionary.

    Args:
        config (dict): The configuration dictionary.
    """
    for key, value in config.items():
        if value is not None:
            os.environ[key] = value


# Function to load a set of excluded IDs from a file
def load_excluded_ids():
    """
    Loads a set of excluded IDs from a JSON file.

    Returns:
        set: The set of excluded IDs. If the file is not found, returns an empty set.
    """
    excluded_ids = load_json("excluded_ids.json")
    return set(excluded_ids) if excluded_ids is not None else set()


# Function to save a set of excluded IDs to a file
def save_excluded_ids(excluded_ids):
    """
    Saves a set of excluded IDs to a JSON file.

    Args:
        excluded_ids (set): The set of excluded IDs.
    """
    save_json(list(excluded_ids), "excluded_ids.json")


# Function to load a set of unfollowed IDs from a file
def load_unfollowed_ids():
    """
    Loads a set of unfollowed IDs from a JSON file.

    Returns:
        set: The set of unfollowed IDs. If the file is not found, returns an empty set.
    """
    unfollowed_ids = load_json("unfollowed_ids.json")
    return set(unfollowed_ids) if unfollowed_ids is not None else set()


# Function to save a set of unfollowed IDs to a file
def save_unfollowed_ids(unfollowed_ids):
    """
    Saves a set of unfollowed IDs to a JSON file. If the file already exists,
    it adds the new IDs to the existing ones.

    Args:
        unfollowed_ids (set): The set of unfollowed IDs.
    """
    # Load existing IDs
    existing_ids = load_unfollowed_ids()

    # Add new IDs
    updated_ids = existing_ids.union(unfollowed_ids)

    # Save updated IDs
    save_json(list(updated_ids), "unfollowed_ids.json")
