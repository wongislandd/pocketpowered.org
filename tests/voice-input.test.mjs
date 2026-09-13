import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = process.env.RESONANCE_PUBLIC || path.join(root, 'public/resonance');
const core = fs.readFileSync(path.join(publicDir, 'practice-core.js'), 'utf8');
const box = vm.createContext({}); vm.runInContext(core, box);
const C = box.ResonanceCore;

test('quiet pitched input survives while noise and silence remain unpitched', () => {
  const tone = Float32Array.from({length:2048}, (_,i)=>.006*Math.sin(2*Math.PI*220*i/24000));
  assert.ok(Math.abs(C.detectPitch(tone,24000).hz-220)<1);
  assert.equal(C.detectPitch(tone,24000,undefined,.01).hz,null);
  assert.equal(C.detectPitch(new Float32Array(2048),24000,undefined,.0003).hz,null);
  let seed=43;
  const noise=Float32Array.from({length:2048},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2**32-.5)*.04;});
  assert.equal(C.detectPitch(noise,24000,undefined,.0003).hz,null);
});

test('calibration needs a clear voice above room noise and refuses clipping', () => {
  const ambient=Array.from({length:40},()=>({rms:.0002,peak:.0004,hz:null,confidence:0}));
  const sung=Array.from({length:60},()=>({rms:.004,peak:.008,hz:220,confidence:.97}));
  const profile=C.calibrateInput(ambient,sung);
  assert.ok(!profile.error);assert.ok(profile.minRms>.0002&&profile.minRms<.001);
  assert.equal(C.inputEnergy(.0002,profile),0);assert.equal(C.inputEnergy(.004,profile),1);
  assert.match(C.calibrateInput([],sung).error,/Not enough/);
  assert.match(C.calibrateInput(ambient,sung.map(s=>({...s,hz:null}))).error,/clear note/);
  assert.match(C.calibrateInput(ambient.map(s=>({...s,rms:.003})),sung).error,/clear note/);
  assert.match(C.calibrateInput(ambient,sung.map(s=>({...s,peak:1}))).error,/clipping/);
});

test('actual worklet reports input at common device sample rates and honors calibration', () => {
  for(const rate of [16000,44100,48000]) {
    const messages=[]; let Processor;
    class Base { port={postMessage:message=>messages.push(message)}; }
    const runtime=vm.createContext({sampleRate:rate,currentFrame:0,AudioWorkletProcessor:Base,registerProcessor:(_name,cls)=>{Processor=cls;}});
    vm.runInContext(core,runtime);
    vm.runInContext(fs.readFileSync(path.join(publicDir,'pitch-worklet.mjs'),'utf8').replace(/^import[^\n]+\n/,''),runtime);
    const processor=new Processor();let frame=0;
    const feed=()=>{for(let i=0;i<Math.ceil(rate/128);i++){
      runtime.currentFrame=frame;
      const input=Float32Array.from({length:128},(_,j)=>.006*Math.sin(2*Math.PI*220*(frame+j)/rate));
      const output=new Float32Array(128);
      assert.equal(processor.process([[input]],[[output]]),true);
      assert.ok(output.every(v=>v===0),'microphone must never play through speakers');
      frame+=128;
    }};
    feed();assert.ok(messages.length>10);assert.ok(Math.abs(messages.at(-1).hz-220)<2);
    assert.ok(messages.at(-1).rms>0);assert.ok(messages.at(-1).peak>0);
    processor.port.onmessage({data:{type:'configure',minRms:.02}});feed();
    assert.equal(messages.at(-1).hz,null);
    processor.port.onmessage({data:{type:'configure',minRms:.0005}});feed();
    assert.ok(Math.abs(messages.at(-1).hz-220)<2);
    assert.ok(messages.every(m=>Number.isFinite(m.contextTime)));
  }
});
