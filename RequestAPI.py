from API import Get_Access_Token
import QueriesAndMutations as QM
import Config
import requests
import time
import operator


# Define the API endpoint
url = 'https://graphql.anilist.co'

def handle_rate_limit(response):
    rate_limit_remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
    rate_limit_reset = int(response.headers.get('X-RateLimit-Reset', 0))
    
    if response.status_code == 429:
        wait_time = rate_limit_reset - int(time.time())
        if wait_time < 0:
            wait_time = 60
        print(f"\nRate limit hit. Waiting for {wait_time} seconds.\n")
        time.sleep(wait_time)
    elif rate_limit_remaining < 5:
        print(f"Warning: Only {rate_limit_remaining} requests remaining until rate limit reset.")

def api_request(query, variables=None):
    response = requests.post(url, json={'query': query, 'variables': variables}, headers=headers)
    handle_rate_limit(response)
    #print(response.json())
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 429:
        return api_request(query, variables)
    else:
        print(f"\nFailed to retrieve data. Status code: {response.status_code}\n")
        return None
    
def get_follow_data(query_func, message, key, page=1):
    hasNextPage = True
    ids = []

    while hasNextPage:
        query, variables = query_func(user_id, page)
        response = api_request(query, variables)

        for user in response['data']['Page'][key]:
            ids.append(user['id'])

        print(f"{message}, Page {page} ID's: {ids[-len(response['data']['Page'][key]):]}")
        hasNextPage = response['data']['Page']['pageInfo']['hasNextPage']
        page += 1

    return ids

def Set_Access_Token():
    global headers
    config = Config.load_config('config.json')
    try:
        if config['ACCESS_TOKEN'] is not None:
            # Get the access token
            access_token = config['ACCESS_TOKEN']
            
            # Define the headers for the API request
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
        else:
            print("No access token found.")
            config['ACCESS_TOKEN'] = Get_Access_Token()
            Config.save_config(config, 'config.json')
            Config.Set_Environment_Variables(config)
    except TypeError:
        print("No config file found")
        return
    
def Check_Access_Token():
    try:
        query = QM.Queries.Check_Authentication()
        response = requests.post(url, json={'query': query}, headers=headers)
        status_code_errors = {401: "Error: Invalid Access Token", 400: "Error: Invalid Access Token"}
        if response.status_code in status_code_errors:
            print(status_code_errors[response.status_code])
            return True
        print("\nToken is valid.\n")
        return False
    except NameError:
        Set_Access_Token()
        return Check_Access_Token()

def Get_User_ID():
    global user_id
    query = QM.Queries.Check_Authentication()
    response = api_request(query)
    user_id = response['data']['Viewer']['id']
    return response['data']['Viewer']['id']

def Get_User_ID_From_Username(username):
    query, variables = QM.Queries.Get_User_ID_Query(username)
    response = api_request(query, variables)
    try:
        return response['data']['User']['id']
    except TypeError:
        print(f"Error: User {username} not found")
        return None

def Get_Followers():
    return get_follow_data(QM.Queries.Follower_Query, "Checking Followers", 'followers')

def Get_Following():
    return get_follow_data(QM.Queries.Following_Query, "Checking Following", 'following')

def Toggle_Follow_User(id, desired_status, success_message, error_message):
    query, variables = QM.Mutations.Follow_Mutation(id)
    response = api_request(query, variables)
    if response is not None:
        if response['data']['ToggleFollow']['isFollowing'] == desired_status:
            print(success_message.format(response['data']['ToggleFollow']['name'], id))
        else:
            print(error_message.format(response['data']['ToggleFollow']['name'], id))
            api_request(query, variables)
    else:
        print(f"Failed to update follow status for user with ID: {id}")

def Unfollow_User(id):
    return Toggle_Follow_User(id, False, "Unfollowed {} with ID: {}", "Error: {} already unfollowed with ID: {}")

def Follow_User(id):
    return Toggle_Follow_User(id, True, "Followed {} with ID: {}", "Error: {} already followed with ID: {}")

def Get_Global_Activities(total_people_to_follow):
    page = 1
    people_followed = 0
    following = Get_Following()

    while people_followed < total_people_to_follow:
        query, variables = QM.Queries.Global_Activity_Feed_Query(page)
        response = api_request(query, variables)
        print()

        # Add the ids to the list and follow the user if they are not following the main user
        activity_ids = (activity['id'] for activity in response['data']['Page']['activities'] if 'user' in activity)
        for activity_id in activity_ids:
            user_id = next((activity['user']['id'] for activity in response['data']['Page']['activities'] if activity['id'] == activity_id), None)
            if user_id and user_id not in following and people_followed < total_people_to_follow:
                Follow_User(user_id)
                following.append(user_id)
                people_followed += 1

        # Go to the next page
        page += 1

    return list(activity_ids)

def Like_Activity(id):
    query, variables = QM.Mutations.Like_Mutation(id)
    response = api_request(query, variables)
    if response is not None and 'errors' not in response:
        return True
    else:
        print(f"Failed to like activity with ID: {id}")
        return False

def Like_Activities(total_activities_to_like, include_message_activity, user_list=None):
    if user_list is None:
        user_list = Get_Following()
    expected_likes = total_activities_to_like * len(user_list)
    print(f"\nExpected number of likes: {expected_likes}\n")
    total_likes = 0

    for user_id in user_list:
        page = 1
        activities_liked = 0
        while activities_liked < total_activities_to_like:
            query, variables = QM.Queries.User_Activity_Feed_Query(user_id, page, include_message_activity)
            response = api_request(query, variables)

            # Like the activity if it was not liked before
            activities = (activity for activity in response['data']['Page']['activities'] if activity and 'isLiked' in activity and not activity['isLiked'])
            for activity in activities:
                if activities_liked < total_activities_to_like:
                    activity_liked = Like_Activity(activity['id'])
                    if activity_liked:
                        print(f"Liked activity with ID: {activity['id']} from user with ID: {user_id}")
                        activities_liked += 1
                        total_likes += 1

            # If there are no more activities, break the loop
            if not response['data']['Page']['activities']:
                break

            # Go to the next page
            page += 1

        print()  # Print a line after each user's activities have been processed

    print(f"\nExpected number of likes: {expected_likes}")
    print(f"Total number of likes: {total_likes}")

def Compare_Followers(followers, following, operation):
    result = operation(set(following), set(followers))
    return list(result)

def Get_Mutual_Followers():
    followers = Get_Followers()
    print()
    following = Get_Following()
    print()
    return Compare_Followers(followers, following, operator.and_)

def Get_Not_Followed_Followers():
    followers = Get_Followers()
    print()
    following = Get_Following()
    print()
    return Compare_Followers(followers, following, operator.sub)