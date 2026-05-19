const api = window.unimic;

const bubble = document.getElementById("bubble");
const transcriptPanel = document.getElementById("transcript-panel");
const transcriptText = document.getElementById("transcript-text");
const transcriptStatus = document.getElementById("transcript-status");

var state = "idle";
var starting = false;
var liveTranscribing = false;
var liveTimer = null;
var mediaRecorder = null;
var audioChunks = [];
var stream = null;
var collapseTimer = null;
var typedSoFar = "";

function setState(newState) {
  state = newState;
  bubble.className = "state-" + newState;
}

function encodeWav(samples, sampleRate) {
  var numChannels = 1;
  var bitsPerSample = 16;
  var byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  var blockAlign = numChannels * (bitsPerSample / 8);
  var dataSize = samples.length * (bitsPerSample / 8);
  var buffer = new ArrayBuffer(44 + dataSize);
  var view = new DataView(buffer);

  function writeString(offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  var offset = 44;
  for (var i = 0; i < samples.length; i++) {
    var clamped = Math.max(-1, Math.min(1, samples[i]));
    var intSample = Math.max(-32768, Math.min(32767, Math.round(clamped * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

async function decodeAudioChunk(blob) {
  var arrayBuffer = await blob.arrayBuffer();
  var audioContext = new AudioContext();
  var audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  var channelData = audioBuffer.getChannelData(0);

  if (audioBuffer.sampleRate !== 16000) {
    var targetLength = Math.ceil(channelData.length * 16000 / audioBuffer.sampleRate);
    var offlineCtx = new OfflineAudioContext(1, targetLength, 16000);
    var source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    var resampled = await offlineCtx.startRendering();
    channelData = resampled.getChannelData(0);
  }

  audioContext.close();
  return channelData;
}

function cancelCollapse() {
  if (collapseTimer !== null) {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }
}

function stopLiveTranscription() {
  if (liveTimer !== null) {
    clearInterval(liveTimer);
    liveTimer = null;
  }
  liveTranscribing = false;
}

async function sendLiveTranscription(final) {
  if (!mediaRecorder || (mediaRecorder.state !== "recording" && !final)) return;
  if (liveTranscribing) return;
  if (audioChunks.length === 0) return;

  liveTranscribing = true;
  try {
    var chunksSnapshot = audioChunks.slice();
    var blob = new Blob(chunksSnapshot, { type: "audio/webm" });
    var samples = await decodeAudioChunk(blob);
    var wav = encodeWav(samples, 16000);
    var result = await api.transcribe(wav);

    if (result.text) {
      var fullText = result.text.trim();

      transcriptText.textContent = fullText;
      transcriptPanel.classList.add("live");

      if (fullText.length > typedSoFar.length) {
        var delta = fullText.slice(typedSoFar.length);
        typedSoFar = fullText;
        api.startTyping(delta).catch(function (e) { console.error(e); });
      }
    }
  } catch (e) {
    console.error("Live transcription error:", e);
  }
  liveTranscribing = false;
}

async function startRecording() {
  if (state === "listening" || state === "processing" || starting) return;
  starting = true;
  cancelCollapse();

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    if (state !== "idle") {
      stream.getTracks().forEach(function (t) { t.stop(); });
      starting = false;
      return;
    }

    audioChunks = [];
    typedSoFar = "";

    var mimeType = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "audio/webm";
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000,
    });

    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async function () {
      stopLiveTranscription();
      if (stream) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        stream = null;
      }
      await sendLiveTranscription(true);
      finishSession();
    };

    mediaRecorder.start(250);
    setState("listening");
    starting = false;

    transcriptStatus.textContent = "Listening... speak now";
    transcriptText.textContent = "";
    transcriptPanel.classList.add("visible");
    transcriptPanel.classList.remove("done", "error", "live");
    await api.resizeWidget(320, 160);

    liveTimer = setInterval(function () { sendLiveTranscription(false); }, 1500);
  } catch (err) {
    starting = false;
    var msg = String(err);
    console.error("Mic access failed:", msg);
    setState("error");
    if (msg.indexOf("NotAllowed") !== -1 || msg.indexOf("Permission") !== -1) {
      transcriptStatus.textContent = "Microphone permission denied";
    } else if (msg.indexOf("NotFound") !== -1) {
      transcriptStatus.textContent = "No microphone found";
    } else if (msg.indexOf("NotReadable") !== -1) {
      transcriptStatus.textContent = "Microphone is in use by another app";
    } else {
      transcriptStatus.textContent = "Microphone error: " + msg;
    }
    transcriptPanel.classList.add("error", "visible");
    collapseTimer = setTimeout(function () { collapseWidget(); }, 3000);
  }
}

function stopRecording() {
  stopLiveTranscription();
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  starting = false;
  setState("processing");
  transcriptPanel.classList.remove("live");
  transcriptStatus.textContent = "Stopping...";
}

function finishSession() {
  setState("done");
  transcriptStatus.textContent = "Done!";
  transcriptPanel.classList.add("done");
  collapseTimer = setTimeout(function () { collapseWidget(); }, 2000);
}

async function collapseWidget() {
  cancelCollapse();
  stopLiveTranscription();
  transcriptPanel.classList.remove("visible", "live");
  transcriptText.textContent = "";
  typedSoFar = "";
  starting = false;
  setState("idle");
  await api.resizeWidget(56, 56);
}

var isMouseDown = false;
var dragMoved = false;
var dragStart = { x: 0, y: 0 };
var dragPrev = { x: 0, y: 0 };

bubble.addEventListener("mousedown", function (e) {
  isMouseDown = true;
  dragMoved = false;
  dragStart.x = e.screenX;
  dragStart.y = e.screenY;
  dragPrev.x = e.screenX;
  dragPrev.y = e.screenY;
  e.preventDefault();
});

bubble.addEventListener("mousemove", function (e) {
  if (!isMouseDown) return;
  var dx = e.screenX - dragStart.x;
  var dy = e.screenY - dragStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved = true;
    var mx = e.screenX - dragPrev.x;
    var my = e.screenY - dragPrev.y;
    dragPrev.x = e.screenX;
    dragPrev.y = e.screenY;
    api.moveWidget(mx, my);
  }
});

bubble.addEventListener("mouseup", function () {
  isMouseDown = false;
  if (!dragMoved) {
    if (state === "idle") {
      startRecording();
    } else if (state === "listening" || state === "processing") {
      stopRecording();
    }
  }
});

bubble.addEventListener("mouseleave", function () {
  isMouseDown = false;
});

api.onActivateRecording(function () {
  if (state === "idle") {
    startRecording();
  } else if (state === "listening" || state === "processing") {
    stopRecording();
  }
});

api.getMode().then(function (mode) {
  if (mode === "overlay") {
    bubble.style.opacity = "0";
  }
});
