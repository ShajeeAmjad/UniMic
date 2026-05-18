import os
import tempfile
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Server] Loading Whisper model (this may download ~150MB on first run)...")
    app.state.model = WhisperModel("base", device="cpu", compute_type="int8")
    print("[Server] Model loaded. Ready to transcribe.")
    yield


app = FastAPI(title="UniMic Transcription Server", lifespan=lifespan)


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    tmp_path = None
    try:
        contents = file.file.read()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.write(contents)
        tmp.close()

        segments, _ = app.state.model.transcribe(tmp_path)
        text = " ".join(segment.text for segment in segments).strip()

        return {"text": text}
    except Exception:
        raise HTTPException(status_code=400, detail="Could not process audio file")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def main():
    uvicorn.run("unimic.server:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
