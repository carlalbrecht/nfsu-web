"""Exercise target-specific code generation with synthetic executables."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parents[1]/'tools'))
from lift import Lifter, RawLifter
from test_nfsu1_discovery import fixture
ROOT = Path(__file__).parents[1]


class LiftTests(unittest.TestCase):
    def test_ug2_split_screen_relocation_is_scoped_to_its_executable(self):
        raw, _ = fixture()
        # mov eax,[0x8900ac]; add eax,0x8900b4; ret
        raw[0x200:0x20b] = bytes.fromhex('a1 ac008900 05 b4008900 c3')
        with tempfile.TemporaryDirectory() as directory:
            exe = Path(directory) / 'test.exe'
            exe.write_bytes(raw)
            for target in ('nfsu1', 'nfsu2'):
                with self.subTest(target=target), patch.dict(os.environ, {'NFS_TARGET': target}):
                    code, _ = Lifter(str(exe), comments=False).lift(0x401000)
                    if target == 'nfsu1':
                        self.assertIn('0x8900acu', code)
                        self.assertIn('0x8900b4u', code)
                        self.assertNotIn('SPLIT_PLAYERS', code)
                    else:
                        self.assertIn('SPLIT_PLAYERS_INDEX', code)
                        self.assertIn('SPLIT_PLAYERS_ORDER', code)

    def test_memory_poll_observes_producer_and_keeps_registers(self):
        # mov ebx,123; cmp [0x20000],0; je cmp; mov eax,ebx; ret
        code = bytes.fromhex('bb 7b000000 833d 00000200 00 74f7 89d8 c3')
        with patch.dict(os.environ, {'SCHEDULE':'1'}):
            translated, _ = RawLifter(code, base=0x401000, comments=False).lift(0x401000)
        source = '''#include "cpu.h"
#include <assert.h>
static unsigned ticks;
void guest_fair_yield(void) { if (++ticks == 10) MR32(0x20000) = 1; }
''' + translated + '''
int main(void) {
  mem_init(); mem_commit(0x10000, 0x20000);
  CPU cpu = {0}; CPU *c = &cpu; c->esp = 0x18000;
  PUSH32(0xdeadc0de); sub_00401000(c);
  assert(ticks == 10 && c->eax == 123 && c->ebx == 123 && c->esp == 0x18000);
  return 0;
}
'''
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); (p/'poll.c').write_text(source)
            subprocess.run(['clang', '-O1', '-I'+str(ROOT/'runtime'), str(p/'poll.c'), str(ROOT/'runtime/mem.c'), '-lm', '-o', str(p/'poll')], check=True)
            subprocess.run([str(p/'poll')], check=True, timeout=5)


if __name__ == '__main__': unittest.main()
