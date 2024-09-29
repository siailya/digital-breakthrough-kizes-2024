import requests
from bs4 import BeautifulSoup
import re
import os
import json
import pandas as pd
from pytubefix import YouTube
import time
from tqdm import tqdm

df_popular_ru = pd.read_csv("RUvideos.csv", encoding="latin-1")
video_ids = df_popular_ru[~df_popular_ru["video_error_or_removed"]]["video_id"].to_list()

os.makedirs("stats", exist_ok=True)
os.makedirs("audio", exist_ok=True)

for youtube_id in tqdm(video_ids):
    youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"
    response = requests.get(youtube_url).text
    soup = BeautifulSoup(response, 'html.parser')
    data = re.search(r'var ytInitialData = ({.*?});', soup.prettify()).group(1)
    data = json.loads(data)
    try:
        df = pd.DataFrame(data["frameworkUpdates"]["entityBatchUpdate"]["mutations"][0]["payload"]["macroMarkersListEntity"]["markersList"]["markers"]).astype(float)
    except:
        continue
    df.to_csv(os.path.join("stats", f"{youtube_id}.csv"), index=False)
    yt = YouTube(youtube_url)
    ys = yt.streams.get_audio_only()
    ys.download(mp3=True, filename=os.path.join("audio", f"{youtube_id}"))
    time.sleep(5)
