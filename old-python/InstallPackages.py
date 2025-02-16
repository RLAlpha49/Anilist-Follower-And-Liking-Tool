"""
This module contains a function to install Python packages using pip.

The function `install_packages` takes a list of package names as input and
attempts to install each one using pip. If the installation of a package fails,
it prints an error message. If Python or pip is not installed on the system,
it prints an error message and exits.
"""

# pylint: disable=C0103

import subprocess
import sys


def install_packages():
    """
    Installs the specified Python packages using pip.

    This function iterates over the list of packages and attempts to install each one using pip.
    If the installation of a package fails, it prints an error message.
    If Python or pip is not installed on the system, it prints an error message and exits.
    """
    for package in packages:
        try:
            print("\nInstalling " + package + "...\n")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        except subprocess.CalledProcessError:
            print(f"Failed to install {package}")
        except FileNotFoundError:
            print("Python or pip is not installed on this system.")
            input("Please install Python and pip and try again. Press enter to exit...")
            break


# List of packages to install
packages = ["requests", "keyboard"]
print("Installing packages...\n")

install_packages()
input("\nInstallation complete. Press enter to exit.")
