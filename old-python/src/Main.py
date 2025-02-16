"""
This module contains the main entry point for the program. It provides a
menu for the user to select various options related to the Anilist API and
performs the corresponding actions based on the user's selection.

Classes:
    Main

Functions:
    __init__(self)
"""

# pylint: disable=C0103

# Import necessary modules
import logging
from Setup import Setup
from src.AnilistUserActions import (
    FollowRandomUsers,
    GetActivityCount,
    GetUsersNotFollowingBack,
    GetUsersYouAreNotFollowingBack,
    LikeFollowingFeed,
    LikeUsersActivity,
)
from src.APIUsage.Utils import get_valid_input

logging.basicConfig(level=logging.INFO)


class Main:  # pylint: disable=R0903
    """
    This class serves as the main entry point for the program. It provides a
    menu for the user to select various options and performs the corresponding
    actions based on the user's selection.
    """

    def __init__(self):
        Setup()
        logging.info(
            "Notice: Anilist will rate limit often, so please be patient when "
            "using this program. (Most times it rate limits a specific feature "
            "so you should be able to use other features on the site while this "
            "is running.)"
        )
        self.menu()

    def menu(self):
        """
        Displays the menu and handles user input to perform the corresponding actions.
        """
        options = {
            "0": self.exit_program,
            "1": GetUsersNotFollowingBack.GetUsersNotFollowingBack,
            "2": GetUsersYouAreNotFollowingBack.GetUsersYouAreNotFollowingBack,
            "3": FollowRandomUsers.FollowRandomUsers,
            "4": LikeUsersActivity.LikeUsersActivity,
            "5": LikeFollowingFeed.LikeFollowingFeed,
            "6": GetActivityCount.GetActivityCount,
        }

        while True:
            option = get_valid_input(
                "\n0. Exit\n1. Get Users Not Following Back\n"
                "2. Get Users You Are Not Following Back\n"
                "3. Follow Random Users From Global Activity Feed\n"
                "4. Like Users Activity\n5. Like Following Feed\n"
                "6. Get Activity Count\nOption: ",
                options.keys(),
            )
            options[option]()

    @staticmethod
    def exit_program():
        """
        Exits the program.
        """
        logging.info("Exiting the program.")
        exit()


if __name__ == "__main__":
    Main()
