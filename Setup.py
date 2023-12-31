# Import necessary modules
from APIUsage.Utils import Get_Access_Token, Set_Access_Token, Check_Access_Token
import Config

def Setup():
    # Load configuration and ask for client and secret IDs if not found
    config = Config.load_config('config.json')
    if not config:
        input("Config file not found. Press enter to continue...")
        print("Please create an API on Anilist for the following values (Set Rediruct URL to: https://anilist.co/api/v2/oauth/pin):")
        client = input("Enter Client ID: ")
        secret = input("Enter Secret ID: ")
        
        # Create and save new configuration, set environment variables and access token
        config = Config.create_config(client, secret, Get_Access_Token())
        Config.save_config(config, 'config.json')
        Config.Set_Environment_Variables(config)
        Set_Access_Token()
    else:
        client = config['ANILIST_CLIENT_ID']
        secret = config['ANILIST_CLIENT_SECRET']
        Config.Set_Environment_Variables(config)

    # Refresh access token if it's not valid
    refresh = Check_Access_Token()
    while refresh:
        config = Config.create_config(client, secret, Get_Access_Token())
        Config.save_config(config, 'config.json')
        Set_Access_Token()
        refresh = Check_Access_Token()