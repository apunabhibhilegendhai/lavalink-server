import json
import subprocess
import time
import urllib.request
import urllib.error
import sys

CLIENT_ID = "861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com"
CLIENT_SECRET = "SboVhoG9s0rNafixCSGGKXAT"
DEVICE_CODE = "AH-1Ng3WgSIG2mmh7w1IDzX8TM9oF-R3IgnG8csNOg8rsymyCGWfmklX5T7aPtylgtTa3XP2VKx3MfGobq_swvu3nNbIxQcjcw"
USER_CODE = "NDB-NRG-SQVT"

def poll():
    print(f"Waiting for authorization for code: {USER_CODE}")
    print("Go to https://www.google.com/device and enter the code.")
    url = "https://www.youtube.com/o/oauth2/token"
    
    payload = json.dumps({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": DEVICE_CODE,
        "grant_type": "http://oauth.net/grant_type/device/1.0"
    }).encode("utf-8")

    start_time = time.time()
    while time.time() - start_time < 1200: # 20 minutes
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            res = urllib.request.urlopen(req)
            data = json.loads(res.read().decode("utf-8"))
            refresh_token = data.get("refresh_token")
            if refresh_token:
                print("==================================================")
                print("SUCCESS! Refresh Token retrieved successfully!")
                print(f"Token: {refresh_token}")
                print("==================================================")
                
                # Save to GitHub Secret
                try:
                    subprocess.run(["gh", "secret", "set", "YOUTUBE_REFRESH_TOKEN", "-b", refresh_token], check=True)
                    print("Set YOUTUBE_REFRESH_TOKEN in GitHub repository secrets successfully!")
                except Exception as e:
                    print(f"Error saving to gh secret: {e}")
                
                return refresh_token
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            if "authorization_pending" in body:
                time.sleep(5)
                continue
            elif "slow_down" in body:
                time.sleep(10)
                continue
            else:
                print(f"Polling stopped with error: {body}")
                break
        except Exception as ex:
            print(f"Network error: {ex}")
            time.sleep(5)
            
    print("Polling timed out or aborted.")
    return None

if __name__ == "__main__":
    poll()
