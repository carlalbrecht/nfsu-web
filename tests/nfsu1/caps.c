#include "cpu.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
void d3d9_fill_caps(uint32_t);
int main(void) {
    mem_init(); mem_commit(0x10000, 0x1000);
    memset(g_mem+0x10000, 0xa5, 0x400);
    unsetenv("D3D_SM"); d3d9_fill_caps(0x10100);
    for (unsigned a=0x10000; a<0x10100; a++) assert(MR8(a)==0xa5);
    /* Adjacent data must survive the exact 304-byte D3DCAPS9 output. */
    for (unsigned a=0x10230; a<0x10400; a++) assert(MR8(a)==0xa5);
    assert(MR32(0x10158)==4096 && MR32(0x101c4)==0xfffe0200);
    setenv("D3D_SM", "11", 1); d3d9_fill_caps(0x10100);
    assert(MR32(0x101c4)==0xfffe0101 && MR32(0x101cc)==0xffff0101);
    puts("D3DCAPS9 boundary and shader-version checks passed");
}
