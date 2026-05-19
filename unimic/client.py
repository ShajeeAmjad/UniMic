import os
import tempfile
import threading

import numpy as np
import requests
import scipy.io.wavfile
import sounddevice as sd
from pynput import keyboard

API_URL = "http://127.0.0.1:8765/transcribe"
SAMPLE_RATE = 16000
CHANNELS = 1

recording_event = threading.Event()
state_lock = threading.Lock()
audio_frames: list[np.ndarray] = []
typer = keyboard.Controller()


def record_audio():
    audio_frames.clear()

    def callback(indata, frames, time_info, status):
        if status:
            print(f"[Warning: {status}]")
        audio_frames.append(indata.copy())

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="int16", callback=callback
        ):
            while recording_event.is_set():
                sd.sleep(100)
    except Exception as e:
        print(f"[Error: Could not access microphone - {e}]")


def send_audio(frames):
    if not frames:
        print("[Warning: No audio recorded]")
        return

    tmp_path = None
    try:
        audio_data = np.concatenate(frames, axis=0)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.close()
        scipy.io.wavfile.write(tmp_path, SAMPLE_RATE, audio_data)

        with open(tmp_path, "rb") as f:
            response = requests.post(
                API_URL, files={"file": ("audio.wav", f, "audio/wav")}, timeout=30
            )
        response.raise_for_status()

        text = response.json().get("text", "")
        if text:
            typer.type(text + " ")
            print(f"[Typed: {text}]")
        else:
            print("[No speech detected]")

    except requests.ConnectionError:
        print("[Error: Server not reachable. Is server.py running?]")
    except requests.Timeout:
        print("[Error: Request timed out]")
    except requests.HTTPError as e:
        print(f"[Error: Server returned {e.response.status_code}]")
    except Exception as e:
        print(f"[Error: {e}]")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def on_hotkey_press():
    with state_lock:
        if not recording_event.is_set():
            print("[Listening...]")
            recording_event.set()
            threading.Thread(target=record_audio, daemon=True).start()
        else:
            print("[Processing...]")
            recording_event.clear()
            frames_copy = list(audio_frames)
            threading.Thread(target=send_audio, args=(frames_copy,), daemon=True).start()


def main():
    print("UniMic Voice Typing")
    print("====================")
    print("Press Ctrl+Alt+V to start/stop recording")
    print("Press Ctrl+C to quit\n")

    hotkey = keyboard.GlobalHotKeys({"<ctrl>+<alt>+v": on_hotkey_press})
    hotkey.start()

    try:
        hotkey.join()
    except KeyboardInterrupt:
        print("\n[Exiting...]")


if __name__ == "__main__":
    main()
