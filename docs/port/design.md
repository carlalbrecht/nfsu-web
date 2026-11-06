# Underground 1 port design

## Baseline

Imported source: https://github.com/th0mk/nfsu2-web at commit `606ee3591e165b5aabadebd4e94f8d2de162b268`. Local baseline commit: `78f857b`. The upstream README and MIT licence are preserved. Changes are layered on that baseline so UG1 adaptations remain reviewable.

## Verified executable and discovery

`profiles/underground1.json` pins size, hash, entry point and `.text` bounds. This executable has no useful base-relocation directory for the upstream discovery method. `tools/discover.py` therefore combines aligned image pointers, recursive direct-call/branch decoding, callback immediates and decoded references to unaligned jump tables. Candidate evidence is written to `out/nfsu1/analysis/discovery.json`.

These candidates are an over-approximation. They include unreachable code and false positives; discovery does not prove every byte is code. The generated module currently has 14,692 registered targets and 208 emitted unsupported sites. Executing an unsupported instruction or an unresolved static target stops with a diagnostic. No unsupported instruction is silently accepted as a no-op by the port's trap handler.

The game also constructs x86 routines on its heap. The inherited bounded interpreter handles those routines and delegates calls back to translated functions. For UG1 its fallback is restricted to the managed guest heap (`0x08000000..0x28000000`), leaving missing static targets visible. Thus this is primarily static recompilation with a limited interpreter for dynamically generated code.

## Stock behavior boundary

The generation script clears upstream address-specific hook and override lists and disables function inlining. The runtime build excludes UG2 gameplay patches, HLE D3DX replacements, widescreen, frame-rate changes and multiplayer extensions. Compatibility seams in `runtime/nfsu1/stock.c` satisfy shared-runtime references without applying those features.

Host API compatibility is still an emulation layer, not a full Windows implementation. In particular, inherited COM methods include success stubs. No claim of complete API coverage follows from a successful boot.

The stock resolution list remains enabled without the UG2 mode remapping or native-display scaling. The device honors the game's resolution, including its 800x600 menu to 640x480 default race transition; the browser scales the resulting image for presentation. Correcting `D3DCAPS9` output from 336 to its actual 304 bytes is necessary: UG1 stores its resolution-availability table immediately afterward, and the old write cleared it.

`runtime/nfsu1/datetime.c` implements the English date/time formatting calls used by profile saving, including current-local-time selection, SYSTEMTIME validation, size queries and buffer bounds. It deliberately returns Windows errors for unsupported locales and picture strings. Contracts: [GetDateFormatA](https://learn.microsoft.com/windows/win32/api/datetimeapi/nf-datetimeapi-getdateformata) and [GetTimeFormatA](https://learn.microsoft.com/windows/win32/api/datetimeapi/nf-datetimeapi-gettimeformata).

## Cooperative scheduling

The inherited runtime serializes guest execution with a host lock. UG1 polls producer-thread state in pure guest loops, with no Win32 calls at which to yield. The `SCHEDULE=1` lifter option adds scheduling opportunities at function entry and direct backward-branch destinations. The existing scheduler yields periodically, respecting its critical-section/no-yield guards. A compiled synthetic polling-loop regression verifies that producer writes become visible without corrupting registers or the guest stack.

## Storage and build isolation

Original assets are served by a loopback, read-only HTTP server. The guest file layer redirects writes to a separate overlay; browser storage is named `nfsu1-stock-save`. Native diagnostics default to `out/save` through `run.sh`.

The generated-source stamp hashes the profile and translator inputs. `tools/build.py` refuses stale generation, compiles at most `J` jobs (default four), and caches objects using source, headers, compiler version and flags. Generated sources, assets, outputs, dependencies and saves are Git-ignored. There is no deployment or public asset hosting step.

## Milestones

1. Boot and validate stock menus, keyboard/controller input, audio, a complete race and save/reload.
2. Establish repeatable correctness/performance checks and improve executable discovery.
3. Add explicit opt-in access to the test map and verified surviving debug features.
4. Add widescreen and other presentation options.
5. Design multiplayer only after stock simulation and state handling are understood.
