import requests
import os

response = requests.post(
            url='http://localhost:8000/get_transcripton',
            # data = {'sample_rate': str(44100)},
            files={'audio': open(os.path.join("audio_wav", "9IH9ghkWEvg.wav"), 'rb'),
                   'type': 'audio/wav'},
            headers={'accept': 'application/json'}
                             )
print(response)
