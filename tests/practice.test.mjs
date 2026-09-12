import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = process.env.RESONANCE_PUBLIC || path.join(root, 'public/resonance');
const sandbox = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(publicDir, 'practice-core.js'), 'utf8'), sandbox);
const C = sandbox.ResonanceCore;

test('pitch tracks vocal range at real device sample rates without octave folding', () => {
  for (const rate of [22050, 24000, 48000]) {
    for (const hz of [80, 110, 164.81, 220, 440, 659.25, 880]) {
      const tone = Float32Array.from({length:2048}, (_, i) => .17 * Math.sin(2*Math.PI*hz*i/rate) + .08 * Math.sin(4*Math.PI*hz*i/rate));
      const detected = C.detectPitch(tone, rate);
      assert.ok(detected.hz, `no pitch for ${hz} @ ${rate}`);
      assert.ok(Math.abs(1200 * Math.log2(detected.hz/hz)) < 8, `${hz} @ ${rate} => ${detected.hz}`);
      assert.ok(detected.confidence > .8);
    }
  }
});
test('silence, DC, and broadband noise do not become a singing pitch', () => {
  assert.equal(C.detectPitch(new Float32Array(2048),24000).hz,null);
  assert.equal(C.detectPitch(new Float32Array(2048).fill(.2),24000).hz,null);
  let seed=72;
  const noise=Float32Array.from({length:2048},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2**32-.5)*.3;});
  assert.equal(C.detectPitch(noise,24000).hz,null);
});
test('reference lookup preserves silence, confidence gates and measured microtones', () => {
  const points=[[0,60.1,.9],[.01,60.3,.9],[.02,null,.1],[.03,62,.1],[.04,62.4,.9]];
  assert.ok(Math.abs(C.targetAt(points,.005)-60.2)<1e-9);
  assert.equal(C.targetAt(points,-1),null);
  assert.equal(C.targetAt(points,.025),null);
  assert.equal(C.targetAt(points,.035),null);
  assert.equal(C.targetAt(points,1),null);
});
test('karaoke boundaries are half-open and uncertain words never fake a highlight', () => {
  const w={start:2,end:2.5,uncertain:false};
  assert.equal(C.wordState(w,1.99),'');
  assert.equal(C.wordState(w,2),'active');
  assert.equal(C.wordState(w,2.5),'sung');
  assert.equal(C.wordState({...w,uncertain:true},2.2),'uncertain');
  assert.equal(C.wordState({...w,end:2},2),'uncertain');
});
test('capture timestamps include output delay, seek offset, and manual correction', () => {
  assert.ok(Math.abs(C.sampleSongTime(100.2,.08,95,40,100)-45.02)<1e-9);
  assert.equal(C.before([{start:1},{start:2},{start:4}],2),1);
});
test('upcoming lyrics do not cut off a sung word and release into instrumental gaps', () => {
  const lines=[{start:2,end:4},{start:4.2,end:6},{start:10,end:12}];
  assert.equal(C.lyricLineAt(lines,0),-1);
  assert.equal(C.lyricLineAt(lines,1.5),0);
  assert.equal(C.lyricLineAt(lines,3.99),0);
  assert.equal(C.lyricLineAt(lines,4.1),1);
  assert.equal(C.lyricLineAt(lines,8),-1);
  assert.equal(C.lyricLineAt(lines,13.5),-1);
});
test('every published recording has matched stems, valid word times, and scoring disabled', () => {
  const records=JSON.parse(fs.readFileSync(path.join(publicDir,'practice/records.json')));
  assert.equal(records.length,4);
  for(const record of records){
    for(const key of ['photo','lyricsText','practice','vocals','backing'])assert.ok(fs.existsSync(path.join(publicDir,record[key])),record[key]);
    const data=JSON.parse(fs.readFileSync(path.join(publicDir,record.practice)));
    assert.equal(data.sourceHash,record.sourceHash);assert.equal(data.lyrics.sourceHash,record.sourceHash);
    assert.equal(data.scoringEnabled,false);assert.equal(data.reviewState,'needs_review');
    assert.ok(data.pitch.length>10000);assert.ok(data.lyrics.lines.length>30);
    let end=0;
    for(const line of data.lyrics.lines){
      assert.ok(line.end>line.start,`${record.key}: empty line`);
      assert.ok(line.start>=end-.001,`${record.key}: line overlap at ${line.text}`);
      assert.ok(line.end<=data.duration+.03,`${record.key}: cue outside audio`);
      end=line.end;
      for(const word of line.words){assert.ok(Number.isFinite(word.start)&&Number.isFinite(word.end));assert.ok(word.start>=line.start-.001&&word.end<=line.end+.001);assert.ok(word.end>=word.start);}
    }
  }
});
