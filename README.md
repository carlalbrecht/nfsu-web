# Need for Speed: Underground — browser recompilation

An early port of the original PC **Need for Speed: Underground (2003)** to WebAssembly, based on [th0mk/nfsu2-web](https://github.com/th0mk/nfsu2-web). The first target is the stock game experience. Test-map access, surviving debug features, widescreen and multiplayer are later milestones.

The current build translates a verified `Speed.exe` to C, compiles it to WASM, and runs it with the inherited Win32, Direct3D 9/WebGPU and DirectSound/Web Audio runtime. **This is a development port, not yet a validated playable release.** See [current validation and limitations](docs/port/status.md).

Bring your own game installation. The repository excludes the executable, game assets, translated game C, built WASM, saves and local research output. The original installation is served read-only; browser saves use a separate origin-private storage directory.

## Supported executable

Only this exact executable is currently supported; generation and boot both verify its SHA-256:

- Name: `Speed.exe`
- Size: **3,178,496 bytes**
- SHA-256: `35654f401383be9af0dbff0d11a92220a17579a01030005de6943e63e03f460f`

The profile describes this binary, without assuming a retail region or patch label. Other executables require their own verified profile and validation.

## Build and run

Tested on an Apple Silicon Mac, Python 3.9+, Node.js 22 and wasi-sdk 34. Install the matching [wasi-sdk 34](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-34) under `deps/`, or set `WASI` to its directory. The default is `deps/wasi-sdk-34.0-arm64-macos`.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm --prefix web ci --ignore-scripts
./gen.sh /path/to/game/Speed.exe
./web/start.sh --data /path/to/game
```

Open `http://127.0.0.1:8080/` in Chrome and click **Start game**. Click the canvas to focus keyboard input. The server binds to loopback and supports the cross-origin-isolation headers required by shared WASM memory. `--no-build` reuses existing output; the normal command checks the generation stamp and rebuilds changed sources. Set `J=4` (the default) to bound compiler parallelism.

For separate build steps:

```sh
./web/build.sh
npm --prefix web run build
./web/start.sh --data /path/to/game --no-build
```

For a headless native diagnostic, `./build.sh` creates `out/native/nfsu1_boot`; run `./run.sh /path/to/game/Speed.exe`. This diagnostic has no native display. Its save overlay is `out/save`, or `NFSU1_SAVEDIR` if supplied.

## Structure

- `profiles/`: verified executable identity and code layout.
- `tools/`: executable discovery, x86-to-C lifter and build driver.
- `runtime/`: shared emulation; `runtime/nfsu1/` contains stock UG1 entry and compatibility code.
- `runtime/web/`: browser graphics, audio, input and threading bridges.
- `web/src/`: WASM workers and browser subsystems; `stock.ts` is the active launcher.
- `tests/`: compiler/runtime tests, including synthetic UG1 port regressions.
- `docs/port/`: current port notes and preserved upstream README.

The imported tree also contains UG2-specific features, native packaging scripts and documentation. They are retained for provenance and later comparison, **not claimed as working UG1 features**. The build driver explicitly lists the runtime sources used by this port; UG2 guest hooks and overrides are disabled.

## Checks

```sh
./tools/check.sh
```

## Upstream and licence

The initial Git commit imports the MIT-licensed `th0mk/nfsu2-web` tree at `606ee3591e165b5aabadebd4e94f8d2de162b268`, with its existing structure and licence. Its README is preserved at [docs/port/upstream-readme.md](docs/port/upstream-readme.md). See [provenance and port design](docs/port/design.md) and [LICENSE](LICENSE).

This fan project is not affiliated with Electronic Arts. No game content is supplied.
