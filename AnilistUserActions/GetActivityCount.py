# Import necessary modules
from APIUsage.ActivityActions import Get_Liked_Activities
from APIUsage.Utils import Get_Valid_Input

# Function to get the count of activities
def GetActivityCount():
    # Get user inputs for activities per page, total pages, and whether to include message activities
    perPage = Get_Valid_Input("\nEnter the number of activities per page (Max 50): ", list(map(str, range(1, 51))))
    totalPages = int(input("Enter the total number of pages to go through (There is no Max, program will stop when activities stop returning): "))
    print(f"Total activities to check: {int(perPage) * totalPages}\n")
    include_message_activity = Get_Valid_Input("Do you want include message activities? (y/n): ", ['y', 'n']).lower() == 'y'
    print()
    # Fetch liked activities based on user inputs
    Get_Liked_Activities(int(perPage), totalPages, include_message_activity)