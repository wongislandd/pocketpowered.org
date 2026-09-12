"use strict";
(() => {
  const C = globalThis.ResonanceCore;
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(["song-select", "song-title", "artist", "portrait", "sing", "listen", "mic-off", "restart", "seek", "time", "duration", "status", "feedback", "backing", "guide", "line-select", "loop", "timing", "timing-value", "lyric-current", "lyric-next", "lyric-section", "complete", "session-summary", "lyrics-download", "voice-key"].map(id => [id, $(id)]));
  let records = [], record, data, context, buffers, gains, sources = [];
  let running = false, busy = false, offset = 0, startedAt = 0, playEpoch = 0, loadEpoch = 0, actionEpoch = 0;
  let stream, micSource, worklet, silent, micEpoch = 0, workletLoaded = false;
  let voice = [], lastPitch = null, stableFrames = 0, lastLine = -2, wordNodes = [];
  let loopOn = false, loopLine = null, detectedSeconds = 0, lastCaptureTime = null;
  let yLow = 45, yHigh = 80, lastPaint = 0, flowClock = 0;
  const flowField = new Float32Array(257), flowTargets = new Float32Array(257);
  const flowEnergy = new Float32Array(257), energyTargets = new Float32Array(257);
  let flowActivity = 0, viewLow = 45, viewHigh = 80;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = $("ribbon"), painter = canvas.getContext("2d");
  const formatTime = time => `${Math.floor(Math.max(0, time) / 60)}:${String(Math.floor(Math.max(0, time) % 60)).padStart(2, "0")}`;

  function status(text) { ui.status.textContent = text; }
  function controls() {
    for (const id of ["sing", "listen", "restart", "seek"]) ui[id].disabled = busy || !data;
    ui["song-select"].disabled = !records.length || busy;
    ui.sing.textContent = running && stream ? "Pause" : stream ? "Resume singing" : "Sing with mic";
    ui.listen.textContent = running && !stream ? "Pause" : stream ? "Listen only" : offset > 0 ? "Resume listening" : "Listen first";
    ui["mic-off"].hidden = !stream;
    ui["voice-key"].textContent = !stream ? "You · mic off" : running ? "You · listening" : "You · paused";
    ui.loop.disabled = !loopLine;
    ui.loop.setAttribute("aria-pressed", String(loopOn));
    ui.loop.textContent = loopOn ? "Repeat on" : "Repeat off";
  }
  function outputClock() {
    if (!context) return 0;
    const timestamp = context.getOutputTimestamp?.();
    if (timestamp && timestamp.contextTime > 0 && performance.now() - timestamp.performanceTime < 1000) {
      return Math.min(context.currentTime, timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000);
    }
    return context.currentTime - (context.outputLatency || context.baseLatency || 0);
  }
  function songTime() { return running ? C.clamp(offset + outputClock() - startedAt, offset, data.duration) : offset; }
  function stopSources() {
    playEpoch++;
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
    sources = [];
  }
  function pause(message = "Paused.") {
    if (running) offset = songTime();
    running = false; stopSources(); stableFrames = 0; lastPitch = null;
    controls(); status(message);
  }
  async function ensureAudio() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("This browser can’t run singing practice. Try a recent Safari, Chrome, or Firefox.");
      context = new AudioContext({ latencyHint: "interactive" });
      gains = [context.createGain(), context.createGain()];
      gains.forEach(gain => gain.connect(context.destination));
      context.addEventListener("statechange", () => {
        if (running && context.state !== "running") pause("Audio was interrupted. Press resume when you’re ready.");
      });
    }
    await context.resume();
    gains[0].gain.value = Number(ui.backing.value);
    gains[1].gain.value = Number(ui.guide.value);
    if (!buffers) {
      status("Preparing the backing track and vocals…");
      const epoch = loadEpoch;
      const paths = [record.backing, record.vocals];
      const decoded = await Promise.all(paths.map(async path => {
        const response = await fetch(path);
        if (!response.ok) throw new Error("The audio couldn’t load. Check your connection and try again.");
        return context.decodeAudioData(await response.arrayBuffer());
      }));
      if (epoch !== loadEpoch) throw new Error("The song changed. Please try again.");
      if (Math.abs(decoded[0].duration - decoded[1].duration) > .05) throw new Error("These stems don’t match. Please use the record preview.");
      buffers = decoded;
    }
  }
  function start() {
    stopSources();
    if (offset >= data.duration - .05) offset = 0;
    const epoch = playEpoch;
    startedAt = context.currentTime + .1;
    // Both stems share one scheduled start and one offset; no independent media clocks.
    sources = buffers.map((buffer, index) => {
      const source = context.createBufferSource();
      source.buffer = buffer; source.connect(gains[index]);
      source.start(startedAt, offset);
      if (index === 0) source.onended = () => {
        if (epoch === playEpoch && running && !loopOn) finish();
      };
      return source;
    });
    running = true; ui.complete.hidden = true;
    controls(); status(stream ? "Mic on" : "Listening");
  }
  function seek(time) {
    const resume = running;
    pause(""); offset = C.clamp(time, 0, data.duration);
    voice = []; stableFrames = 0; lastLine = -2; lastPitch = null;
    if (resume) start(); else status("Ready from here.");
    updateLyrics(offset);
  }
  function micOff() {
    micEpoch++;
    const oldStream = stream; stream = null;
    oldStream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (worklet) { worklet.port.onmessage = null; worklet.disconnect(); }
    micSource?.disconnect(); silent?.disconnect();
    worklet = null; micSource = null; silent = null;
    lastPitch = null; lastCaptureTime = null; stableFrames = 0; voice = [];
    ui.feedback.textContent = "";
    controls();
  }
  async function enableMic() {
    if (stream) return;
    if (!navigator.mediaDevices?.getUserMedia || !context.audioWorklet) throw new Error("Live singing isn’t available in this browser. You can still listen with lyrics.");
    const epoch = ++micEpoch;
    status("Allow microphone access to see your voice.");
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }, video: false });
    if (epoch !== micEpoch || document.hidden) { acquired.getTracks().forEach(t => t.stop()); throw new Error("Microphone request cancelled. Try again when you’re ready."); }
    stream = acquired;
    try {
      if (!workletLoaded) { await context.audioWorklet.addModule("pitch-worklet.mjs"); workletLoaded = true; }
      if (epoch !== micEpoch) throw new Error("Microphone request cancelled.");
      micSource = context.createMediaStreamSource(stream);
      worklet = new AudioWorkletNode(context, "vocal-pitch", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      silent = context.createGain(); silent.gain.value = 0;
      micSource.connect(worklet).connect(silent).connect(context.destination);
      worklet.port.onmessage = event => onPitch(event.data);
      worklet.onprocessorerror = () => { pause("The microphone processor stopped. Try reconnecting the mic."); micOff(); };
      stream.getAudioTracks()[0].onended = () => { pause("Microphone disconnected. Reconnect it, then try again."); micOff(); };
    } catch (error) { micOff(); throw error; }
  }
  function onPitch(sample) {
    if (!running || !stream || sample.contextTime < startedAt) return;
    const delay = Math.max(0, context.currentTime - outputClock());
    const time = C.sampleSongTime(sample.contextTime, delay, startedAt, offset, Number(ui.timing.value));
    if (time < 0 || time > data.duration) return;
    const value = sample.hz && sample.confidence >= .8 ? C.midi(sample.hz) : null;
    const target = C.targetAt(data.pitch, time);
    const cents = value !== null && target !== null ? (value - target) * 100 : null;
    // Entry/exit hysteresis affects the glow only. Measured pitch is never snapped.
    if (cents !== null && Math.abs(cents) < (stableFrames >= 4 ? 70 : 45)) stableFrames++;
    else stableFrames = 0;
    const aligned = stableFrames >= 4;
    lastPitch = { time, value, aligned, energy: C.clamp((sample.rms - .008) / .12, 0, 1), at: performance.now() };
    ui["voice-key"].textContent = value !== null ? "You · live" : lastPitch.energy > .03 ? "You · finding pitch" : "You · quiet";
    voice.push(lastPitch);
    while (voice.length && voice[0].time < time - 6) voice.shift();
    if (value !== null && lastCaptureTime !== null) detectedSeconds += C.clamp(sample.contextTime - lastCaptureTime, 0, .1);
    lastCaptureTime = sample.contextTime;
    const message = value === null ? "Let your voice come through." : target === null ? "Your voice is here." : aligned ? "Together." : cents > 0 ? "Ease a little lower." : "Reach a little higher.";
    if (ui.feedback.textContent !== message) ui.feedback.textContent = message;
  }
  async function action(useMic) {
    if (busy || !data) return;
    if (running && Boolean(stream) === useMic) { pause(); return; }
    const keepPlaying = running;
    if (running) pause("");
    busy = true; controls();
    const epoch = ++actionEpoch;
    try {
      await ensureAudio();
      if (epoch !== actionEpoch || document.hidden) throw new Error("Paused while you were away. Press resume to continue.");
      if (useMic) await enableMic(); else micOff();
      if (epoch !== actionEpoch || document.hidden) { micOff(); throw new Error("Paused while you were away. Press resume to continue."); }
      start();
    } catch (error) {
      const message = error.name === "NotAllowedError" ? "Microphone access wasn’t allowed. Enable it in your browser, or choose Listen first." : error.name === "NotFoundError" ? "No microphone found. Connect one, or choose Listen first." : error.message;
      status(message);
      if (!keepPlaying) running = false;
    } finally { busy = false; controls(); }
  }
  function finish() {
    const hadMic = Boolean(stream);
    pause("Finished. Come back to any line you’d like to sing again.");
    offset = data.duration;
    micOff(); ui.complete.hidden = false;
    ui["session-summary"].textContent = hadMic ? `${Math.round(detectedSeconds)} seconds of voice detected. Keep the phrases that felt good; give the others another go.` : "You’ve heard the melody. Try it with your voice when you’re ready.";
  }
  function updateLyrics(time) {
    if (!data) return;
    const lines = data.lyrics.lines;
    const index = C.lyricLineAt(lines, time);
    if (index !== lastLine) {
      lastLine = index; wordNodes = [];
      ui["lyric-current"].replaceChildren();
      if (index < 0) {
        const next = lines.find(line => line.start > time);
        ui["lyric-current"].textContent = "";
        ui["lyric-next"].textContent = next?.text || "";
        ui["lyric-section"].textContent = "Instrumental";
      } else {
        const line = lines[index];
        ui["lyric-section"].textContent = line.section.replace(/\s*—.*/, "");
        for (const [i, word] of line.words.entries()) {
          const span = document.createElement("span"); span.className = "word"; span.textContent = (i ? " " : "") + word.text;
          ui["lyric-current"].append(span); wordNodes.push(span);
        }
        ui["lyric-next"].textContent = lines[index + 1]?.text || "";
      }
    }
    if (index >= 0) data.lyrics.lines[index].words.forEach((word, i) => { wordNodes[i].className = `word ${C.wordState(word, time)}`; });
  }
  function render(now) {
    requestAnimationFrame(render);
    if (document.hidden || now - lastPaint < (reducedMotion.matches ? 80 : 16)) return;
    const elapsed = Math.min(.05, Math.max(0, (now - lastPaint) / 1000));
    lastPaint = now;
    if (!reducedMotion.matches) flowClock += elapsed;
    const time = data ? songTime() : 0;
    if (running && loopOn && loopLine && time >= Math.min(data.duration, loopLine.end + .3)) { seek(Math.max(0, loopLine.start - .6)); return; }
    if (running && time >= data.duration) { finish(); return; }
    if (data) { ui.seek.value = String(time); ui.time.textContent = formatTime(time); updateLyrics(time); }
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    painter.setTransform(ratio, 0, 0, ratio, 0, 0); painter.clearRect(0, 0, width, height);
    const x = t => width * (.5 + (t - time) / 4.8);
    // Share one scale for both streams, expanding it when a singer is outside
    // the recording's range instead of silently drawing their voice offscreen.
    const recentPitches = stream ? voice.filter(p => p.time >= time - 2.4 && p.value !== null).map(p => p.value) : [];
    const low = Math.min(yLow, ...recentPitches.map(p => p - 3));
    const high = Math.max(yHigh, ...recentPitches.map(p => p + 3));
    const settling = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed * 12);
    viewLow += (low - viewLow) * settling; viewHigh += (high - viewHigh) * settling;
    const y = midi => height - 42 - (midi - viewLow) / (viewHigh - viewLow) * (height - 84);
    const fresh = Boolean(stream && running && lastPitch && lastPitch.value !== null && now - lastPitch.at < 220);
    const together = fresh && lastPitch.aligned;
    const flowTime = reducedMotion.matches ? 0 : flowClock;
    const fract = value => value - Math.floor(value);
    const palette = ["#389ba9", "#728bca", "#598cb5", "#62b5b5", "#9c91c6"];
    const count = reducedMotion.matches ? 480 : Math.min(1900, Math.round(width * 1.9));
    flowActivity += ((running ? 1 : 0) - flowActivity) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed * 8));

    // The particle field IS the chart: x maps to song time, y to vocal pitch,
    // and thickness/turbulence to measured vocal energy. Silence returns to a
    // thin baseline. There is no independent chart line or playhead dot.
    for (let i = 0; i < flowTargets.length; i++) {
      const t = time + (i / (flowTargets.length - 1) - .5) * 4.8;
      const target = data ? C.targetAt(data.pitch, t) : null;
      const energy = data ? C.energyAt(data.vocalEnvelope, t) * flowActivity : 0;
      energyTargets[i] = energy;
      flowTargets[i] = height * .5 + (target === null ? 0 : y(target) - height * .5) * Math.min(1, energy * 2.5);
    }
    // A 38 ms spatial filter joins neighboring grains without lagging the
    // center behind the audible clock or bridging whole instrumental breaks.
    for (let i = 0; i < flowField.length; i++) {
      const left = Math.max(0, i - 1), right = Math.min(flowField.length - 1, i + 1);
      flowField[i] = (flowTargets[left] + flowTargets[i] * 2 + flowTargets[right]) / 4;
      flowEnergy[i] = (energyTargets[left] + energyTargets[i] * 2 + energyTargets[right]) / 4;
    }
    const envelope = u => Math.sin(C.clamp(u, 0, 1) * Math.PI) ** .65;
    const focus = u => Math.exp(-(((u - .5) / .045) ** 2));
    function fieldAt(field, u) {
      const bin = C.clamp(u, 0, 1) * (field.length - 1), left = Math.floor(bin), fraction = bin - left;
      return field[left] * (1 - fraction) + field[Math.min(left + 1, field.length - 1)] * fraction;
    }
    function current(u, lane, depth) {
      const center = fieldAt(flowField, u), energy = fieldAt(flowEnergy, u);
      const wave = u * 16 + flowTime * 2.5;
      const breadth = 1.1 + energy * (12 + 5 * Math.sin(wave * .4) ** 2);
      return center + envelope(u) * (
        lane * breadth + energy * (Math.sin(wave + depth * Math.PI * 2) * 5
        + Math.sin(u * 31 + flowTime * 3.2 + depth * 4) * 2)
      );
    }
    painter.lineCap = "round"; painter.lineJoin = "round";
    for (let strand = 0; strand < 14; strand++) {
      const lane = (strand / 13 - .5) * 2, depth = fract(strand * .61803398875);
      painter.strokeStyle = palette[strand % palette.length];
      for (let section = 0; section < 16; section++) {
        painter.beginPath();
        for (let step = 0; step <= 16; step++) {
          const u = (section + step / 16) / 16;
          if (!step) painter.moveTo(u * width, current(u, lane, depth)); else painter.lineTo(u * width, current(u, lane, depth));
        }
        const u = (section + .5) / 16;
        painter.globalAlpha = envelope(u) * (.04 + focus(u) * .055);
        painter.lineWidth = .65; painter.stroke();
      }
    }
    for (let i = 0; i < count; i++) {
      const seed = fract(i * .61803398875), lane = (fract(i * .754877666) - .5) * 2;
      const depth = fract(i * .569840291), speed = .17 + depth * .065;
      const position = fract(seed - flowTime * speed);
      // The final quarter of the grains concentrate around NOW at the exact
      // center, making the current moment part of the wave, not an overlay.
      const u = i > count * .75 ? .5 + (position - .5) * .08 : position;
      const strength = fieldAt(flowEnergy, u), focal = focus(u);
      const opacity = envelope(u) * (.14 + (1 - Math.abs(lane)) * .28 + focal * .2);
      painter.fillStyle = painter.strokeStyle = together && focal > .5 ? "#8d70b1" : palette[i % palette.length];
      if (!reducedMotion.matches) {
        const tail = .006 + depth * (.009 + strength * .012);
        for (let segment = 2; segment >= 0; segment--) {
          const a = u + tail * segment / 3, b = Math.min(1, u + tail * (segment + 1) / 3);
          if (a >= 1) continue;
          painter.globalAlpha = opacity * (1 - segment / 3) * .3;
          painter.lineWidth = .55 + depth * .4;
          painter.beginPath(); painter.moveTo(a * width, current(a, lane, depth));
          painter.lineTo(b * width, current(b, lane, depth)); painter.stroke();
        }
      }
      painter.globalAlpha = opacity;
      const size = .4 + depth * .65 + focal * .35;
      painter.beginPath(); painter.arc(u * width, current(u, lane, depth), size, 0, Math.PI * 2); painter.fill();
    }

    // A continuous pink stream makes mic presence visible even between notes.
    // Unpitched/silent sections stay on a neutral baseline; only valid measured
    // pitches move vertically. The stream ends at NOW, never inventing a future.
    if (stream) {
      const voiceCount = reducedMotion.matches ? 300 : Math.min(1100, Math.round(width * 1.3));
      const baseline = Math.min(height - 24, height * .5 + 38);
      function voiceAt(t) {
        if (!running) return { y: baseline, energy: 0, pitched: false, aligned: false };
        const index = C.before(voice, t, p => p.time), point = voice[index], next = voice[index + 1];
        if (!point || t - point.time > .12) return { y: baseline, energy: 0, pitched: false, aligned: false };
        if (point.value === null) return { y: baseline, energy: point.energy, pitched: false, aligned: false };
        const blend = next && next.value !== null && next.time - point.time < .12 ? C.clamp((t - point.time) / (next.time - point.time), 0, 1) : 0;
        const pitch = point.value + ((next?.value ?? point.value) - point.value) * blend;
        return { y: y(pitch), energy: point.energy, pitched: true, aligned: point.aligned };
      }
      for (let i = 0; i < voiceCount; i++) {
        const position = fract(i * .61803398875 + flowTime * .35);
        const age = position * (i > voiceCount * .7 ? .22 : 2.4);
        const t = time - age, point = voiceAt(t);
        const lane = fract(i * .754877666) - .5;
        const px = x(t), py = point.y + lane * (point.pitched ? 7 + point.energy * 16 : 2 + point.energy * 5);
        painter.globalAlpha = (.3 + .7 * (1 - age / 2.4)) * (point.pitched ? .7 : .32);
        painter.fillStyle = painter.strokeStyle = point.aligned ? "#a45496" : "#c76082";
        if (!reducedMotion.matches) {
          const tailTime = Math.max(time - 2.4, t - .035), tail = voiceAt(tailTime);
          // A rest is a rest: never connect the neutral baseline to a note.
          if (tail.pitched === point.pitched && Math.abs(tail.y - point.y) < 25) {
            painter.lineWidth = .65;
            painter.beginPath(); painter.moveTo(x(tailTime), tail.y + lane * (point.pitched ? 7 + tail.energy * 16 : 2 + tail.energy * 5));
            painter.lineTo(px, py); painter.stroke();
          }
        }
        painter.beginPath(); painter.arc(px, py, .55 + fract(i * .4142) * .8, 0, Math.PI * 2); painter.fill();
      }
    }
    painter.globalAlpha = 1;
  }

  async function selectRecord(key) {
    if (busy) return;
    const selected = records.find(r => r.key === key) || records[0];
    const epoch = ++loadEpoch;
    pause(""); micOff(); busy = true; data = null; buffers = null; offset = 0; detectedSeconds = 0; lastLine = -2; loopOn = false; loopLine = null;
    record = selected; controls(); status("Loading this record…");
    ui["song-select"].value = selected.key; ui["song-title"].textContent = selected.title; ui.artist.textContent = selected.artist;
    ui.portrait.src = selected.photo; ui["lyrics-download"].href = selected.lyricsText;
    $("timed-lyrics").href = `practice/${selected.key}/lyrics.vtt`;
    ui.complete.hidden = true; ui["line-select"].replaceChildren(new Option("Whole song", ""));
    ui["lyric-current"].textContent = "A little room for your voice."; ui["lyric-next"].textContent = "";
    try {
      const response = await fetch(`${selected.practice}?v=particle-chart-1`);
      if (!response.ok) throw new Error("This record’s practice data couldn’t load. Reload the page to try again.");
      const result = await response.json();
      if (epoch !== loadEpoch) return;
      if (result.sourceHash !== selected.sourceHash || result.lyrics.sourceHash !== selected.sourceHash) throw new Error("The lyrics don’t match this recording. Please use the record preview.");
      data = result;
      ui.seek.max = String(data.duration); ui.duration.textContent = formatTime(data.duration);
      data.lyrics.lines.forEach((line, index) => { if (line.end > line.start) ui["line-select"].add(new Option(line.text, String(index))); });
      const pitches = data.pitch.filter(p => p[1] !== null && p[2] >= .5).map(p => p[1]).sort((a, b) => a - b);
      yLow = Math.floor(pitches[Math.floor(pitches.length * .02)] || 45) - 4;
      yHigh = Math.max(yLow + 16, Math.ceil(pitches[Math.floor(pitches.length * .98)] || 78) + 4);
      viewLow = yLow; viewHigh = yHigh;
      document.title = `${selected.title} — Sing with Resonance`;
      const url = new URL(location.href); url.searchParams.set("song", selected.key); history.replaceState(null, "", url);
      status(""); updateLyrics(0);
    } catch (error) { status(error.message); }
    finally { busy = false; controls(); }
  }
  ui.sing.addEventListener("click", () => action(true));
  ui.listen.addEventListener("click", () => action(false));
  ui["mic-off"].addEventListener("click", () => { micOff(); status(running ? "Mic is off. Listening only." : "Mic is off."); });
  ui.restart.addEventListener("click", () => seek(0));
  ui.seek.addEventListener("input", () => { loopOn = false; seek(Number(ui.seek.value)); controls(); });
  ui["song-select"].addEventListener("change", event => selectRecord(event.target.value));
  ui["line-select"].addEventListener("change", () => { const index = ui["line-select"].value; loopLine = index === "" ? null : data.lyrics.lines[Number(index)]; if (loopLine) seek(Math.max(0, loopLine.start - .6)); else loopOn = false; controls(); });
  ui.loop.addEventListener("click", () => { loopOn = !loopOn; if (loopOn && loopLine) seek(Math.max(0, loopLine.start - .6)); controls(); });
  ui.timing.addEventListener("input", () => { ui["timing-value"].textContent = `${ui.timing.value} ms`; voice = []; stableFrames = 0; });
  ui.backing.addEventListener("input", () => gains?.[0].gain.setTargetAtTime(Number(ui.backing.value), context.currentTime, .03));
  ui.guide.addEventListener("input", () => gains?.[1].gain.setTargetAtTime(Number(ui.guide.value), context.currentTime, .03));
  $("again").addEventListener("click", () => { offset = 0; detectedSeconds = 0; action(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { actionEpoch++; pause("Paused while you were away. Press resume to continue."); micOff(); } });
  window.addEventListener("pagehide", () => { actionEpoch++; pause(""); micOff(); context?.close(); context = null; buffers = null; workletLoaded = false; });
  navigator.mediaDevices?.addEventListener("devicechange", () => { if (stream) { pause("Your audio devices changed. Check your headphones and reconnect the mic."); micOff(); } });
  requestAnimationFrame(render);
  fetch("practice/records.json").then(response => { if (!response.ok) throw new Error("Couldn’t load the records. Please reload."); return response.json(); }).then(async list => {
    records = list; ui["song-select"].replaceChildren(...records.map(r => new Option(`${r.title} · ${r.artist}`, r.key)));
    await selectRecord(new URL(location.href).searchParams.get("song"));
  }).catch(error => status(error.message));
})();
