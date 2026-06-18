import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# If modifying these scopes, delete the file token.json.
# 'https://www.googleapis.com/auth/drive.file' allows creation and access to 
# only the files uploaded/created by this app.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def authenticate_google_drive():
    """Authenticates the user and returns the Drive API service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                raise FileNotFoundError(
                    "Missing 'credentials.json' file.\n"
                    "Please download OAuth client credentials from Google Cloud Console "
                    "(APIs & Services > Credentials > Create Credentials > OAuth client ID > Desktop Application) "
                    "and place it in the same directory as this script."
                )
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
            
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            
    return build('drive', 'v3', credentials=creds)

def upload_file(local_file_path, drive_folder_id=None):
    """Uploads a local file to Google Drive.

    Args:
        local_file_path (str): The path to the local file to upload.
        drive_folder_id (str, optional): The ID of the Google Drive folder to upload into.
    """
    if not os.path.exists(local_file_path):
        print(f"Error: Local file '{local_file_path}' does not exist.")
        return None

    try:
        service = authenticate_google_drive()
        
        # Determine filename and mimetype
        file_name = os.path.basename(local_file_path)
        
        # Prepare file metadata
        file_metadata = {'name': file_name}
        if drive_folder_id:
            file_metadata['parents'] = [drive_folder_id]
            
        # Initialize media upload
        # (Replace mimetype='*/*' if you want specific types, or let googleapiclient detect it)
        media = MediaFileUpload(local_file_path, resumable=True)
        
        print(f"Uploading '{file_name}' to Google Drive...")
        
        # Call the Drive API to create the file
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink'
        ).execute()
        
        print("\n--- Upload Successful! ---")
        print(f"File Name: {file.get('name')}")
        print(f"File ID: {file.get('id')}")
        print(f"View Link: {file.get('webViewLink')}")
        return file
        
    except HttpError as error:
        print(f"An API error occurred: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == '__main__':
    # Demo code: creating a dummy file to test upload
    dummy_file = 'drive_upload_demo.txt'
    with open(dummy_file, 'w') as f:
        f.write("Hello Google Drive! This file was uploaded using Python Drive API v3.")
        
    print(f"Created a temporary demo file: {dummy_file}")
    
    try:
        # Attempt to upload
        upload_file(dummy_file)
    except FileNotFoundError as fnfe:
        print(f"\n[Configuration Required]\n{fnfe}")
    finally:
        # Clean up local dummy file
        if os.path.exists(dummy_file):
            os.remove(dummy_file)
