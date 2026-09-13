# Voice input

Practice settings contain stem mixing and voice-input calibration. Record switching,
line repeat, restart and manual timing adjustment were removed at the user's request.
Play/pause and microphone controls use accessible labeled icons; muted is red with a
slash. The melody/user legend is removed, but both particle streams remain.

Calibration pauses playback, measures two seconds of room noise, then three seconds
of singing. It requires sufficient frames and a confident pitched voice above room
noise, rejects clipping, and configures a per-microphone RMS gate in the AudioWorklet.
The captured singing level also sets the visual input scale. Failed attempts preserve
the previous profile. Profiles stay in memory for this session; raw audio is never
stored or sent. This is input-level calibration, not latency calibration.

The input meter and detection status update while paused. Microphone setup no longer
waits for full playback files to download. Device selection uses the browser's actual
audio-input IDs; enumeration updates alone no longer stop a healthy live microphone.
Backgrounding, muting, input failure, or closing settings cancels calibration. Muting
and backgrounding release capture. Missing frames produce an input warning rather than
a false calibration success.

Tests cover quiet pitches, silence/noise, calibration failure and clipping, real
worklet processing at 16/44.1/48 kHz, device changes, no-audio startup, and lifecycle
cancellation. Synthetic tests do not replace testing the user's physical microphone
and browser. The prior fixed .008 RMS cutoff could suppress quiet voices; the default
is now .002, with a measured threshold available through calibration. Timing still
uses the existing output clock and delay estimate, with no manual timing offset.
