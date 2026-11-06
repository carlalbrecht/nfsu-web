"""Synthetic PE coverage: no proprietary game bytes required."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('discover', Path(__file__).parents[1] / 'tools/discover.py')
discover = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(discover)


def fixture():
    raw = bytearray(0x400)
    raw[:2] = b'MZ'
    struct.pack_into('<I', raw, 0x3c, 0x80)
    raw[0x80:0x84] = b'PE\0\0'
    struct.pack_into('<HHIIIHH', raw, 0x84, 0x14c, 1, 0, 0, 0, 0xe0, 0x102)
    opt = 0x98
    struct.pack_into('<H', raw, opt, 0x10b)
    struct.pack_into('<III', raw, opt+16, 0x1000, 0x1000, 0)
    struct.pack_into('<III', raw, opt+28, 0x400000, 0x1000, 0x200)
    struct.pack_into('<II', raw, opt+56, 0x2000, 0x200)
    struct.pack_into('<I', raw, opt+92, 16)
    sec = opt+0xe0
    raw[sec:sec+8] = b'.text\0\0\0'
    struct.pack_into('<IIII', raw, sec+8, 0x200, 0x1000, 0x200, 0x200)
    struct.pack_into('<I', raw, sec+36, 0x60000020)
    raw[0x200:] = b'\xcc'*0x200
    # Direct call, callback address, and deliberately unaligned switch table.
    raw[0x200:0x211] = b'\xe8'+struct.pack('<I', 0x3b)+b'\xb8'+struct.pack('<I', 0x401050)+b'\xff\x24\x85'+struct.pack('<I', 0x401081)
    for offset in (0x40, 0x50, 0x60, 0x70): raw[0x200+offset] = 0xc3
    struct.pack_into('<II', raw, 0x281, 0x401060, 0x401070)
    profile = dict(id='fixture', size=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                   image_base=0x400000, entry_point=0x401000, text_base=0x401000, text_size=0x200)
    return raw, profile


class DiscoveryTests(unittest.TestCase):
    def test_calls_callbacks_and_unaligned_switch_without_relocations(self):
        raw, profile = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); exe = root/'test.exe'; exe.write_bytes(raw)
            discover.discover(exe, profile, root/'out')
            report = json.loads((root/'out/discovery.json').read_text())
            for target in (0x401000, 0x401040, 0x401050, 0x401060, 0x401070):
                self.assertIn(f'{target:08x}', report['candidates'])
            self.assertEqual(report['referenced_jump_tables'], 1)
            slots = (root/'out/code-pointers.txt').read_text().splitlines()
            self.assertIn('00401081', slots); self.assertIn('00401085', slots)
            self.assertIn('00401050', (root/'out/seeds.txt').read_text())

    def test_rejects_wrong_executable_and_layout_before_output(self):
        raw, profile = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); exe = root/'test.exe'; exe.write_bytes(raw)
            for change in ({'sha256':'0'*64}, {'entry_point':0x401010}):
                with self.assertRaises(ValueError): discover.discover(exe, {**profile, **change}, root/'out')
                self.assertFalse((root/'out').exists())


if __name__ == '__main__': unittest.main()
