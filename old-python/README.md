# Anilist Follower & Liking Tool

**Notice:** Program is compiled with pyinstaller so some anti-viruses may give false positives. For people who want to compile it themselves download the source files and run `Main.py`. There is a script that will install the necessary python modules in the source files and releases.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [License](#license)

## Features

This program is a utility for interacting with the Anilist API. It provides several features to manage your Anilist account:

### Get Users Not Following Back

This feature retrieves a list of users that you are following but who are not following you back.

- Option to exclude certain users from this list.
- Option to unfollow these users.
- Displays the number of followers, following, excluded IDs, and users not following back.
- Allows you to add or edit excluded IDs.

### Get Users You Are Not Following Back

This feature retrieves a list of users who are following you, but you are not following back.

- Option to follow these users.
- Displays the number of followers, following, and users you are not following back.

### Follow Random Users From Global Activity Feed

This feature allows you to follow a specified number of random users from the global activity feed.

- Displays the number of people you would like to follow.

### Like Followed Users Activity

This feature allows you to like a specified number of activities from each user you are following.

- Option to include message activities.
- Option to enter a list of users, use the whole follower list, only followers who follow you back, or users who do not follow you back.
- Displays the number of activities you would like to like per user.
- Gives total values for likes, etc.

### Like Following Feed

This feature allows you to like activities from your following feed.

- Can run endlessly
- Option to stop liking activities by pressing the 'F12' key.
- Option to set how often the feed should refresh in minutes.

### Retrieve Users Who Like Your Activity

This feature identifies users who have liked your activities.

- Gives total of activities liked from users who have liked your activity
- Provides an option to follow these users, given they are not in your list of previously unfollowed users.
- If any new users are followed during this process, their IDs are displayed at the end.

## Installation

- The `AnilistFollwerAndLikingTool.exe` file requires no prerequisites. Just run it.
- For those compiling it themselves
  - Download the source files
  - Download the required python packages with the included `InstallPackages.py` script or yourself
  - Run `Main.py`

## License

Distributed under the GNU General Public License v3.0 License. See `LICENSE` for more information.
