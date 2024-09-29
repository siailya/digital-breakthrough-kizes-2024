import numpy as np
import io
import tempfile
from PIL import Image
from typing import Annotated, Union, Optional, List, Dict
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse, Response
from demoTalkNet import main
import os
import uvicorn
import pickle
app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

def convert_numpy_to_list(d):
    if isinstance(d, dict):
        return {k: convert_numpy_to_list(v) for k, v in d.items()}
    elif isinstance(d, np.ndarray):
        return d.tolist()
    elif isinstance(d, list):
        return [convert_numpy_to_list(i) for i in d]
    else:
        return d
    

@app.post("/file/upload-file")
async def upload_file(file: UploadFile) -> Dict:
    contents = await file.read()
    with tempfile.NamedTemporaryFile('wb', suffix='.mp4', dir='.', delete= False) as w:
        w.write(contents)
        save_path = main(w.name)
                
    with open(os.path.join(save_path, 'scores.pckl'), 'rb') as fil:
        scores = pickle.load(fil)
        
        
    with open(os.path.join(save_path, 'tracks.pckl'), 'rb') as fil:
        tracks = pickle.load(fil)
        
    scores = convert_numpy_to_list(scores)
    tracks = convert_numpy_to_list(tracks)
    
    res = {
        "scores": scores,
        "tracks": tracks
    }
    
    return res


if __name__ == '__main__':
    uvicorn.run("api:app", port=8000, host = '0.0.0.0')