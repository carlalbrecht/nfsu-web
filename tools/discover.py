#!/usr/bin/env python3
"""Find x86 code targets without requiring PE base relocation records.

An over-approximation: aligned image pointers seed indirect targets; recursive
decoding adds calls, branches, and instruction immediates used as callbacks.
Evidence is retained separately from the seed list. A seed is not proof of a
function boundary or of reachability at runtime.
"""
import argparse
from collections import defaultdict, deque
import hashlib
import json
from pathlib import Path
import struct

from capstone import Cs, CS_ARCH_X86, CS_MODE_32
from capstone.x86 import X86_OP_IMM, X86_OP_MEM
import pefile


def discover(executable, profile, output):
    data = executable.read_bytes()
    if len(data) != profile["size"] or hashlib.sha256(data).hexdigest() != profile["sha256"]:
        raise ValueError("Executable does not match the selected profile; refusing to use its addresses")
    pe = pefile.PE(data=data)
    base = pe.OPTIONAL_HEADER.ImageBase
    sec = next(s for s in pe.sections if s.Name.rstrip(b"\0") == b".text")
    low, size = base + sec.VirtualAddress, sec.Misc_VirtualSize
    high, code = low + size, sec.get_data()[:size]
    entry = base + pe.OPTIONAL_HEADER.AddressOfEntryPoint
    if (base, entry, low, size) != tuple(profile[k] for k in ("image_base", "entry_point", "text_base", "text_size")):
        raise ValueError("PE layout disagrees with executable profile")
    md = Cs(CS_ARCH_X86, CS_MODE_32)
    md.detail = True
    evidence = defaultdict(set)
    slots = []
    queue = deque()
    queued, decoded = set(), set()
    failed = set()
    tables = set()
    sections = [(base+s.VirtualAddress, s.get_data()) for s in pe.sections]

    def word(address):
        for start, raw in sections:
            if start <= address <= start + len(raw) - 4:
                return struct.unpack_from("<I", raw, address-start)[0]
        return None

    def add(address, reason, is_entry=True):
        if low <= address < high:
            if is_entry:
                evidence[address].add(reason)
            if address not in queued:
                queued.add(address)
                queue.append(address)

    add(entry, "pe-entry")
    for address in profile.get("overrides", []):
        add(address, "override")
    for section in pe.sections:
        raw = section.get_data()
        start = base + section.VirtualAddress
        name = section.Name.rstrip(b"\0").decode("ascii", "replace")
        for offset in range(0, len(raw) - 3, 4):
            target = struct.unpack_from("<I", raw, offset)[0]
            if not low <= target < high:
                continue
            instruction = next(md.disasm(code[target-low:target-low+15], target, 1), None)
            if instruction is None or instruction.mnemonic in ("int3", "hlt", "ud2"):
                continue
            slots.append(start + offset)
            add(target, f"pointer:{name}:{start+offset:08x}")
    while queue:
        address = queue.popleft()
        while low <= address < high and address not in decoded:
            decoded.add(address)
            ins = next(md.disasm(code[address-low:address-low+15], address, 1), None)
            if ins is None:
                failed.add(address)
                break
            op = ins.operands[0] if ins.operands else None
            jump = ins.mnemonic.startswith("j") or ins.mnemonic.startswith("loop")
            call = ins.mnemonic == "call"
            # MSVC also emits unaligned tables inside .text. Read tables
            # referenced by decoded indexed jumps, not just aligned data.
            if ins.mnemonic == "jmp" and op is not None and op.type == X86_OP_MEM:
                mem = op.mem
                if mem.index and mem.scale == 4 and not mem.base and mem.disp not in tables:
                    table = mem.disp & 0xffffffff
                    tables.add(table)
                    for index in range(4096):
                        slot = table + 4 * index
                        target = word(slot)
                        if target is None or not low <= target < high:
                            break
                        slots.append(slot)
                        add(target, f"pointer:jump-table:{slot:08x}")
            if (jump or call) and op is not None and op.type == X86_OP_IMM:
                add(op.imm, f"{'call' if call else 'branch'}:{address:08x}", call)
            elif not jump:
                for operand in ins.operands:
                    if operand.type == X86_OP_IMM and operand.size == 4:
                        add(operand.imm & 0xffffffff, f"immediate:{address:08x}")
            if ins.mnemonic in ("jmp", "ret", "retf", "int3", "hlt", "ud2"):
                break
            address += ins.size
    output.mkdir(parents=True, exist_ok=True)
    (output / "code-pointers.txt").write_text("".join(f"{a:08x}\n" for a in sorted(set(slots))))
    (output / "seeds.txt").write_text("".join(
        f"{a:08x}\n" for a in sorted(evidence)
        if any(not reason.startswith("pointer:") for reason in evidence[a])))
    report = {"profile": profile["id"], "sha256": profile["sha256"],
              "candidate_entries": len(evidence), "pointer_slots": len(set(slots)),
              "decoded_instruction_starts": len(decoded),
              "referenced_jump_tables": len(tables),
              "undecodable_starts": [f"{a:08x}" for a in sorted(failed)],
              "candidates": {f"{a:08x}": sorted(why) for a, why in sorted(evidence.items())}}
    (output / "discovery.json").write_text(json.dumps(report, indent=2) + "\n")
    (output / "game_profile.h").write_text(
        "/* Generated from the verified executable profile. */\n#pragma once\n"
        f"#define DISPATCH_TEXT_BASE 0x{low:08x}u\n#define DISPATCH_TEXT_SIZE 0x{size:08x}u\n"
        f"#define GAME_ENTRY sub_{entry:08x}\n#define GAME_ENTRY_VA 0x{entry:08x}u\n"
        f"#define GAME_EXE_SHA256 \"{profile['sha256']}\"\n")
    print(f"Discovered {len(evidence)} candidate entries, {len(set(slots))} pointer slots; "
          f"decoded {len(decoded)} instruction starts ({len(failed)} undecodable)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("executable", type=Path)
    parser.add_argument("--profile", type=Path, default=Path("profiles/underground1.json"))
    parser.add_argument("--output", type=Path, default=Path("out/analysis"))
    args = parser.parse_args()
    try:
        discover(args.executable, json.loads(args.profile.read_text()), args.output)
    except (ValueError, StopIteration) as error:
        parser.exit(1, f"discovery: {error}\n")
