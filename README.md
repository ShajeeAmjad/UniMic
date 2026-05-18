# UniMic

A local-first voice-typing app that lets you speak to type anywhere on your PC — Notepad, browsers, games, terminal, and more.

## How It Works

UniMic uses a decoupled client-server architecture:

- **Server (`server.py`)** — A local FastAPI service that loads a [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) speech-to-text model into memory and exposes a `/transcribe` endpoint.
- **Client (`client.py`)** — A lightweight background process that listens for a global hotkey, records your microphone, sends the audio to the server, and types the transcribed text into whatever window is active.

The server runs entirely on your machine. No data leaves your PC.

## Prerequisites

- Python 3.10–3.12
- A working microphone
- Windows 10/11

> **First run:** The server downloads the Whisper "base" model (~150 MB) from Hugging Face on first startup. After that, it works fully offline.

## Installation

```bash
git clone https://github.com/ShajeeAmjad/UniMic.git
cd UniMic
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

Open **two terminals** (both with the venv activated):

**Terminal 1 — Start the server:**
```bash
python server.py
```
Wait for `Model loaded. Ready to transcribe.` before continuing.

**Terminal 2 — Start the client:**
```bash
python client.py
```

**Voice typing:**
1. Focus the window where you want to type (e.g., Notepad).
2. Press `Ctrl+Alt+V` to start recording. You'll see `[Listening...]` in the client terminal.
3. Speak your text.
4. Press `Ctrl+Alt+V` again to stop. You'll see `[Processing...]`, then the transcribed text will be typed into the active window.

## Configuration

The server URL is stored as a constant in `client.py`:

```python
API_URL = "http://127.0.0.1:8000/transcribe"
```

To point the client at a remote server (future SaaS mode), change this to your cloud endpoint.

## License

[MIT](LICENSE)
