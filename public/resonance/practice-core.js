/* Shared, deterministic audio/timeline functions. No microphone data leaves the page. */
"use strict";
globalThis.ResonanceCore = (() => {
  function detectPitch(samples, rate, scratch, minRms = .002) {
    let energy = 0, mean = 0, peak = 0;
    for (const s of samples) mean += s;
    mean /= samples.length;
    for (const s of samples) { energy += (s - mean) ** 2; peak = Math.max(peak, Math.abs(s)); }
    const rms = Math.sqrt(energy / samples.length);
    if (rms < Math.max(.0001, minRms)) return { hz: null, confidence: 0, rms, peak };
    const minLag = Math.floor(rate / 1100), maxLag = Math.min(Math.ceil(rate / 65), samples.length >> 1);
    const diff = scratch || new Float32Array(maxLag + 1);
    const width = samples.length - maxLag;
    let running = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < width; i++) sum += (samples[i] - samples[i + lag]) ** 2;
      running += sum;
      diff[lag] = running > 0 ? sum * lag / running : 1;
    }
    let lag = minLag;
    while (lag < maxLag) {
      if (diff[lag] < 0.15) {
        while (lag + 1 < maxLag && diff[lag + 1] < diff[lag]) lag++;
        const left = diff[lag - 1], mid = diff[lag], right = diff[lag + 1];
        const denom = 2 * (2 * mid - right - left);
        const refined = lag + (denom ? (right - left) / denom : 0);
        return { hz: rate / refined, confidence: 1 - mid, rms, peak };
      }
      lag++;
    }
    return { hz: null, confidence: 0, rms, peak };
  }
  const midi = hz => 69 + 12 * Math.log2(hz / 440);
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  function calibrateInput(ambient, sung) {
    const percentile = (values, fraction) => [...values].sort((a,b)=>a-b)[Math.min(values.length-1, Math.floor(values.length*fraction))];
    if (ambient.length < 15 || sung.length < 25) return { error: "Not enough microphone input. Check your microphone and try again." };
    if (sung.filter(s => s.peak >= .98).length > sung.length * .1) return { error: "Your input is clipping. Move a little farther from the microphone and try again." };
    const noise = percentile(ambient.map(s => s.rms), .95);
    const voiced = sung.filter(s => s.hz && s.confidence >= .8 && s.rms > Math.max(.0003, noise * 2));
    if (voiced.length < 12) return { error: "Couldn’t hear a clear note. Try a quieter room, move closer, or choose another microphone." };
    const level = percentile(voiced.map(s => s.rms), .5);
    return { minRms: Math.max(.0003, Math.min(level * .45, noise * 2.5)), level: Math.max(.002, level), noise };
  }
  function inputEnergy(rms, profile) {
    return Math.sqrt(clamp((rms-profile.minRms)/Math.max(.002,profile.level-profile.minRms),0,1));
  }
  function before(items, time, getTime = x => x.start) {
    let left = 0, right = items.length;
    while (left < right) { const mid = (left + right) >> 1; if (getTime(items[mid]) <= time) left = mid + 1; else right = mid; }
    return left - 1;
  }
  function targetAt(points, time) {
    const index = before(points, time, p => p[0]);
    const p = points[index], next = points[index + 1];
    if (!p || p[1] === null || p[2] < .5 || time - p[0] > .04) return null;
    if (!next || next[1] === null || next[2] < .5 || next[0] - p[0] > .04) return p[1];
    return p[1] + (next[1] - p[1]) * clamp((time - p[0]) / (next[0] - p[0]), 0, 1);
  }
  function energyAt(envelope, time) {
    if (!envelope || time < 0 || time >= envelope.rms.length * envelope.step) return 0;
    const position = time / envelope.step, index = Math.floor(position);
    const a = envelope.rms[index], b = envelope.rms[Math.min(index + 1, envelope.rms.length - 1)];
    const rms = a + (b - a) * (position - index);
    // An absolute floor prevents stem bleed from making silence look loud.
    return Math.sqrt(clamp((rms - .004) / Math.max(.02, envelope.peak - .004), 0, 1));
  }
  function wordState(word, time) {
    if (word.uncertain || word.end <= word.start) return "uncertain";
    if (time >= word.end) return "sung";
    if (time >= word.start) return "active";
    return "";
  }
  function lyricLineAt(lines, time) {
    let index = before(lines, time);
    const next = lines[index + 1];
    // A short entrance preview must never replace a line that is still sung.
    if (next && next.start - time <= .75 && (index < 0 || time >= lines[index].end)) index++;
    if (index >= 0 && time > lines[index].end + 1 && (!lines[index + 1] || lines[index + 1].start - time > 1.5)) return -1;
    return index;
  }
  function sampleSongTime(sampleContextTime, outputDelay, startContextTime, offset, adjustmentMs) {
    return sampleContextTime - outputDelay - startContextTime + offset - adjustmentMs / 1000;
  }
  return { detectPitch, calibrateInput, inputEnergy, midi, clamp, before, targetAt, energyAt, wordState, lyricLineAt, sampleSongTime };
})();
