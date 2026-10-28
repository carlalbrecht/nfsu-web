"""Coverage probes must observe both outcomes, including calls made directly."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parents[1]/'tools'))
from lift import RawLifter
from coverage_manifest import inventory, com_inventory
from coverage_report import merge
ROOT = Path(__file__).parents[1]


class CoverageTests(unittest.TestCase):
    def test_branches_and_direct_function_entries(self):
        # test eax,eax; jz zero; mov eax,7; ret; zero: mov eax,9; ret
        lifter = RawLifter(bytes.fromhex('85c0 7406 b807000000 c3 b809000000 c3'), base=0x401000, comments=False)
        lifter.cov = True
        with patch.dict(os.environ, {'SCHEDULE':'0'}): translated, _ = lifter.lift(0x401000)
        source = '''#include "cpu.h"
#include <assert.h>
uint32_t fc[32], bc[32], *g_cov=fc, *g_bcov=bc, g_last_fn;
int g_prof_on=1;
''' + translated + '''
int main(void) {
  mem_init(); mem_commit(0x10000,0x10000); CPU cpu={0}, *c=&cpu;
  c->esp=0x18000; c->eax=1; PUSH32(123); sub_00401000(c);
  assert(c->eax==7 && fc[0]==1 && bc[0]==1 && bc[4]==1 && bc[10]==0);
  c->eax=0; PUSH32(123); sub_00401000(c);
  assert(c->eax==9 && fc[0]==2 && bc[0]==2 && bc[4]==1 && bc[10]==1);
  g_prof_on=0; g_bcov=0; PUSH32(123); sub_00401000(c); assert(fc[0]==2);
  return 0;
}
'''
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory); (p/'probe.c').write_text(source)
            subprocess.run(['clang','-O1','-I'+str(ROOT/'runtime'),str(p/'probe.c'),str(ROOT/'runtime/mem.c'),'-lm','-o',str(p/'probe')],check=True)
            subprocess.run([str(p/'probe')],check=True,timeout=5)
            result=inventory(p)
            self.assertEqual(result['functions'],[0x401000])
            self.assertEqual(result['blocks'],[0x401000,0x401004,0x40100a])

    def test_com_interface_slots_match_the_runtime(self):
        interfaces=com_inventory()
        self.assertEqual(interfaces[2]['methods'][18],'GetSurfaceLevel/GetCubeMapSurface')
        self.assertEqual(interfaces[3]['methods'][11],'Lock')
        self.assertEqual(interfaces[5]['methods'][13],'LockRect')
        self.assertEqual(interfaces[14]['name'],'IDirectSound')
        self.assertEqual(interfaces[15]['methods'][18],'Stop')

    def test_lift_failures_remain_in_discovered_denominator(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)
            (p/'failed.c').write_text('void sub_00401000(CPU *c) { unsupported_insn(c, 0x401000u,"lift-error"); }')
            result=inventory(p)
            self.assertEqual(result['functions'],[])
            self.assertEqual(result['uninstrumentedFunctions'],[0x401000])
            self.assertEqual(result['liftFailures'],[0x401000])

    def test_merge_unions_runs_and_rejects_mismatched_evidence(self):
        manifest={'generation':'abc','profile':{'sha256':'123'},'functions':[1,2], 'blocks':[1,2,3],
                  'uninstrumentedFunctions':[4],'denominator':'test','trapSites':[]}
        report={'schema':1,'generation':'abc','profile':manifest['profile'],'executedFunctions':[1],
                'executedBlocks':[1,2],'unimplementedImports':[],'scenarios':[], 'comMapping':2}
        result=merge(manifest,[report,{**report,'executedFunctions':[2]}])
        self.assertEqual(result['functions'],{'executed':2,'discovered':3,'percent':66.67})
        self.assertEqual(result['blocks']['executed'],2)
        self.assertEqual(result['unexecutedFunctions'],[4])
        for override in [{'generation':'other'},{'profile':{}},{'executedFunctions':[5]},{'executedBlocks':[4]}]:
            with self.assertRaises(ValueError): merge(manifest,[{**report,**override}])


if __name__ == '__main__': unittest.main()
