import "./practice-core.js";

class VocalPitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(2048);
    this.scratch = new Float32Array(1025);
    this.position = 0;
    this.total = 0;
    this.sinceReport = 0;
    this.stride = Math.max(1, Math.floor(sampleRate / 22050));
    this.decimationCount = 0;
    this.accumulator = 0;
    this.frame = new Float32Array(2048);
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const value of input) {
      this.accumulator += value;
      if (++this.decimationCount < this.stride) continue;
      this.samples[this.position] = this.accumulator / this.stride;
      this.accumulator = 0; this.decimationCount = 0;
      this.position = (this.position + 1) % this.samples.length;
      this.total++; this.sinceReport++;
    }
    if (this.total >= this.samples.length && this.sinceReport >= 1024) {
      this.sinceReport = 0;
      for (let i = 0; i < this.frame.length; i++) this.frame[i] = this.samples[(this.position + i) % this.samples.length];
      const rate = sampleRate / this.stride;
      this.port.postMessage({ ...globalThis.ResonanceCore.detectPitch(this.frame, rate, this.scratch),
        contextTime: (currentFrame + input.length) / sampleRate - this.frame.length / rate / 2 });
    }
    // Outputs stay silent: never monitor the live microphone through the speakers.
    return true;
  }
}
registerProcessor("vocal-pitch", VocalPitchProcessor);
