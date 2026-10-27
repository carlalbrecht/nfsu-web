# Validation status — 27 October 2026

This is an early development port. A successful compile or loading screen is not equivalent to a complete stock game boot.

Verified on Apple Silicon macOS with Chrome:

- Exact executable hash checked before translation and before execution.
- 14,692 functions registered with no duplicate or out-of-range entries.
- Native diagnostic and WebAssembly builds succeed.
- Original loading screen, startup videos and title screen render through WebGPU. The title reports version 1.4.0.
- Browser keyboard events reach both the guest window messages and DirectInput action buffer. Title-to-menu progression is still under investigation.
- The first loading-loop stall is resolved by cooperative scheduling points.
- All 479 inherited instruction-semantics checks pass.
- Synthetic discovery covers callbacks and unaligned switch tables, and rejects mismatched binaries/layouts.

Validation in progress: progression into the main menu, complete race, stable audio, profile save/reload and stop/restart. Later features remain disabled and unimplemented for UG1. LAN/online play is not connected. Only the exact profiled executable is supported. The many inherited UG2 tests and feature documents do not certify UG1 behavior.
