# Validation status — 27 October 2026

This is an early development port. A successful compile or loading screen is not equivalent to a complete stock game boot.

Verified on Apple Silicon macOS with Chrome:

- Exact executable hash checked before translation and before execution.
- 14,692 functions registered with no duplicate or out-of-range entries.
- Native diagnostic and WebAssembly builds succeed.
- Original loading screen, startup videos, title, profile screen, main menu, garage and race setup render through WebGPU. The title reports version 1.4.0.
- Keyboard navigation and profile-name text entry work. Enter reaches the menu after the title transition; no title-screen patch is needed.
- New profiles complete their save operation. The profile list survives Stop and browser reload; an existing saved profile loads into the main menu.
- Quick Race / Circuit / Volkswagen Golf GTI / automatic transmission / Olympic Square loads with the default two laps, catch-up on, minimum traffic and medium opponents. The countdown completes, opponents drive, and player acceleration, steering, pause and Leave Race work. Returning to the race menu also works.
- Web Audio runs at 44.1 kHz with non-silent output quanta. The observed final-run sample had a -4.3 dB peak and -14.4 dB RMS; this verifies the output path, not perceptual fidelity. Startup reported two audio underruns.
- Stop detaches the renderer, closes the audio context and releases the exposed game handle. Restart and browser reload both boot again.
- The first loading-loop stall is resolved by cooperative scheduling points.
- All 479 inherited instruction-semantics checks pass.
- Synthetic discovery covers callbacks and unaligned switch tables, and rejects mismatched binaries/layouts. Scheduling, HTTP asset isolation, string APIs, save timestamp APIs and the D3DCAPS9 output boundary have regression checks. TypeScript checking passes.

Still unverified: a complete race and results, career progression, other tracks/modes, controllers, extended play, graphics fidelity, audible music/effects fidelity and other browsers. The frontend and race smoke runs reported zero WebGPU errors; this does not certify every rendering path. Date/time formatting implements the English save-timestamp calls used by this executable, not every Windows locale or format picture.

Later features remain disabled and unimplemented for UG1. LAN/online play is not connected. Only the exact profiled executable is supported. The many inherited UG2 tests and feature documents do not certify UG1 behavior.

## Local smoke-test procedure

1. Start the browser launcher, allow startup to settle, and press Enter with a short hold to skip each eligible movie. Wait for the title transition before pressing Enter again.
2. Create a disposable profile by typing its name into the original profile field. Confirm that the main menu opens and no unimplemented import is logged.
3. Stop, reload and start again. Load the saved profile.
4. Select Quick Race, Circuit, the default Golf, automatic transmission and Olympic Square. Accept the default mode options.
5. Verify countdown, opponent movement, acceleration/steering and Escape. Choose Leave Race and confirm OK, then verify return to the race menu.
6. Inspect `underground.stats()`, `underground.audio()` and `underground.input()` in the development console. Stop should remove `underground` and log renderer/audio shutdown.

Automated key presses need a realistic hold (about 150 ms). Sending down and up together can be consumed within one guest input poll and produce no held-state change.
