"use strict";
(() => {
  const C = globalThis.ResonanceCore;
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(["song-title", "artist", "portrait", "sing", "listen", "seek", "time", "duration", "status", "feedback", "backing", "guide", "lyric-current", "lyric-next", "lyric-section", "input-meter", "input-status", "input-device", "calibrate", "calibration-status"].map(id => [id, $(id)]));
  let records = [], record, data, context, buffers, gains, sources = [];
  let running = false, busy = false, offset = 0, startedAt = 0, playEpoch = 0, loadEpoch = 0, actionEpoch = 0;
  let stream, micSource, worklet, silent, micEpoch = 0, workletLoaded = false;
  let voice = [], lastPitch = null, stableFrames = 0, lastLine = -2, wordNodes = [];
  let calibration = null, requestedDevice = "", inputKey = "default", lastInputAt = 0;
  let inputProfile = { minRms: .002, level: .08 };
  const inputProfiles = new Map();
  let yLow = 45, yHigh = 80, lastPaint = 0;
  const flowField = new Float32Array(260), flowTargets = new Float32Array(260);
  const flowEnergy = new Float32Array(260), energyTargets = new Float32Array(260);
  let viewLow = 45, viewHigh = 80;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = $("ribbon"), painter = canvas.getContext("2d");
  const formatTime = time => `${Math.floor(Math.max(0, time) / 60)}:${String(Math.floor(Math.max(0, time) % 60)).padStart(2, "0")}`;

  function status(text, visible = false) { ui.status.textContent = text; ui.status.className = visible ? "status" : "status sr-only"; }
  function controls() {
    ui.sing.disabled = busy || !record;
    ui.listen.disabled = ui.seek.disabled = busy || !data || Boolean(calibration);
    ui.calibrate.disabled = busy || !record;
    ui.calibrate.textContent = calibration ? "Cancel" : "Calibrate";
    ui["input-device"].disabled = busy || Boolean(calibration);
    ui.sing.setAttribute("aria-pressed", String(Boolean(stream)));
    ui.sing.setAttribute("aria-label", stream ? "Mute microphone" : "Unmute microphone");
    ui.sing.title = stream ? "Mute microphone" : "Unmute microphone";
    const label = running ? "Pause" : data && offset >= data.duration - .05 ? "Replay" : "Play";
    ui.listen.setAttribute("aria-label", label); ui.listen.title = label;
    $("play-glyph").setAttribute("d", running ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M8 4l13 8-13 8z");
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
  function pause(message = "Paused.", visible = false) {
    if (running) offset = songTime();
    running = false; stopSources(); stableFrames = 0; lastPitch = null;
    controls(); status(message, visible);
  }
  async function ensureContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("This browser can’t run singing practice. Try a recent Safari, Chrome, or Firefox.");
      context = new AudioContext({ latencyHint: "interactive" });
      gains = [context.createGain(), context.createGain()];
      gains.forEach(gain => gain.connect(context.destination));
      context.addEventListener("statechange", () => {
        if ((running || stream) && context.state !== "running") { pause("Audio was interrupted. Press play or reconnect your mic.", true); micOff(); }
      });
    }
    await context.resume();
    gains[0].gain.value = Number(ui.backing.value);
    gains[1].gain.value = Number(ui.guide.value);
  }
  async function ensureAudio() {
    await ensureContext();
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
        if (epoch === playEpoch && running) finish();
      };
      return source;
    });
    running = true;
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
    cancelCalibration();
    micEpoch++;
    const oldStream = stream; stream = null;
    oldStream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (worklet) { worklet.port.onmessage = null; worklet.disconnect(); }
    micSource?.disconnect(); silent?.disconnect();
    worklet = null; micSource = null; silent = null;
    lastPitch = null; stableFrames = 0; voice = [];
    ui.feedback.textContent = "";
    ui["input-meter"].value = 0; ui["input-status"].textContent = "Microphone muted.";
    controls();
  }
  async function enableMic() {
    if (stream) return;
    if (!navigator.mediaDevices?.getUserMedia || !context.audioWorklet) throw new Error("Live singing isn’t available in this browser. You can still listen with lyrics.");
    const epoch = ++micEpoch;
    status("Allow microphone access to see your voice.", true);
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, ...(requestedDevice ? { deviceId: { exact: requestedDevice } } : {}) }, video: false });
    if (epoch !== micEpoch || document.hidden) { acquired.getTracks().forEach(t => t.stop()); throw new Error("Microphone request cancelled. Try again when you’re ready."); }
    stream = acquired;
    try {
      if (!workletLoaded) { await context.audioWorklet.addModule("pitch-worklet.mjs?v=a09f41402120"); workletLoaded = true; }
      if (epoch !== micEpoch) throw new Error("Microphone request cancelled.");
      micSource = context.createMediaStreamSource(stream);
      worklet = new AudioWorkletNode(context, "vocal-pitch", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      silent = context.createGain(); silent.gain.value = 0;
      micSource.connect(worklet).connect(silent).connect(context.destination);
      inputKey = stream.getAudioTracks()[0].getSettings?.().deviceId || requestedDevice || "default";
      inputProfile = inputProfiles.get(inputKey) || { minRms: .002, level: .08 };
      configureGate(inputProfile.minRms);
      ui["calibration-status"].textContent = inputProfiles.has(inputKey) ? "Calibrated for this microphone. Ready to sing." : "Calibrate to match your room and singing volume.";
      lastInputAt = performance.now();
      ui["input-status"].textContent = "Listening — sing a comfortable note.";
      worklet.port.onmessage = event => onPitch(event.data);
      await refreshInputs();
      worklet.onprocessorerror = () => { pause("The microphone processor stopped. Try reconnecting the mic.", true); micOff(); };
      stream.getAudioTracks()[0].onended = () => { pause("Microphone disconnected. Reconnect it, then try again.", true); micOff(); };
    } catch (error) { micOff(); throw error; }
  }
  function onPitch(sample) {
    if (!stream) return;
    lastInputAt = performance.now();
    ui["input-meter"].value = C.clamp((20 * Math.log10(Math.max(.00001, sample.rms)) + 70) / 70, 0, 1);
    ui["input-status"].textContent = sample.peak >= .98 ? "Input is clipping — move a little farther away." : sample.hz && sample.confidence >= .8 ? "Voice detected" : sample.rms > inputProfile.minRms ? "Sound detected — try holding a note." : "Listening — sing a comfortable note.";
    updateCalibration(sample);
    if (!running || sample.contextTime < startedAt) return;
    const delay = Math.max(0, context.currentTime - outputClock());
    const time = C.sampleSongTime(sample.contextTime, delay, startedAt, offset, 0);
    if (time < 0 || time > data.duration) return;
    const value = sample.hz && sample.confidence >= .8 ? C.midi(sample.hz) : null;
    const target = C.targetAt(data.pitch, time);
    const cents = value !== null && target !== null ? (value - target) * 100 : null;
    // Entry/exit hysteresis affects the glow only. Measured pitch is never snapped.
    if (cents !== null && Math.abs(cents) < (stableFrames >= 4 ? 70 : 45)) stableFrames++;
    else stableFrames = 0;
    const aligned = stableFrames >= 4;
    lastPitch = { time, value, aligned, energy: C.inputEnergy(sample.rms, inputProfile), at: performance.now() };
    voice.push(lastPitch);
    while (voice.length && voice[0].time < time - 6) voice.shift();
    const message = value === null ? "Let your voice come through." : target === null ? "Your voice is here." : aligned ? "Together." : cents > 0 ? "Ease a little lower." : "Reach a little higher.";
    if (ui.feedback.textContent !== message) ui.feedback.textContent = message;
  }
  async function action(useMic) {
    if (busy || !data || calibration) return;
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
      const message = error.name === "NotAllowedError" ? "Microphone access wasn’t allowed. Enable it in your browser, or press Play." : error.name === "NotFoundError" ? "No microphone found. Connect one, or press Play." : error.message;
      status(message, epoch === actionEpoch && !document.hidden);
      if (!keepPlaying) running = false;
    } finally { busy = false; controls(); }
  }
  async function toggleMic() {
    if (busy || !record) return;
    if (stream) { micOff(); status(""); return; }
    busy = true; controls();
    const epoch = ++actionEpoch;
    try {
      await ensureContext();
      if (epoch !== actionEpoch || document.hidden) return;
      await enableMic();
      if (epoch !== actionEpoch || document.hidden) { micOff(); return; }
      status("");
    } catch (error) {
      const message = error.name === "NotAllowedError" ? "Microphone access wasn’t allowed. You can still press Play." : error.name === "NotFoundError" ? "No microphone found. Connect one to sing along." : error.message;
      status(message, epoch === actionEpoch && !document.hidden);
    } finally { busy = false; controls(); }
  }
  function configureGate(minRms) { worklet?.port.postMessage({ type: "configure", minRms }); }
  async function refreshInputs() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput" && d.deviceId && !["default", "communications"].includes(d.deviceId));
      ui["input-device"].replaceChildren(new Option("Default microphone", ""), ...devices.map((d, i) => new Option(d.label || `Microphone ${i+1}`, d.deviceId)));
      ui["input-device"].value = requestedDevice;
    } catch { /* Device names are optional; permission/capture errors stay visible. */ }
  }
  function cancelCalibration(message = "Calibration stopped. You can try again.") {
    if (!calibration) return;
    calibration = null; configureGate(inputProfile.minRms);
    ui["calibration-status"].textContent = message; controls();
  }
  function updateCalibration(sample) {
    if (!calibration || !context) return;
    const elapsed = context.currentTime - calibration.startedAt;
    if (sample && elapsed < 5) (elapsed < 2 ? calibration.ambient : calibration.sung).push(sample);
    if (elapsed < 2) ui["calibration-status"].textContent = `Stay quiet for ${Math.ceil(2-elapsed)} seconds…`;
    else if (elapsed < 5) ui["calibration-status"].textContent = `Sing a comfortable steady note — ${Math.ceil(5-elapsed)} seconds…`;
    else {
      const result = C.calibrateInput(calibration.ambient, calibration.sung);
      calibration = null;
      if (result.error) ui["calibration-status"].textContent = result.error;
      else {
        inputProfile = result; inputProfiles.set(inputKey, result);
        ui["calibration-status"].textContent = "Calibrated for this microphone. Ready to sing.";
      }
      configureGate(inputProfile.minRms); controls();
    }
  }
  async function calibrate() {
    if (calibration) { cancelCalibration(); return; }
    if (busy || !record) return;
    pause("");
    if (!stream) await toggleMic();
    if (!stream || document.hidden) return;
    calibration = { startedAt: context.currentTime, ambient: [], sung: [] };
    configureGate(.0003); updateCalibration(); controls();
  }
  function finish() {
    pause(""); offset = data.duration; micOff(); controls();
    status("Finished. Press Replay to start again.");
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
    updateCalibration();
    if (stream && performance.now() - lastInputAt > 1500) { ui["input-meter"].value = 0; ui["input-status"].textContent = "No input arriving. Try another microphone or reconnect."; }
    if (document.hidden || now - lastPaint < (reducedMotion.matches ? 80 : 16)) return;
    const elapsed = Math.min(.05, Math.max(0, (now - lastPaint) / 1000));
    lastPaint = now;
    const time = data ? songTime() : 0;
    if (running && time >= data.duration) { finish(); return; }
    if (data) { ui.seek.value = String(time); ui.time.textContent = formatTime(time); updateLyrics(time); }
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    painter.setTransform(ratio, 0, 0, ratio, 0, 0); painter.clearRect(0, 0, width, height);
    const x = t => width * (.5 + (t - time) / 4.8);
    // Share one scale for both streams, expanding it when a singer is outside
    // the recording's range instead of silently drawing their voice offscreen.
    const recentPitches = stream ? voice.filter(p => p.time >= time - 2.4 && p.value !== null).map(p => p.value) : [];
    const low = Math.min(yLow, ...recentPitches.map(p => p - 3));
    const high = Math.max(yHigh, ...recentPitches.map(p => p + 3));
    const settling = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed * 3);
    viewLow += (low - viewLow) * settling; viewHigh += (high - viewHigh) * settling;
    const y = midi => height - 42 - (midi - viewLow) / (viewHigh - viewLow) * (height - 84);
    const fresh = Boolean(stream && running && lastPitch && lastPitch.value !== null && now - lastPitch.at < 220);
    const together = fresh && lastPitch.aligned;
    const fract = value => value - Math.floor(value);
    const palette = ["#529eac", "#609aaa", "#639bb1"];
    const count = reducedMotion.matches ? 480 : Math.min(1900, Math.round(width * 1.9));

    // The particle field IS the chart: x maps to song time, y to vocal pitch,
    // and thickness to measured vocal energy. Silence returns to a
    // thin baseline. There is no independent chart line or playhead dot.
    // Anchor samples to source time too: a sliding screen-space sampling grid
    // otherwise changes the interpolated shape of an approaching pitch bend.
    const fieldStep = 4.8 / 256;
    const fieldStart = Math.floor((time - 2.4) / fieldStep) * fieldStep - fieldStep;
    for (let i = 0; i < flowTargets.length; i++) {
      const t = fieldStart + i * fieldStep;
      const target = data ? C.targetAt(data.pitch, t) : null;
      const energy = data ? C.energyAt(data.vocalEnvelope, t) : 0;
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
    const focus = u => Math.exp(-(((u - .5) * width / 24) ** 2));
    function fieldAt(field, u) {
      const bin = C.clamp((time + (u - .5) * 4.8 - fieldStart) / fieldStep, 0, field.length - 1);
      const left = Math.floor(bin), fraction = bin - left;
      return field[left] * (1 - fraction) + field[Math.min(left + 1, field.length - 1)] * fraction;
    }
    function current(u, lane) {
      const center = fieldAt(flowField, u), energy = fieldAt(flowEnergy, u);
      // Geometry belongs to the recording. No independent oscillation can
      // reshape a future note; the whole field travels with the audio clock.
      return center + lane * (1.1 + energy * 16);
    }
    painter.lineCap = "round"; painter.lineJoin = "round";
    for (let strand = 0; strand < 14; strand++) {
      const lane = (strand / 13 - .5) * 2;
      painter.strokeStyle = palette[strand % palette.length];
      for (let section = 0; section < 64; section++) {
        painter.beginPath();
        for (let step = 0; step <= 16; step++) {
          const u = (section + step / 16) / 64;
          if (!step) painter.moveTo(u * width, current(u, lane)); else painter.lineTo(u * width, current(u, lane));
        }
        const u = (section + .5) / 64;
        painter.globalAlpha = envelope(u) * ((u > .5 ? .025 : .045) + focus(u) * .38);
        painter.strokeStyle = focus(u) > .2 ? "#237d8f" : palette[strand % palette.length];
        painter.lineWidth = .85 + focus(u) * .35; painter.stroke();
      }
    }
    for (let i = 0; i < count; i++) {
      const seed = fract(i * .61803398875), lane = (fract(i * .754877666) - .5) * 2;
      const depth = fract(i * .569840291);
      const position = fract(seed - time / 4.8);
      // Particles travel at exactly the chart speed. A narrow, high-contrast
      // section of the stream marks NOW without a separate dot or cursor.
      const u = position;
      const strength = fieldAt(flowEnergy, u), focal = focus(u);
      const opacity = envelope(u) * ((u > .5 ? .025 : .04) + (1 - Math.abs(lane)) * .035 + focal * .38);
      painter.fillStyle = painter.strokeStyle = focal > .2 ? (together ? "#8d70b1" : "#237d8f") : palette[i % palette.length];
      // Fine, continuous trails carry the texture. Sample along the pitch field
      // so a trail follows bends rather than cutting diagonally across them.
      const tail = .014 + depth * (.014 + strength * .008);
      painter.globalAlpha = opacity;
      painter.lineWidth = .65 + depth * .3;
      painter.beginPath();
      for (let step = 0; step <= 5; step++) {
        const at = Math.min(1, u + tail * step / 5);
        if (!step) painter.moveTo(at * width, current(at, lane));
        else painter.lineTo(at * width, current(at, lane));
      }
      painter.stroke();
      // A faint subpixel head keeps the particles alive without visible grains.
      painter.globalAlpha = opacity * .22;
      const size = .28 + depth * .22;
      painter.beginPath(); painter.arc(u * width, current(u, lane), size, 0, Math.PI * 2); painter.fill();
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
        const position = fract(i * .61803398875 + time / 2.4);
        const age = position * 2.4;
        const t = time - age, point = voiceAt(t);
        const lane = fract(i * .754877666) - .5;
        const px = x(t), py = point.y + lane * (point.pitched ? 7 + point.energy * 16 : 2 + point.energy * 5);
        const opacity = (.3 + .7 * (1 - age / 2.4)) * (point.pitched ? .28 : .12);
        painter.globalAlpha = opacity;
        painter.fillStyle = painter.strokeStyle = point.aligned ? "#a45496" : "#c76082";
        {
          const tailTime = Math.max(time - 2.4, t - .065), tail = voiceAt(tailTime);
          // A rest is a rest: never connect the neutral baseline to a note.
          if (tail.pitched === point.pitched && Math.abs(tail.y - point.y) < 25) {
            painter.lineWidth = .85;
            painter.beginPath(); painter.moveTo(x(tailTime), tail.y + lane * (point.pitched ? 7 + tail.energy * 16 : 2 + tail.energy * 5));
            painter.lineTo(px, py); painter.stroke();
          }
        }
        painter.globalAlpha = opacity * .22;
        painter.beginPath(); painter.arc(px, py, .3 + fract(i * .4142) * .2, 0, Math.PI * 2); painter.fill();
      }
    }
    painter.globalAlpha = 1;
  }

  async function selectRecord(key) {
    if (busy) return;
    const selected = records.find(r => r.key === key) || records[0];
    const epoch = ++loadEpoch;
    pause(""); micOff(); busy = true; data = null; buffers = null; offset = 0; lastLine = -2;
    record = selected; controls(); status("Loading this record…");
    ui["song-title"].textContent = selected.title; ui.artist.textContent = selected.artist;
    ui.portrait.src = selected.photo;
    ui["lyric-current"].textContent = "A little room for your voice."; ui["lyric-next"].textContent = "";
    try {
      const response = await fetch(`${selected.practice}?v=particle-chart-1`);
      if (response.status === 451) throw new Error("This rendition is available for listening in the United States only.");
      if (!response.ok) throw new Error("This record’s practice data couldn’t load. Reload the page to try again.");
      const result = await response.json();
      if (epoch !== loadEpoch) return;
      if (result.sourceHash !== selected.sourceHash || result.lyrics.sourceHash !== selected.sourceHash) throw new Error("The lyrics don’t match this recording. Please use the record preview.");
      data = result;
      ui.seek.max = String(data.duration); ui.duration.textContent = formatTime(data.duration);
      const pitches = data.pitch.filter(p => p[1] !== null && p[2] >= .5).map(p => p[1]).sort((a, b) => a - b);
      yLow = Math.floor(pitches[Math.floor(pitches.length * .02)] || 45) - 4;
      yHigh = Math.max(yLow + 16, Math.ceil(pitches[Math.floor(pitches.length * .98)] || 78) + 4);
      viewLow = yLow; viewHigh = yHigh;
      document.title = `${selected.title} — Sing with Resonance`;
      const url = new URL(location.href); url.searchParams.set("song", selected.key); history.replaceState(null, "", url);
      status(""); updateLyrics(0);
    } catch (error) { status(error.message, true); }
    finally { busy = false; controls(); }
  }
  ui.sing.addEventListener("click", toggleMic);
  ui.calibrate.addEventListener("click", calibrate);
  ui["input-device"].addEventListener("change", async () => {
    const wasOn = Boolean(stream); requestedDevice = ui["input-device"].value;
    micOff(); ui["calibration-status"].textContent = "Calibrate to match your room and singing volume.";
    if (wasOn) await toggleMic();
  });
  ui.listen.addEventListener("click", () => action(Boolean(stream)));
  $("settings-toggle").addEventListener("click", () => {
    const panel = $("practice-settings"); panel.hidden = !panel.hidden;
    $("settings-toggle").setAttribute("aria-expanded", String(!panel.hidden));
    if (panel.hidden) cancelCalibration(); else refreshInputs();
  });
  ui.seek.addEventListener("input", () => { seek(Number(ui.seek.value)); controls(); });
  ui.backing.addEventListener("input", () => gains?.[0].gain.setTargetAtTime(Number(ui.backing.value), context.currentTime, .03));
  ui.guide.addEventListener("input", () => gains?.[1].gain.setTargetAtTime(Number(ui.guide.value), context.currentTime, .03));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { actionEpoch++; pause("Paused while you were away. Press resume to continue."); micOff(); } });
  window.addEventListener("pagehide", () => { actionEpoch++; pause(""); micOff(); context?.close(); context = null; buffers = null; workletLoaded = false; });
  navigator.mediaDevices?.addEventListener("devicechange", refreshInputs);
  requestAnimationFrame(render);
  fetch("practice/records.json?v=classics-20260912", { cache: "no-store" }).then(response => { if (!response.ok) throw new Error("Couldn’t load the records. Please reload."); return response.json(); }).then(async list => {
    records = list;
    await selectRecord(new URL(location.href).searchParams.get("song"));
  }).catch(error => status(error.message, true));
})();
