# Need for Speed: Underground — browser recompilation

An early port of the original PC **Need for Speed: Underground (2003)** to WebAssembly, based on [th0mk/nfsu2-web](https://github.com/th0mk/nfsu2-web). The first target is the stock game experience. Test-map access, surviving debug features, widescreen and multiplayer are later milestones.

The current build translates a verified `Speed.exe` to C, compiles it to WASM, and runs it with the inherited Win32, Direct3D 9/WebGPU and DirectSound/Web Audio runtime. Browser checks cover original videos, saved profiles, early career progression, Circuit/Sprint driving, and natural Drag, Drift and Lap Knockout results. **This is an early development port; full game and Windows fidelity validation remain incomplete.** See [current validation and limitations](../docs/port/status.md).

Bring your own game installation. The repository excludes the executable, game assets, translated game C, built WASM, saves and local research output. The original installation is served read-only; browser saves use a separate origin-private storage directory.

## Supported executable

Only this exact executable is currently supported; generation and boot both verify its SHA-256:

- Name: `Speed.exe`
- Size: **3,178,496 bytes**
- SHA-256: `35654f401383be9af0dbff0d11a92220a17579a01030005de6943e63e03f460f`

The profile describes this binary, without assuming a retail region or patch label. Other executables require their own verified profile and validation.

## Build and run

Run the following commands from the repository root. To host both games locally, keep Underground 1 on its existing port 8080 for access to its browser saves and pass `--http-port 8081` to Underground 2’s `./web/start.sh`.

Tested on an Apple Silicon Mac, Python 3.9+, Node.js 22 and wasi-sdk 34. Install the matching [wasi-sdk 34](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-34) under `deps/`, or set `WASI` to its directory. The default is `deps/wasi-sdk-34.0-arm64-macos`.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm --prefix web ci --ignore-scripts
./nfsu1/gen.sh /path/to/game/Speed.exe
./nfsu1/start.sh --data /path/to/game
```

Open `http://127.0.0.1:8080/` in Chrome. The launcher remembers image scaling, full-screen startup, master volume and background muting. Click **Start game** to play. **F8** or moving the pointer to the top reveals mute, full-screen, diagnostics and Stop controls. The original 4:3 picture fits the screen without stretching. You can change resolution, graphics detail and driving keys in the game's Options menu.

The launcher uses original CSS graphics and embeds IBM Plex Sans Condensed in its stylesheet. Both italic weights are bundled locally with their SIL Open Font License. It identifies the game by name in plain text. The browser starts loading game content from your installation when you select **Start game**. The server binds to loopback and supports the cross-origin-isolation headers required by shared WASM memory. `--no-build` reuses existing output. The normal command checks the generation stamp and rebuilds changed sources. Set `J=4` (the default) to bound compiler parallelism.

The original controls apply: **Enter** advances menus and skips eligible startup videos, **arrow keys** navigate and drive, **Backspace** goes back in menus, and **Escape** pauses a race. Wait for each screen transition before confirming again. Full-screen Escape handling depends on browser keyboard-lock support; without it Escape also leaves full screen, while the game continues in the page. **Stop game** terminates the game and returns to the launcher; use the game's save option first. Saved profiles remain in this browser's storage for this origin.

For separate build steps:

```sh
./nfsu1/build.sh web
npm --prefix web run build:nfsu1
./nfsu1/start.sh --data /path/to/game --no-build
```

For a headless native diagnostic, `./nfsu1/build.sh native` creates `out/nfsu1/native/nfsu1_boot`; run `./nfsu1/run.sh /path/to/game/Speed.exe`. This diagnostic has no native display. Its save overlay is `out/nfsu1/save`, or `NFSU1_SAVEDIR` if supplied.

## Structure

- `profiles/`: verified executable identity and code layout.
- `tools/`: executable discovery, x86-to-C lifter and build driver.
- `runtime/`: shared emulation; `runtime/nfsu1/` contains stock UG1 entry and compatibility code.
- `runtime/web/`: browser graphics, audio, input and threading bridges.
- `web/src/`: WASM workers and browser subsystems; `stock.ts` is the active launcher.
- `tests/`: compiler/runtime tests, including synthetic UG1 port regressions.
- `docs/port/`: current port notes and preserved upstream README.

The two games share the recompiler, graphics, input and audio code. The Underground 1 build selects its own executable profile, startup code and supported runtime features. Its generated sources are in `gen/nfsu1/`, its binaries in `out/nfsu1/` and its launcher bundle in `web/dist-nfsu1/`.

## Checks

```sh
./tools/check.sh
```

For instrumented browser play, open `/?test=1`. This records discovered-code
execution and uses separate test saves. See [coverage commands, regression
checks and evidence limits](../docs/port/coverage.md) and the completed
[browser stock-acceptance pass](../docs/port/stock-acceptance.md). Stock game timing remains
in use; detecting a high-refresh-rate display does not enable the inherited
UG2 timing patches.

## Merging upstream changes

The fork’s `main` contains the upstream history and the original Underground 1 commits. In a fresh clone, run `git remote add upstream https://github.com/th0mk/nfsu2-web.git` once. To integrate updates:

```sh
git switch main
git pull --ff-only origin main
git fetch upstream main
git merge upstream/main
```

Run the shared TypeScript check, both web builds and the Underground 1 regressions before pushing to `origin`. Regenerate each game from its own executable when recompiler inputs change. Game addresses, split-screen relocations and patches defined for Underground 2 require separate verification for Underground 1.

## Upstream and licence

The initial Git commit imports the MIT-licensed `th0mk/nfsu2-web` tree at `606ee3591e165b5aabadebd4e94f8d2de162b268`, with its existing structure and licence. Its README is preserved at [docs/port/upstream-readme.md](../docs/port/upstream-readme.md). See [provenance and port design](../docs/port/design.md) and [LICENSE](../LICENSE).

This fan project is not affiliated with Electronic Arts. No game content is supplied.
