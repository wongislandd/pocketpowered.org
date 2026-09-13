import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=process.env.RESONANCE_PUBLIC || path.join(root,'public/resonance');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness({denyMic=false,deferAudio=false,reducedMotion=false,width=950,fixture=null}={}){
  class Element {
    value=''; textContent=''; hidden=false; disabled=false; handlers={}; children=[]; attributes={};
    addEventListener(event,fn){this.handlers[event]=fn;}
    async fire(event){await this.handlers[event]?.({target:this});await flush();}
    replaceChildren(...children){this.children=children;}
    append(...children){this.children.push(...children);}
    add(child){this.children.push(child);}
    setAttribute(k,v){this.attributes[k]=v;}
  }
  const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  let drawn=[];
  const ctx2d=new Proxy({},{get:(_target,key)=>{
    if (['arc','moveTo','lineTo'].includes(key)) return (...values)=>{
      assert.ok(values.every(Number.isFinite),'canvas geometry must stay finite');
      if(key==='arc'){values.color=_target.fillStyle;values.alpha=_target.globalAlpha;drawn.push(values);}
    };
    return ()=>{};
  }});
  Object.assign(get('ribbon'),{clientWidth:width,clientHeight:218,getContext:()=>ctx2d});
  for(const [k,v] of Object.entries({backing:'.8',guide:'.55',timing:'0',seek:'0'}))get(k).value=v;
  get('practice-settings').hidden=true;
  const sources=[],streams=[],worklets=[],contexts=[];let releaseAudio;
  const audioGate=deferAudio?new Promise(resolve=>{releaseAudio=resolve;}):Promise.resolve();
  class AudioContext {
    currentTime=10; state='running'; destination={}; handlers={};
    audioWorklet={addModule:async()=>{}};
    constructor(){contexts.push(this);}
    async resume(){this.state='running';}
    async close(){this.state='closed';}
    getOutputTimestamp(){return {contextTime:this.currentTime-.02,performanceTime:1000};}
    addEventListener(event,fn){this.handlers[event]=fn;}
    createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){return this;},disconnect(){}};}
    createMediaStreamSource(){return {connect(){return this;},disconnect(){}};}
    async decodeAudioData(){await audioGate;return {duration:120.024};}
    createBufferSource(){const s={connect(){},disconnect(){},start(time,offset){this.started=[time,offset];},stop(){this.stopped=true;}};sources.push(s);return s;}
  }
  class AudioWorkletNode {
    port={onmessage:null,messages:[],postMessage(message){this.messages.push(message);}};constructor(){worklets.push(this);}connect(){return this;}disconnect(){}
  }
  const media={handlers:{},addEventListener(event,fn){this.handlers[event]=fn;},async enumerateDevices(){return [{kind:'audioinput',deviceId:'built-in',label:'Built-in microphone'},{kind:'audioinput',deviceId:'usb',label:'USB microphone'}];},async getUserMedia(options){
    if(denyMic)throw Object.assign(new Error('denied'),{name:'NotAllowedError'});
    const track={stopped:false,getSettings:()=>({deviceId:options.audio.deviceId?.exact||'built-in'}),stop(){this.stopped=true;}};const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};streams.push(stream);return stream;
  }};
  const document={hidden:false,handlers:{},getElementById:get,createElement:()=>new Element(),addEventListener(event,fn){this.handlers[event]=fn;}};
  const window={AudioContext,handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}};
  let frame;
  const box=vm.createContext({console,window,document,navigator:{mediaDevices:media},location:{href:'https://example.com/practice.html?song=chmunk'},history:{replaceState(){}},URL,performance:{now:()=>1000},devicePixelRatio:1,AudioWorkletNode,Option:class extends Element{constructor(text,value){super();this.textContent=text;this.value=value;}},matchMedia:()=>({matches:reducedMotion}),requestAnimationFrame:fn=>{frame=fn;},fetch:async url=>{
    const file=path.join(publicDir,url.split('?')[0]);
    return {ok:fs.existsSync(file),json:async()=>{const result=JSON.parse(fs.readFileSync(file));return fixture&&result.pitch?{...result,...fixture}:result;},arrayBuffer:async()=>new ArrayBuffer(8)};
  }});
  vm.runInContext(fs.readFileSync(path.join(publicDir,'practice-core.js'),'utf8'),box);
  vm.runInContext(fs.readFileSync(path.join(publicDir,'practice.js'),'utf8'),box);
  return {get,sources,streams,worklets,contexts,document,window,media,releaseAudio,paint:(now=2000)=>{drawn=[];frame(now);return drawn;}};
}

test('listen, pause, seek and resume keep both stems on one clock',async()=>{
  const h=harness();await flush();
  assert.equal(h.get('sing').disabled,false);
  await h.get('listen').fire('click');
  assert.equal(h.sources.length,2);assert.deepEqual(h.sources[0].started,h.sources[1].started);
  assert.equal(h.streams.length,0,'listen must never request a microphone');
  h.contexts[0].currentTime=20;
  await h.get('listen').fire('click');assert.ok(h.sources.every(s=>s.stopped));
  h.get('seek').value='55';await h.get('seek').fire('input');
  await h.get('listen').fire('click');
  assert.equal(h.sources[2].started[1],55);assert.deepEqual(h.sources[2].started,h.sources[3].started);
  h.paint();
});
test('denied mic offers listening without leaving a live capture or starting audio',async()=>{
  const h=harness({denyMic:true});await flush();await h.get('sing').fire('click');
  assert.match(h.get('status').textContent,/wasn’t allowed/);assert.equal(h.sources.length,0);assert.equal(h.get('listen').disabled,false);
  await h.get('listen').fire('click');assert.equal(h.sources.length,2);
});
test('live voice is drawn from measured samples and hiding the page releases the microphone',async()=>{
  const h=harness();await flush();await h.get('sing').fire('click');
  assert.equal(h.streams.length,1);assert.equal(h.get('sing').attributes['aria-pressed'],'true');
  await h.get('listen').fire('click');
  h.contexts[0].currentTime=20;
  h.worklets[0].port.onmessage({data:{contextTime:19.95,hz:220,confidence:.99,rms:.15}});
  h.paint();
  h.document.hidden=true;h.document.handlers.visibilitychange();
  assert.equal(h.streams[0].getTracks()[0].stopped,true);assert.equal(h.get('sing').attributes['aria-pressed'],'false');assert.ok(h.sources.every(s=>s.stopped));
});
test('backgrounding during audio preparation cannot start playback afterward',async()=>{
  const h=harness({deferAudio:true});await flush();
  h.get('listen').handlers.click();await flush();
  h.document.hidden=true;h.document.handlers.visibilitychange();h.releaseAudio();await flush();await flush();
  assert.equal(h.sources.length,0);assert.match(h.get('status').textContent,/Paused/);
});

test('the decorative current keeps flowing while paused at desktop and mobile sizes',async()=>{
  for(const width of [390,1100]){
    const h=harness({width});await flush();
    const first=h.paint(2000),next=h.paint(2017);
    assert.ok(first.length>600,'a populated current exists before playback');
    assert.equal(next.length,first.length);
    let movingLeft=0;
    for(let i=0;i<first.length-1;i++){
      if(next[i][0]<first[i][0]) movingLeft++;
      assert.ok(Math.abs(next[i][1]-first[i][1])<8,'neighboring frames follow a smooth field');
    }
    assert.ok(movingLeft>first.length*.95,'particles advect together through the viewport');
    assert.equal(h.sources.length,0);assert.equal(h.streams.length,0);
  }
});
test('reduced motion keeps the idle current still across frames',async()=>{
  const h=harness({reducedMotion:true});await flush();
  assert.deepEqual(h.paint(2000),h.paint(2100));
});

test('particles form the centered chart and vocal energy flattens silence',async()=>{
  const pitch=Array.from({length:12001},(_,i)=>[i*.01,72,.99]);
  for(const loudness of [0,.003,.25]){
    const h=harness({fixture:{pitch,vocalEnvelope:{step:.02,peak:.25,rms:Array(6002).fill(loudness)}}});await flush();
    h.get('seek').value='10';await h.get('seek').fire('input');
    await h.get('listen').fire('click');
    let frame;
    for(let t=2000;t<3200;t+=50)frame=h.paint(t);
    const center=frame.filter(p=>Math.abs(p[0]-475)<40);
    assert.ok(center.length>frame.length*.3,'the current moment is concentrated at the center');
    assert.ok(frame.every(p=>p[2]<1.5),'there is no separate large playhead dot');
    const low=Math.min(...center.map(p=>p[1])), high=Math.max(...center.map(p=>p[1]));
    if(loudness<.004){assert.ok(high-low<3,'silence and low stem bleed form a flat stream');}
    else{
      assert.ok(high-low>20,'strong vocals expand the particle wave');
      const mean=center.reduce((sum,p)=>sum+p[1],0)/center.length;
      assert.ok(Math.abs(mean-142.5)<6,'the particle body itself follows the reference pitch');
    }
  }
});

test('the You stream remains visible between notes and is absent when the mic is off',async()=>{
  const h=harness();await flush();
  const pink=frame=>frame.filter(p=>p.color==='#c76082'||p.color==='#a45496');
  assert.equal(pink(h.paint(1000)).length,0);
  await h.get('sing').fire('click');
  await h.get('listen').fire('click');
  let particles=pink(h.paint(1100));
  assert.ok(particles.length>500,'mic presence is a continuous stream before a pitch is detected');
  assert.ok(Math.max(...particles.map(p=>p[1]))-Math.min(...particles.map(p=>p[1]))<3);
  h.contexts[0].currentTime=20;
  h.worklets[0].port.onmessage({data:{contextTime:19.95,hz:null,confidence:0,rms:.002}});
  assert.ok(pink(h.paint(1200)).length>500);
  await h.get('sing').fire('click');
  assert.equal(pink(h.paint(1300)).length,0);
});
test('quiet valid low notes stay visible inside the shared chart range',async()=>{
  const h=harness();await flush();await h.get('sing').fire('click');await h.get('listen').fire('click');
  h.contexts[0].currentTime=20;
  h.worklets[0].port.onmessage({data:{contextTime:19.95,hz:80,confidence:.99,rms:.009}});
  let frame;
  for(let t=2000;t<2800;t+=50)frame=h.paint(t);
  const pink=frame.filter(p=>p.color==='#c76082');
  assert.ok(pink.every(p=>p[1]>0&&p[1]<218),'voice outside the song range must not disappear offscreen');
  assert.ok(pink.filter(p=>p[1]>160).length>40,'the low measured note is visibly different from the neutral baseline');
});


test('mic toggle is independent of playback and Play pauses both stems with mic enabled',async()=>{
  const h=harness();await flush();
  await h.get('sing').fire('click');
  assert.equal(h.sources.length,0,'enabling the mic must not start the song');
  assert.equal(h.get('listen').attributes['aria-label'],'Play');
  await h.get('listen').fire('click');
  assert.equal(h.sources.length,2);
  assert.equal(h.get('listen').attributes['aria-label'],'Pause');
  await h.get('sing').fire('click');
  assert.equal(h.streams[0].getTracks()[0].stopped,true);
  assert.equal(h.sources.length,2);assert.ok(h.sources.every(s=>!s.stopped));
  await h.get('sing').fire('click');
  assert.equal(h.sources.length,2,'toggling mic must not restart the backing track');
  await h.get('listen').fire('click');
  assert.ok(h.sources.every(s=>s.stopped));
  assert.equal(h.get('sing').attributes['aria-pressed'],'true');
  assert.equal(h.get('listen').attributes['aria-label'],'Play');
  assert.match(h.get('status').className,/sr-only/,'routine status must not add a visual row');
});
test('mic denial during playback keeps audio playing and shows a useful error',async()=>{
  const h=harness({denyMic:true});await flush();await h.get('listen').fire('click');
  await h.get('sing').fire('click');
  assert.ok(h.sources.every(s=>!s.stopped));assert.equal(h.sources.length,2);
  assert.equal(h.get('listen').attributes['aria-label'],'Pause');assert.equal(h.get('status').className,'status');
});
test('settings reveal secondary tools and completion uses the same Replay button',async()=>{
  const h=harness();await flush();
  await h.get('settings-toggle').fire('click');
  assert.equal(h.get('practice-settings').hidden,false);
  assert.equal(h.get('settings-toggle').attributes['aria-expanded'],'true');
  await h.get('settings-toggle').fire('click');
  assert.equal(h.get('practice-settings').hidden,true);
  await h.get('listen').fire('click');h.sources[0].onended();
  assert.equal(h.get('listen').attributes['aria-label'],'Replay');
  await h.get('listen').fire('click');assert.equal(h.sources[2].started[1],0);
});


test('input meter and mic setup work while paused without downloading playback audio',async()=>{
  const h=harness({deferAudio:true});await flush();await h.get('sing').fire('click');
  assert.equal(h.streams.length,1);assert.equal(h.sources.length,0);
  h.worklets[0].port.onmessage({data:{contextTime:10,hz:220,confidence:.99,rms:.004,peak:.006}});
  assert.ok(h.get('input-meter').value>0);assert.equal(h.get('input-status').textContent,'Voice detected');
  assert.equal(h.get('sing').attributes['aria-label'],'Mute microphone');
  await h.get('sing').fire('click');assert.equal(h.get('input-meter').value,0);
  assert.equal(h.get('sing').attributes['aria-label'],'Unmute microphone');
});
test('calibration measures quiet then sung input and configures the worklet',async()=>{
  const h=harness();await flush();await h.get('calibrate').fire('click');
  assert.equal(h.get('listen').disabled,true);assert.equal(h.sources.length,0);
  const feed=(elapsed,rms,hz)=>{h.contexts[0].currentTime=10+elapsed;h.worklets[0].port.onmessage({data:{contextTime:10+elapsed,rms,peak:rms*2,hz,confidence:hz?.99:0}});};
  for(let i=0;i<40;i++)feed(i*.05,.0002,null);
  for(let i=0;i<60;i++)feed(2+i*.05,.004,220);
  h.contexts[0].currentTime=15.1;h.paint();
  assert.match(h.get('calibration-status').textContent,/Calibrated/);
  const setting=h.worklets[0].port.messages.at(-1);
  assert.ok(setting.minRms<.002&&setting.minRms>.0002);
  assert.equal(h.get('listen').disabled,false);assert.equal(h.get('calibrate').textContent,'Calibrate');
});
test('backgrounding cancels calibration, and device-list updates do not kill an active mic',async()=>{
  const h=harness();await flush();await h.get('sing').fire('click');await h.get('listen').fire('click');
  await h.media.handlers.devicechange();
  assert.equal(h.streams[0].getTracks()[0].stopped,false);assert.ok(h.sources.every(s=>!s.stopped));
  h.get('input-device').value='usb';await h.get('input-device').fire('change');
  assert.equal(h.streams[0].getTracks()[0].stopped,true);
  assert.equal(h.streams[1].getAudioTracks()[0].getSettings().deviceId,'usb');
  assert.ok(h.sources.every(s=>!s.stopped));
  await h.get('calibrate').fire('click');
  h.document.hidden=true;h.document.handlers.visibilitychange();
  assert.equal(h.streams[1].getTracks()[0].stopped,true);assert.equal(h.get('calibrate').textContent,'Calibrate');
  assert.match(h.get('calibration-status').textContent,/stopped/);
});
test('missing calibration samples report a problem instead of accepting an empty microphone',async()=>{
  const h=harness();await flush();await h.get('calibrate').fire('click');
  h.contexts[0].currentTime=16;h.paint();
  assert.match(h.get('calibration-status').textContent,/Not enough microphone input/);
  assert.equal(h.worklets[0].port.messages.at(-1).minRms,.002);
});
