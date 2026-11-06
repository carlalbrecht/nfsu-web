#!/usr/bin/env python3
"""Inventory emitted entry/block probes. This is a discovered-code denominator,
not a claim that every instruction in the executable has been identified."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def com_inventory():
    # Expand RES_HEAD before assigning slots. Parsing the source directly shifts
    # every resource method by eleven positions and silently mislabels calls.
    source = subprocess.check_output(['clang','-E','-P','-x','c',str(ROOT/'runtime/d3d9_tables.h')],text=True)
    tables = {name: re.findall(r'\{"([^"]+)",\s*\d+\}', body) for name, body in re.findall(r'static const Method (\w+)\[\] = \{(.*?)\};',source,re.S)}
    tables['M_TEXTURE'][18] = 'GetSurfaceLevel/GetCubeMapSurface'
    interfaces = re.findall(r'\{"([^"]+)",\s*(M_\w+),', (ROOT/'runtime/com.c').read_text())
    return [{'interface':i+1,'name':name,'methods':tables[table]} for i,(name,table) in enumerate(interfaces)]


def inventory(folder):
    functions, blocks, traps, discovered, failures = set(), set(), set(), set(), set()
    for file in sorted(folder.glob('*.c')):
        source = file.read_text()
        discovered.update(int(x,16) for x in re.findall(r'void sub_([0-9a-f]+)\(CPU \*c\)\s*\{', source))
        failures.update(int(x,16) for x in re.findall(r'unsupported_insn\(c,\s*0x([0-9a-f]+)u,"lift-error"', source))
        functions.update(int(x, 16) for x in re.findall(r'cov_hit\(0x([0-9a-f]+)u\)', source))
        blocks.update(int(x, 16) for x in re.findall(r'cov_block\(0x([0-9a-f]+)u\)', source))
        traps.update(int(x, 16) for x in re.findall(r'unsupported_insn\(c,\s*0x([0-9a-f]+)u', source))
    return {'functions': sorted(functions), 'blocks': sorted(blocks), 'trapSites': sorted(traps),
            'uninstrumentedFunctions': sorted(discovered-functions), 'liftFailures': sorted(failures)}


def main():
    folder = ROOT/'gen/nfsu1'
    result = inventory(folder)
    profile = json.loads((ROOT/'profiles/underground1.json').read_text())
    result.update(schema=1, profile=profile, denominator='emitted probes in discovered executable code; excludes generated heap code and external modules')
    result['generation'] = hashlib.sha256((folder/'stamp.txt').read_bytes()).hexdigest()
    # Import indices and COM slots must match their runtime tables exactly.
    result['imports'] = [{'dll': d, 'name': n} for d, n in re.findall(r'\{0x[0-9a-f]+u?,"([^"]+)","([^"]+)"', (folder/'impargs.c').read_text())]
    result['com'] = com_inventory()
    result['comMapping'] = 2
    (folder/'coverage.json').write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(f"Coverage inventory: {len(result['functions'])} entries, {len(result['blocks'])} blocks, {len(result['trapSites'])} trap sites")


if __name__ == '__main__': main()
