# Stock-game acceptance pass

The objective is to exercise every practical stock feature family before
starting enhancements. Execution coverage guides selection; a percentage does
not decide readiness. A check passes only for the observations recorded with
its scenario. Fix reproducible port defects and repeat the affected checks.

Started 28 October 2026, from 44.62% discovered function-entry coverage and
40.90% block coverage. Earlier evidence is in [status](status.md) and
[coverage](coverage.md). This pass uses the disposable `coverage` browser
profile and separate test saves. Original installation files remain read-only.

## Completed worklist

| Feature family | Practical checks | Status |
| --- | --- | --- |
| Boot/profile lifecycle | Movies, create/load, duplicate/invalid names, cancelled and confirmed deletion of a newly created disposable profile, reload | Create/load/reload, duplicate and empty name, delete cancellation checked; permanent delete not exercised |
| Main-menu information | Statistics, help and credits where exposed | Statistics, scrolling credits and NASCAR trailer checked |
| Body customization | Every exposed category, preview/install/cancel, return to stock | Front/rear bumpers, skirts, spoiler, hood, scoop and wide-body kit installed; conflict guards and stock restore checked |
| Wheels/accessories | Rim size/style, spoilers/hoods/exhaust/neon/tint/lights where exposed | Wheel brands/sizes, underglow, lights, muffler and tint installed; low-detail underglow appearance not qualified |
| Paint/decals/vinyl | All exposed target types, multiple slots/layers, reorder/remove and persistence | Finish/target types, decal locations, vinyl layers and reload checked; palette swatch mouse behaviour needs Windows comparison |
| Performance | Every package category, level/brand changes, stock restore, statistics | All nine families, brand alternatives, installed/locked guards, unique engine upgrade, persistence and stock restore checked |
| Options/controls | Gameplay/HUD settings, keyboard rebinding and restore, controller menu behavior | Menus, W binding/restart/default restore, HUD disable/restore and manual shifts checked; hardware unavailable |
| Graphics | Exposed low/high settings, resolution changes, menu/race rendering, saved values | Every exposed toggle changed; 640x480 and 1024x768 races, previous high-detail reflections and clean-exit persistence checked |
| Audio | Music/effects volumes, mute/restore, track selection, transition cleanup | Sliders, soundtrack mode/order, measured silence/restoration and transition object lifetimes checked |
| Race setup | Each mode, manual/automatic, reverse options, traffic/opponent/lap extremes | All modes, manual/auto, reverse layouts, traffic extremes, Easy/Medium/Hard, catch-up On/Off and 1–10 lap selector checked; not the full cross-product |
| Tracks | Enumerate unlocked selections and load each distinct stock track; distinguish load checks from complete driving | 52 layouts loaded: 16 Circuit, 16 Sprint, 12 Drag, 8 Drift; Free Run separately checked |
| Cars | Enumerate stock cars, load representative drivetrain/body types, garage/race transitions | All 20 base models rendered in garage; Golf/Civic/Neon/MX-5/Skyline/RX-7 exercised in race scenes |
| Racing controls | Throttle/brake/steering/reverse, handbrake, nitrous, gear shifts, camera/look-back/reset | All listed keyboard controls exercised; no quantitative handling or upgrade-power qualification |
| Race lifecycle | Countdown, pause/resume, restart, abandon, natural win/loss/results, knockout, drift score, drag failure | Natural Circuit/Sprint/Drag/Drift/Knockout results observed across sessions; Free Run lifecycle and repeated transitions checked |
| Career | New/load, event types, rewards/unlocks, purchases, trade-in, tournament transitions, magazines and save/reload | Through 8/111, three-round tournament, rewards, trade, unique upgrade and named save/reload; debug-assisted wins explicit; magazines/later career deferred |
| Stock network UI | Inspect reachable menus/error handling without registering accounts or claiming working online services | Offline connection error and clean return checked; no account/terms acceptance |
| Browser lifecycle | Blur/refocus, Stop/restart, repeated race/menu transitions, bounded soak, diagnostics and resources | Focus bridge, repeated transitions, full restart and clean 95-minute session exit checked; final session also remained running for about 2.5 hours including idle menus |
| Runtime regressions | Asset-free suite, actual COM regressions, WebGPU/shader contracts after relevant changes | Asset-free and native COM suites pass; earlier ten GPU contracts and five matrix-opcode comparisons pass |

## Recorded observations

### Profile and options pass

Browser-only, separate test storage, profile `qa28`. Evidence:
`work/coverage-acceptance-options.json` and `work/acceptance-*.png`.
The scenario completed with zero runtime faults and WebGPU errors; DirectSound
ended with one live device and two live buffers. These are bounded checks:

- Duplicate `coverage` profile name rejected; creating `qa28` wrote the profile,
  autosave, option and control files.
- Circuit, Sprint, Drag, Drift and Global statistics pages navigated/rendered.
- All six audio sliders exercised, including master minimum and maximum.
- Bumper Cam, Manual transmission, stability Off, W throttle binding and all
  five HUD items Off retained after leaving/reopening their menus. Race effects
  and restart persistence were checked in the later scenarios below.
- Changed every exposed custom graphics control, including motion blur On,
  geometry Low, headlights/crowds On and animated textures/particles Off.
  Selected 1024x768 in the menu; the later race check confirmed the target size.
- Soundtrack tracks changed from Race to All, Random order selected, and
  Rob Zombie moved from position 4 to 3 by the original mouse controls.
- Named manual save `qaopts` created with a timestamp; overwrite cancellation,
  overwrite/name entry and the load warning exercised. Save appeared in Load.
- Credits scroll; NASCAR trailer decodes and plays moving footage.

These menu checks do not establish every setting's gameplay effect or audio
fidelity. Later checks below isolate empty-name handling.

### Race options and restart

The later scenario in `work/coverage-acceptance-options.json` verifies:

- Offline Play Online shows a connection error and returns to the main menu.
  No account registration or agreement acceptance was performed.
- Circuit lap selector wraps 1–10. One lap, catch-up Off, maximum traffic,
  Hard opponents and manual Golf load at an actual 1024x768 canvas size.
- W accelerates; A shifts to second and Z back to first; the speedometer shows
  KM/H. C cycles bumper/chase camera and R repositions the car.
- Disabled HUD items are absent, and restoring them in pause options restores
  lap, position, leaderboard, gauges and minimap. In-race graphics changes
  apply without a crash. Both map modes render; the translucent HUD artwork
  also occurs in earlier captures, with motion blur Off. No new defect was
  established from that comparison; Windows parity is still open.
- After returning to menus, one DirectSound device and two buffers remain,
  with zero runtime faults, zero WebGPU errors and no unsupported imports.

`work/coverage-acceptance-reload.json` records the full reload: `qa28` remains
loadable, W remains assigned, the empty name field creates no profile, and
deletion cancellation keeps the profile. The original Default Settings
confirmation restores Up as throttle. Menu letter shortcuts require the text
input path (`text` command), while driving keys use key states (`press` or
`sequence`). The normal Quit to Windows path completes with exit 0, renderer
detached and audio context closed (`work/acceptance-normal-exit.log`).

The test runner now supports bounded overlapping key sequences, to exercise
normal driving without modifying game logic. Validation rejects invalid steps
before any input and limits a sequence to 30 seconds; completion releases all
held keys. This is available only on the test page.

## Evidence limits

- Original debug-menu wins may exercise career transitions, but are never
  recorded as natural driving, checkpoint or lap-completion verification.
- Hardware controller/wheel feel and Windows visual/audio/handling parity need
  the corresponding hardware or a reference execution. Synthetic input alone
  cannot establish them.
- Defunct external services, exhaustive career play and every permutation of
  track/car/part/settings are not automatically called practical. Record the
  concrete tested families and any remaining dependency before deciding.
- Do not chase exception/error branches by corrupting profiles or causing
  undefined guest behavior merely to raise coverage.

## Readiness decision

28 October 2026: sufficient evidence to begin non-stock feature development
against this browser baseline. The practical feature-family sweep is complete
within the stated browser-only scope. This is not certification of the whole
game: track loading is weaker than driving every route, and debug-assisted
career wins verify transitions rather than natural completion.

All 16 scenario records added in this pass passed their named checks, with no
observed runtime faults, WebGPU errors or unimplemented imports. The merged
history retains older failures: 25 of 31 cumulative records pass. Entry
coverage rose from 44.62% to 46.76%, and block coverage from 40.90% to 43.88%.
The decision rests on the concrete observations, not those percentages.

Outstanding items remain explicit:

- Windows comparison for palette mouse selection, crowd/tunnel pop-in,
  graphics/audio fidelity, and handling. A TJ challenge timer ran below zero
  without an immediate loss; its timeout/finish behaviour remains unqualified.
- Later career and magazine rewards, natural timed-challenge completion,
  every route's collision/streaming, and every car/part/settings combination.
- Controllers/wheels, other browser/device combinations, legacy online/LAN,
  and permanent profile deletion (only its cancellation was exercised).

The game is left at the main menu with test unlocks and the debug menu off,
speed 1, and no held keys. Test profiles remain in separate browser storage.
No non-stock feature work has started as part of this pass.

A subsequent clean Quit/restart retained 1024x768 (`acceptance-graphics-clean-restart.png`). An earlier Stop from the race-return menu had not persisted that selection. Treat completion of the original save/exit path separately from abrupt process termination. The later car sweep displays the `coverage` test profile label; both test profiles are in the separate coverage storage.

### Cars and remaining customization families

`work/coverage-acceptance-cars-parts.json` records the completed scenario
`acceptance-graphics-and-driving` (the original name predates the expanded
car/part sweep). It ended with zero runtime faults and WebGPU errors, one
live DirectSound device and two live buffers. Test unlocks were enabled.

- Settled garage captures cover all 20 base models: Golf, Civic, 206, MX-5,
  Neon, Eclipse, Celica, RX-7, Lancer, Focus, Impreza, Tiburon, Sentra,
  240SX, Supra, RSX, Integra, 350Z, S2000 and Skyline. The final extra Civic
  selection also renders. The sweep does not establish every car's handling.
- On the Neon, installed front/rear bumpers, skirts, spoiler, hood, roof
  scoop and Mantis wide-body kit. The original wide-body/bumper conflict
  guard appears. Installed 17-inch Enkei Arashi rims, underglow, alternate
  headlights/taillights, muffler tip and tint. Underglow installation is
  confirmed; its appearance at low detail is not separately qualified.
- Gloss, metallic and pearlescent finish selectors work. Separate spoiler,
  rim and muffler colours apply. Stock engine and brake parts reject paint;
  after upgrading, engine accent and caliper paint apply, with yellow
  calipers visible through the wheels.
- Rear-window, left/right door, left/right quarter-panel and hood decals
  render. Two left-door slots and black/white variants were exercised.
  Hood decals require stock hood restoration; cancelling preserves the
  conflict and accepting allows the hood layout menu. A layout conflict
  dialog also appears when switching layouts. Prior windshield and vinyl
  layer/recolour/removal checks remain applicable.
- All nine performance families were installed with brand alternatives.
  The summary shows engine 3, drivetrain 2, tires 1, ECU 3, turbo 3, brakes 3,
  weight reduction 2, suspension 3 and NOS 3. Re-selecting an installed
  level shows the expected guard. These are menu/install checks, not a
  measured power or handling comparison.
- Direct palette-swatch clicks still do not select a colour, while adjacent
  finish arrows respond at the correct visible coordinates. Keyboard colour
  selection works. Original Windows behaviour remains the comparison needed
  to classify this as stock behaviour or a port defect.

Evidence is in `work/acceptance-cars-*.png`, `work/acceptance-neon-*.png`,
`work/acceptance-hood-*.png` and `work/acceptance-rim-*.png`. The later
persistence and stock-restoration checks are recorded below.

### Recovered track-loading pass

An app update closed the local server and test browser during the circuit
sweep. The repository, screenshots, exported reports and both test profiles
survived. Restarting the server and loading `coverage` restored the customized
Neon. Unexported counters from the interrupted recording were lost; its saved
screenshots remain separate observation evidence.

`work/coverage-acceptance-track-recovered.json` contains the new recording.
The completed circuit, Sprint, Drag and Drift scenarios report zero runtime
faults, zero WebGPU errors and one live DirectSound device with two buffers
after return to the menus. The menu texture allocation returns to about
25 MB; this is a bounded transition check, not a full memory-leak audit.

| Mode | Selections visibly loaded | Evidence |
| --- | --- | --- |
| Circuit | Olympic Square, Atlantica, Inner City, Stadium, National Rail, Market Street, Terminal and Port Royal; all eight reverse variants | `acceptance-circuit-load-00` through `10-recovered.png`, plus pre-restart `acceptance-circuit-load-11.png` through `15.png` |
| Sprint | Liberty Gardens, Broadway, Lock Up, Bedard Bridge, 1st Ave. Truck Stop, 7th & Sparling, 9th & Frey and Spillway; all eight reverse variants | `acceptance-sprint-load-00.png` through `05.png`, then `06-final.png` through `15-final.png`; accompanying selection captures |
| Drag | 14th and Vine Construction, 14th and Vine, Highway 1, Main Street, Main Street Construction, Commercial; all six reverse variants | `acceptance-drag-select/load-00.png` through `11.png` |
| Drift | Drift Tracks 1–8 | `acceptance-drift-select/load-00.png` through `07.png` |

That is 52 selectable layouts including reverse variants. Each was observed
in a rendered race scene, with race introductions/countdowns or active HUDs.
The loading sweep does not establish full-route collision, streaming,
checkpoints or natural finishes on every layout. The game settings used the
previously selected low-detail 640x480 race rendering, with 800x600 menus.

The last ten Sprint layouts are recorded in
`work/coverage-acceptance-final.json`. An early six-layout count was incomplete.
The final Sprint selector stops at reverse Spillway; it does not wrap. A
separate correction scenario preserves that observation alongside the earlier
incorrect wraparound wording. All 16 Sprint load observations remain valid.

### Free Run, audio and stock restoration

The recovered recording also verifies Free Run at maximum traffic, throttle,
pause, restart and leave-race confirmations (including cancellation).
Input-bridge focus loss held simulation counters unchanged for 1.537 seconds;
focus gain advanced 91 simulation frames in 1.531 seconds. This checks the
focus bridge, rather than every browser/OS focus condition.

Master volume minimum produced -140 dB peak/RMS at the output, with restored
volume returning -2.69 dB peak and -14.75 dB RMS. The host gain remained 1.
See `acceptance-audio-levels.json` and `acceptance-focus-samples.json`.

After the app restart the Neon retained the full composition and all nine
performance levels. Cancelling Change to stock preserved it; confirming
removed the customized body, wheels and decals and marked S installed in all
nine performance categories. `acceptance-neon-stock-*.png` records the result.

### Natural Sprint and career progression

Career test unlocks were disabled. A full Liberty Gardens Sprint was driven
through the normal controls, with pauses and the stock R recovery control,
at speed 1 and with the debug menu disabled. It finished naturally in fourth
place at 3:48.85, 48.09 seconds behind the winner. Statistics reported 4.73 km,
141.83 km/h top speed and 74.51 km/h average. Standings, style points, loss
message, race statistics, Continue confirmation and return to career worked.
Career progress remained 2/111. The scenario ended with zero runtime/WebGPU
errors and one live DirectSound device/two buffers.

Subsequent progression used the original debug first-place finish explicitly
for transition coverage. It does not establish natural wins in these events:

- Sprint, Drift and Drag victories each awarded $500. Drift Track 1, the
  Mitsubishi Lancer and 14th & Vine Reverse unlocked through career rules.
- Lap Knockout awarded $500 and unlocked Olympic Square Reverse.
- The Rookie Tournament loaded three rounds and accumulated 8, 16 and 24
  player points. Cancelling Next Race, Restart Tournament and Quit Tournament
  preserved the series. Confirmed Next Race loaded the following round.
  Final victory paid $5,000 and unlocked level 1 engine, drivetrain and tires.
- The bank reached $7,500 and progression 7/111. An upgrade introduction movie
  played. Cancelling a level 1 engine purchase kept the balance; confirming
  deducted $500 and marked the package installed. Level 2 remained locked.
- Trading the Civic for an MX-5 displayed a $1,352 cost. Cancelling preserved
  the $7,000 balance; confirming left $5,648. Before/after performance screens
  and the reopened summary show that the level 1 engine carried over.

The next TJ challenge loaded with a countdown, which continued below zero
without automatically ending the event. This is an unresolved behaviour
comparison, not a passed timeout check. An explicitly recorded debug victory
was then used to reach the $125 reward, Liberty Gardens Reverse unlock and
unique-upgrade choice. Cancelling the engine choice preserved the selection
screen; confirming installed the unique engine upgrade.

The `career8` named save retained the MX-5, $5,773 bank, 8/111 event progress
and engine level 1 plus the unique upgrade after clean Quit, browser reload
and profile load. The named slot had a timestamp and loaded through its
normal warning. Evidence is in `acceptance-career-*.png`, the recovered
report and `work/coverage-acceptance-final.json`.

### Natural Circuit and remaining controls

Inner City Reverse was driven in the RX-7, automatic, one lap, Easy opponents,
no traffic and catch-up On. Speed remained 1 and the debug menu was disabled.
Normal inputs, pauses and the stock R recovery control were used. The car
finished naturally fourth in 2:35.17, 44.31 seconds behind the winner.
Statistics showed 3.41 km, 200.66 km/h maximum and 78.42 km/h average. The
garage shortcut, cinematic jump/landing, standings, style points, loss
screen, statistics and confirmed return to Quick Race were observed.

Held B showed the view ahead of the car looking back; release restored chase
view. Down moved backwards from rest and braked forward speed from 42 to
3 km/h. Right Shift reduced speed from 37 to 7 km/h. Space was exercised
under throttle with a change in the N2O gauge. These are functional control
checks; they do not measure exact braking forces or nitrous power.

### Sustained execution and final regressions

The recovered session completed a normal exit after about 95 minutes and
340,826 rendered frames. Its shutdown log reports zero unresolved indirect
calls and unsupported instructions, with renderer detach and audio closure.
No unsupported imports or heap-integrity faults were observed. See
`work/acceptance-career-normal-exit.log`.

After the subsequent reload, the final diagnostic showed 534,771 rendered
frames, zero WebGPU errors, no dropped input or held keys, and one live
DirectSound device/two buffers. The two startup audio underruns had not
increased. Much of this later duration was idle menu time; it is not an
equivalent duration of continuous driving or a comprehensive leak test.

`work/acceptance-final-check.log` records nine Python regression tests, all
479 instruction checks, string/date APIs, D3D capability boundaries, shader
matrix tests and TypeScript checking passing. Actual native COM tests also
pass in `work/acceptance-final-native-check.log`. No source changes followed
these checks in the final consolidation; only evidence and documentation
were updated.
