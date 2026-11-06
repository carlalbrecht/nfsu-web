# Browser execution coverage and validation

The `?test=1` launcher records execution of the stock executable and uses a
separate `nfsu1-coverage-save` browser storage directory. Normal play continues
to use `nfsu1-stock-save`. Neither writes into the original installation.

## What is measured

Generation emits entry and basic-block probes in translated functions. The
manifest currently contains 14,692 discovered functions, of which 14,682 have
entry probes, and 153,633 unique block addresses. Ten discovery candidates
failed lifting and remain in the function denominator. The inventory also
lists 202 potential unsupported-instruction sites; these are candidates for
investigation, not evidence that those instructions were executed.

The report records executed addresses, imported Windows calls, COM methods,
DirectSound object creation/destruction, scenario checks and explicit test
state changes. Resource COM slot names are derived from preprocessed tables,
including their common resource-method prefix. The shared texture slot is
labelled `GetSurfaceLevel/GetCubeMapSurface`.

These percentages describe discovered code, not the complete executable or
the fraction of the game that works. External modules and code generated in
guest heap memory are outside the inventory. One exercised block may contain
several behaviors. A method call does not prove that every parameter or
return value is implemented correctly.

Probes are inactive unless `COVREPORT` is enabled. Guest execution serializes
updates under its existing lock; the browser reads cumulative counters without
resetting them during scenarios. Snapshots are observational, not atomic game
save states. Scenario deltas cannot distinguish an entire 32-bit counter wrap.

## Running a checked scenario

Generate and build normally, then open `http://127.0.0.1:8080/?test=1`. Start
the game and expand **Browser coverage**. The JSON command box supports:

```json
{"action":"begin","name":"drag-natural-finish"}
```

Play the event using the original game controls. Coverage continues recording
without interacting with the command box. Passive screenshots and reads of
the existing development log do not need to focus the canvas or send input.
Use commands between races, since interacting with the controls can take
keyboard focus from the game.

```json
{"action":"end","checks":[{"name":"natural-finish","passed":true,"evidence":"Crossed the finish line; standings showed second place with a valid race time."}]}
```

Each check needs a name, a boolean `passed`, and concrete evidence. A scenario
is verified only if it has checks, all passed, and no additional logged runtime
faults, renderer errors or unimplemented imports appeared during it. This
verifies only those named observations, not every executed function.

Use `{"action":"summary"}` for counts and diagnostics or
`{"action":"report"}` for the full JSON report. **Export coverage report**
downloads that report. Export before Stop or reloading: current instrumentation
is in memory, and a reload starts a new recording. Keep raw reports and
screenshots under ignored `work/`, outside version control.

Reports include the executable profile, generation identity, actual WASM
SHA-256, frontend source fingerprint and browser identity. Merge only reports
from the same executable and generation:

```sh
.venv/bin/python tools/coverage_report.py \
  work/coverage-boot-profile.json work/coverage-reload-graphics.json \
  work/coverage-career-results.json work/coverage-modes.json \
  work/coverage-minimap-before.json work/coverage-minimap-trace.json \
  work/coverage-minimap-fixed.json work/coverage-final-free-run.json \
  work/coverage-customisation-before-mouse.json \
  work/coverage-customisation-mouse-fixed.json \
  work/coverage-acceptance-options.json \
  work/coverage-acceptance-reload.json \
  work/coverage-acceptance-cars-parts.json \
  work/coverage-acceptance-track-recovered.json \
  work/coverage-acceptance-final.json \
  --output work/coverage-merged.json
```

Pass raw browser reports only; do not include a previously merged report in
the input glob. The merger retains per-scenario build identities so a failure
from an older build is not silently reclassified after a fix. Older experimental
reports with incorrect COM slot labels retain their execution evidence but
their COM labels are discarded.

Use only the latest export from each live recording. For example,
`coverage-customisation-before-mouse.json` also contains the earlier
physics/crowd and unlocked-track scenarios from that same recording; adding
`coverage-physics-crowd.json`, `coverage-user-continuation.json` or
`coverage-unlocked-tracks.json` again would duplicate those scenario records.

## Bounded controls and diagnostics

The command runner also provides `press`, `text`, `state`, `set`, `focus`,
`gpu-inspect`, `frame-sample`, `scene-sample`, `gpu-contracts` and `shader-contracts`. Input
sequences have duration and length limits. There is no arbitrary evaluation or
guest-function invocation endpoint.

The `press` helper supplies key state and virtual-key messages; only Enter and
Escape also carry a character. For letter-based menu shortcuts, use real
browser keyboard input or `text` (for example `{"action":"text","text":"p"}`).
The original P shortcut and mouse control both open Performance Stats.

`set` permits only `unlocks` (boolean), `debug-menu` (boolean) and `speed`
(1, 2 or 4), with executable and value guards. Every change is recorded with
its before/after state. The test controls are exposed only in test mode.
The original debug menu can force results for transition coverage, but this
does **not** validate checkpoints, lap counting or a natural finish. Keep that
distinction in each check. The normal game timing remains unchanged.

For the unlocked test session, run:

```json
{"action":"set","setting":"unlocks","value":true}
```

This sets the existing byte at `0x735EC1` to 1. Original availability checks
read it to bypass progression locks; the executable and career completion
state are not rewritten. The flag resets on Stop/start or reload, so reapply
it after loading the profile. The acceptance pass used it to load 52 track
layouts and select all 20 base car models and the tested customisation parts.
Purchased/applied customisation in the separate test profile can still be
saved normally. The flag was disabled again after the pass.

`gpu-inspect` captures one frame's draw groups, render targets, fog parameters
and actual translated shader sources while the renderer owns the frame's
shared buffers. `frame-sample` reads 2–120 submitted GPU images and measures
image changes. Camera motion and scene animation affect those numbers; they
cannot independently certify that flickering is fixed.

`scene-sample` records the original cumulative real and simulation clocks for
1–30 seconds (`duration` in milliseconds). The real and simulation clocks use
4000 ticks per second and round every frame's step separately. The simulation
accumulator also counts 60 Hz ticks with fractional carry; its endpoint
precision is one tick. Both advance from the timestep passed into the race
update. Comparing them with host time is stronger evidence than reading the
HUD timer alone, but does not validate every vehicle calculation. Optional
`gpu: true` also captures draw-state groups and shader constants 79–80 at
roughly 200 ms intervals for crowd-fade diagnosis. Sampling never sends keys
or changes game data; start it before handing control to a human player.

## Regression checks

`./tools/check.sh` runs the asset-free checks: discovery, branch/entry probe
coverage, report merging, COM table mapping, scheduling, asset serving,
instruction semantics, string/date APIs, graphics capabilities and shader
translation, followed by TypeScript checking. Its HTTP test binds a temporary
loopback socket.

After generation, the actual COM dispatcher can also be tested natively:

```sh
.venv/bin/python tools/build.py native --runtime-tests
out/nfsu1/native/runtime_tests
```

This checks independent DirectSound devices, partial versus final Release,
playing-buffer teardown, duplicate PCM ownership, all six cube faces, and
switching between explicit declarations and FVF layouts with projected UVs.
The latter reproduces the minimap's four-component texture-coordinate layout.
The same executable also checks UG1 mouse coordinates through the actual
DirectInput COM dispatcher, including repeated polls, edge positions,
800x600-to-640x480 resolution changes, and unchanged button/wheel state.

`./tools/check.sh` writes shader fixtures to `out/nfsu1/tests/shaders`; rebuild the
frontend to include them. The browser commands below run against WebGPU:

```json
{"action":"gpu-contracts"}
{"action":"shader-contracts"}
```

The ten encoder checks cover repeated clears, depth-only preservation,
cross-frame target preservation, clear alpha and six independent cube faces.
The five matrix-instruction tests compare the C translator's generated WGSL
with its CPU interpreter using two different bone transforms: 290 scalar
outputs. Synthetic contracts complement gameplay observations; they are not
a full rendering-compatibility suite.

## Bugs exposed during the browser pass

- Reflective car surfaces flickered because the shared texture-vtable handler
  did not preserve the selected cube face in its surface object. All six
  cameras overwrote the same face. The active handler now carries the face
  into `SetRenderTarget`; an unreachable device-handler copy was removed.
- Color clears were treated as a per-frame default, so a second clear could
  be lost and target contents or alpha could be overwritten. Clears now run
  in stream order, and passes without a color clear load existing content.
- Old audio survived race/movie/menu transitions because DirectSound creation
  reused an immortal singleton. Each device now owns its buffers, and final
  device destruction unregisters them before releasing PCM memory. A partial
  buffer Release no longer stops a still-referenced sound.
- The crowd's matrix shader ignored relative constant addressing and used the
  first bone for every vertex. Each matrix row now goes through normal source
  operand decoding. The native shader tests reproduce the old failure, and
  GPU comparisons plus animated race/results crowds verify the fix.
- The minimap road layer disappeared because `SetFVF` recorded its value but
  retained the preceding vertex declaration. Its four-component projected
  texture coordinates were read as two components. FVF layouts now produce
  stable declarations, so both the CPU fetch and the GPU shader cache use the
  requested layout. A native COM regression fails before the change and
  passes after it; browser Circuit screenshots show the roads and arrows.
- Shader include files were absent from the incremental build fingerprint.
  Changes to the WGSL generator and FVF decoder now rebuild their consumers.
- Mouse movement used render pixels, while UG1's front-end cursor consumes
  640x480 menu units. At 800x600 this produced overshoot and required offset
  clicks. The stock-specific DirectInput adapter converts the staged browser
  position to menu units and rebases the returned delta against the game's
  cursor. Direct clicks on vinyl controls and the lower menu buttons now work;
  native tests cover drift and resolution changes. The game still updates its
  own cursor through the original code.

## Remaining gaps

The fifteen retained recording exports through 28 October 2026 reached 6,870
of 14,692 discovered functions (46.76%) and 67,410 of 153,633 blocks (43.88%).
Twenty-five of 31 scenario records passed all their checks. The latest
acceptance pass adds 315 function entries and 4,580 blocks to the previous
44.62% / 40.90% snapshot, with all 16 added records passing their named checks.
The other records preserve failures found before the crowd animation,
minimap and mouse fixes, plus the unresolved crowd pop. Passing checks within
a failed scenario retain their individual evidence. No unimplemented import
was recorded.

The [stock acceptance record](stock-acceptance.md) covers the 52-layout load
sweep, all 20 base car models, the remaining customization and performance
families, profile/options edge cases, keyboard controls, natural Circuit and
Sprint finishes, and career/tournament/reward/save transitions. Debug-assisted
career victories are explicitly distinguished from natural finishes.
Raw reports and screenshots are under `work/coverage-acceptance-*` and
`work/acceptance-*`; earlier customization evidence is retained separately.
Individual vinyl palette-swatch clicks did not change the selection; keyboard
colour changes worked. The mouse fix verifies the named label, arrow and
bottom-row controls, not every clickable region. Original palette behavior
still needs comparison.

### What is in the remaining 53.24%?

There are 7,822 uncalled discovered entries. Of these, 1,362 contain basic
blocks that already executed through other entry points, including 73 whose
entry address itself executed as a block. Another 6,450 lifted entries have
no executed body blocks; ten candidates failed lifting. These counts reflect
the discovery inventory, including overlapping and potentially spurious
candidates, not 7,822 confirmed independent game functions.

Representative incompletely visited bodies, identified from their strings and
call context, are below. Block counts overlap across candidates and must not
be added to obtain a category percentage. Labels are static-analysis
interpretations, not original symbols or proof that a feature is reachable.

| Area | Representative entry | Unexecuted blocks in that body | Testing implication |
| --- | --- | ---: | --- |
| On-screen keyboard | `0x4EC990` | 331 | Physical typing does not exercise this alternate input screen. |
| Other garage/car browsers | `0x4C7790` | 286 | Different browser variants remain after the tested parts/rims paths. |
| Career menu / magazines | `0x4E9730`, `0x513C90` | 80, 79 | Career-menu entry and 21 body blocks now executed; magazine screen and later progression remain. |
| Alternate Quick Race setup | `0x4E1290` | 121 | References include `P1_Ready`, `P2_Ready` and two-player garage UI. Normal single-player setup does not cover it. |
| Online login / warning UI | `0x55AB00` | 121 | Legacy network paths remain; online service support is not implemented. |
| Math-library error handling | `0x5BD234` | 372 | References division-by-zero and invalid log/acos paths; ordinary play should not need many of these. |
| Shader assembly / diagnostics | `0x5E62BD` | 171 | Bundled toolchain code includes invalid-instruction and addressing diagnostics, not additional race content. |

Paint (`0x4D8600`), rims (`0x50D420`) and parts-browser (`0x506210`) entries
identified in the earlier gap analysis have now executed during customisation.
The detailed original string triage is `work/coverage-triage.json`; the latest
overlap counts and representative bodies are `work/coverage-gap-acceptance.json`.
Earlier counts remain in `work/coverage-gap-current.json`. Further targeted
work would cover late career/magazines, controller paths, alternate menu
variants and complete route driving. Loading every layout does not establish
all assets, collision and streaming even where the code is shared.

Full career completion, every track/car/upgrade/settings combination,
controllers, online/LAN, and Windows visual/audio parity remain unverified.
The TJ timed-challenge countdown continued below zero without immediate
termination; a debug finish reached its reward, so timeout and natural
completion remain open. Discovered but unexecuted code and lift failures are included in
the merged gap inventory. No claim of 100% game coverage is made.

The distant tunnel segment appearing suddenly remains an open comparison.
The inspected tunnel frame used present shaders, requested no fog, and had no
renderer errors or missing shader draws. That rules out an enabled fog pass
being skipped in that captured scene; it does not establish whether the
pop-in matches the original Windows build.

The earlier crowd fix verifies skeletal animation, not fade behavior.
A subsequent stationary Circuit restart records unchanged crowd alpha-related
constants and disabled alpha blending until the draw calls stop. The abrupt
disappearance is reproduced, but comparison with the original Windows build
remains open. The captured command stream does not request a gradual fade.

Passive `scene-sample` measurements compare the accumulated simulation step
with host time: 602 ticks at 60 Hz (10.0333 seconds) versus 10.0393 host seconds
stationary, and 725 ticks (12.0833 seconds) versus 12.09469 host seconds under
acceleration. Speed stayed 1. The 4000 Hz counters read 10.0835 and 12.14375
seconds because each 1/60-second frame rounds to 67 ticks. This rules out a
large simulation-rate multiplier in those samples, but does not establish
correctness of every vehicle calculation or steering feel.
Raw evidence is in `work/timing-stationary.json`, `work/timing-driving.json`
and `work/crowd-restart-sample.json`.
