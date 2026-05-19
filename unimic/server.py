import os
import tempfile
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, "models", "faster-whisper-base")

    print(f"[Server] Loading Whisper model from {model_path}...")
    if WhisperModel is None:
        raise RuntimeError("faster-whisper not installed. Run: pip install faster-whisper")

    app.state.model = WhisperModel(model_path, device="cpu", compute_type="int8")
    print("[Server] Model loaded. Ready to transcribe.")
    yield


app = FastAPI(title="UniMic Transcription Server", lifespan=lifespan)


@app.post("/transcribe")
async def transcribe(request: Request):
    tmp_path = None
    try:
        audio_bytes = await request.body()

        if not audio_bytes:
            return {"text": ""}

        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.write(audio_bytes)
        tmp.close()

        segments, _ = app.state.model.transcribe(tmp_path)
        text = " ".join(segment.text for segment in segments).strip()

        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process audio: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
async def health():
    return {"status": "ok"}


def main():
    uvicorn.run("unimic.server:app", host="127.0.0.1", port=8765)


if __name__ == "__main__":
    main()
