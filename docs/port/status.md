# Validation status — 28 October 2026

This is an early development port. The checked paths below establish specific
gameplay observations, not full game compatibility or Windows visual parity.

Verified on Apple Silicon macOS with Chrome:

- Exact executable hash checked before translation and before execution.
- 14,692 functions registered with no duplicate or out-of-range entries.
- Native diagnostic and WebAssembly builds succeed.
- Original loading screen, startup videos, title, profile screen, main menu, garage and race setup render through WebGPU. The title reports version 1.4.0.
- Keyboard navigation and profile-name text entry work. Enter reaches the menu after the title transition; no title-screen patch is needed.
- New profiles complete their save operation. The profile list survives Stop and browser reload; an existing saved profile loads into the main menu.
- Quick Race / Circuit / Volkswagen Golf GTI / automatic transmission / Olympic Square loads with the default two laps, catch-up on, minimum traffic and medium opponents. The countdown completes, opponents drive, and player acceleration, steering, pause and Leave Race work. Returning to the race menu also works.
- High graphics settings and environment reflections were exercised in races and the garage. A cube-face routing defect causing flickering reflections is fixed, with native COM and six-face GPU regressions.
- The career introductory race, movie and car-selection transition work. Buying the Honda Civic deducts its $10,000 price; career menus, event selection and stock body-part menus render. A later career event was driven, restarted, then ended through the original debug menu; standings, style points, a $500 reward and return to the career menu were checked. The debug finish does not establish normal checkpoint or lap completion.
- Quick Race / Sprint / Skyline / Liberty Gardens was driven and ended through the original debug menu in fourth place. Standings, statistics and return to Quick Race work.
- Quick Race / Drag / Skyline / 14th and Vine Construction exercised a natural blown-engine failure. A user-driven retry finished naturally in second place, 0.61 seconds behind the 31.30-second winner. The fourth-place opponent was shown as totaled.
- A user-driven two-lap Drift event completed naturally in first place with 92,680 points. Score accumulation, multipliers, progression to lap 2/2 and the final standings were observed.
- A user-driven three-lap Lap Knockout event in the RX-7 progressed to the final two cars, then ended naturally in second place with the player marked knocked out. Earlier opponents were eliminated and the winner's time was 2:51.00.
- The missing minimap road layer is fixed: `SetFVF` now selects the correct vertex layout and retains all four projected texture coordinates. Circuit road geometry and vehicle arrows render together; native tests exercise layout switches through actual COM calls.
- Race starters and spectators animate in introductions and results after fixing relative addressing in matrix shader instructions. All five matrix opcodes agree with the CPU interpreter on 290 scalar GPU outputs.
- Repeated race/movie/menu transitions leave one active DirectSound device and two streaming buffers, instead of accumulating old loops. Native dispatcher tests check ownership and partial/final Release behavior. This verifies object lifetime, not a complete listening comparison against Windows.
- Web Audio runs at 44.1 kHz with non-silent output quanta. The observed final-run sample had a -4.3 dB peak and -14.4 dB RMS; this verifies the output path, not perceptual fidelity. Startup reported two audio underruns.
- Stop detaches the renderer, closes the audio context and releases the exposed game handle. Restart and browser reload both boot again.
- The first loading-loop stall is resolved by cooperative scheduling points.
- All 479 inherited instruction-semantics checks pass.
- Synthetic discovery covers callbacks and unaligned switch tables, and rejects mismatched binaries/layouts. Scheduling, HTTP asset isolation, string APIs, save timestamp APIs, coverage probes/report merging and the D3DCAPS9 output boundary have regression checks. TypeScript checking passes.
- Ten browser GPU readback checks pass for repeated/depth-only clears, retained render-target contents, alpha and independent cube faces.
- Customise Ride / RX-7: installed a Snyper front bumper, 18-inch BBS LM rims, body and rim paint, BBS windshield decals and a recoloured tear vinyl. Added and removed a second hood-stripe vinyl without losing the side vinyl; moved the side vinyl between layers. The visual changes survived leaving/reopening customisation and a full Stop/reload/start with the saved profile.
- Changed the RX-7 Engine / Exhaust package to level 2 Pro Performance. The reopened selection marks it installed, and Performance Stats still shows Engine level 2 after a full restart. The other categories showed level 3; those values alone do not verify every package's driving effects.
- Fixed browser mouse overshoot in menus. UG1 accumulates DirectInput movement directly in 640x480 menu coordinates; the inherited browser bridge supplied render pixels (800x600 in these menus). The stock-specific API adapter now derives a delta from the staged browser position to the game's cursor. Direct clicks activate vinyl colour, both layer-order arrows, Back and Performance Stats. Native COM tests cover first/repeated polls, edges, resolution changes and preserved wheel/button values.
- The [stock acceptance pass](stock-acceptance.md) loaded all 52 selectable layouts (16 Circuit, 16 Sprint, 12 Drag and 8 Drift), plus Free Run, and rendered all 20 base car models in the garage. These are load/render checks; full-route collision and streaming remain unverified on most layouts.
- All exposed body/accessory families and nine performance families were installed on the test Neon. Paint targets, decal locations, conflict guards, persistence and return to stock were checked. Keyboard bindings/default restore, manual shifts, driving controls, HUD options, low/high graphics settings, measured audio mute/restore and soundtrack ordering were exercised.
- A natural Liberty Gardens Sprint and one-lap Inner City Reverse Circuit finished in fourth place with results/statistics and return to menus. Both used ordinary controls with pauses and stock recovery, speed 1 and debug finish disabled. Earlier natural Drag, Drift and Knockout outcomes remain applicable.
- Career progression reached 8/111 using explicitly recorded debug-assisted wins to test mode rewards, a three-round tournament, unlocks, purchases, a Civic-to-MX-5 trade and a TJ unique engine upgrade. The named `career8` save restored the MX-5, $5,773 and Engine 1+U after a clean exit/reload. The TJ timer ran below zero without immediate termination; its natural timeout/finish behaviour is unqualified.
- A session with repeated race/menu transitions exited normally after about 95 minutes and 340,826 rendered frames, with zero unresolved calls or unsupported instructions. The later session reached 534,771 frames including extended idle menu time, zero WebGPU errors and one live DirectSound device/two buffers. The asset-free and native COM regressions pass.

Still unverified: the complete career, every track/car/upgrade combination,
controllers, extended soak testing, Windows graphics/audio fidelity and broad
browser/device compatibility. The checked sessions reported zero WebGPU errors;
this does not certify every rendering path. Distant tunnel pop-in remains an
open Windows comparison: the sampled scene requested no fog and had no missing
shader draws. Date/time formatting implements the English save-timestamp calls
used by this executable, not every Windows locale or format picture.
Direct clicks on individual vinyl palette swatches did not change the selected
colour in this pass; keyboard colour changes worked. Whether those swatches
are intended to be mouse-selectable in the original build remains unverified.

The [coverage workflow](coverage.md) records execution separately from explicit
correctness checks, including test state changes and build identities. It also
retains discovered functions that failed lifting in the coverage denominator.
The merged runs through 28 October reached 6,870/14,692 discovered function
entries (46.76%) and 67,410/153,633 blocks (43.88%), an increase of 315 entries
and 4,580 blocks from the previous batch. The customisation pass recorded the
mouse failure before its fix; the separate post-fix scenario passed. Nine of
fifteen earlier scenario records passed every check, followed by all 16 records
in the acceptance pass, for 25 of 31 cumulative records. Historical failures
remain in the evidence, and no unimplemented import was observed.
Stock timing is unchanged: the observed game output was about 60 fps while the
browser's display callbacks ran at 120 Hz. A passive race-clock sample advanced
16.42 seconds over 16.34 seconds of host time, with game speed set to 1. This
rules out an obvious twofold clock speedup in that sample, not subtler physics
differences from Windows.

The simulation accumulator advanced 602 ticks at 60 Hz (10.0333 seconds)
over 10.0393 host seconds while stationary, and 725 ticks (12.0833 seconds)
over 12.09469 host seconds under acceleration. Its fractional remainder
limits endpoint precision to one tick. Speed remained 1. The separate 4000 Hz
clock rounds each 1/60-second step to 67 ticks, explaining its slightly higher
readings of 10.0835 and 12.14375 seconds. These samples rule out a large
simulation-rate multiplier; individual handling calculations still lack a
Windows comparison. No timing or handling adjustment was made.

A stationary Circuit restart reproduces the abrupt crowd disappearance.
Samples approximately 200 ms apart show unchanged opacity-related shader
constants and disabled alpha blending until the crowd draw calls cease.
The renderer is not receiving a gradual alpha fade in this capture. Whether
that matches the original Windows version remains unverified; PS2 reports
of a fade do not establish PC behavior.

Later features remain disabled and unimplemented for UG1. LAN/online play is not connected. Only the exact profiled executable is supported. The many inherited UG2 tests and feature documents do not certify UG1 behavior.

The browser-only acceptance decision is sufficient to begin non-stock work,
with the remaining comparisons and untested paths listed in the acceptance
record. No such feature work was included in this pass. Test unlocks and the
debug menu were disabled again, speed is 1, and the game is at the main menu.

## Local smoke-test procedure

1. Start the browser launcher, allow startup to settle, and press Enter with a short hold to skip each eligible movie. Wait for the title transition before pressing Enter again.
2. Create a disposable profile by typing its name into the original profile field. Confirm that the main menu opens and no unimplemented import is logged.
3. Stop, reload and start again. Load the saved profile.
4. Select Quick Race, Circuit, the default Golf, automatic transmission and Olympic Square. Accept the default mode options.
5. Verify countdown, opponent movement, acceleration/steering and Escape. Choose Leave Race and confirm OK, then verify return to the race menu.
6. Inspect `underground.stats()`, `underground.audio()` and `underground.input()` in the development console. Stop should remove `underground` and log renderer/audio shutdown.

Automated key presses need a realistic hold (about 150 ms). Sending down and up together can be consumed within one guest input poll and produce no held-state change.
