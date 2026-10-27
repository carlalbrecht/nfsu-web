#include "cpu.h"
#include <assert.h>
#include <stdio.h>
int nfsu1_win32(CPU *, const char *, uint32_t *);
int main(void) {
    mem_init(); mem_commit(0x10000, 0x1000);
    CPU cpu = {0}; cpu.esp = 0x10000;
    uint32_t result = 0;
    MR32(cpu.esp) = 'z';
    assert(nfsu1_win32(&cpu, "CharUpperA", &result) && result == 'Z');
    MR32(cpu.esp) = 0x10100;
    memcpy(g_mem+0x10100, "Abz\xe9\xff", 6);
    assert(nfsu1_win32(&cpu, "CharUpperA", &result) && result == 0x10100);
    assert(!memcmp(g_mem+0x10100, "ABZ\xc9\x9f", 6));
    memcpy(g_mem+0x10200, "abz\xe9\xff", 6); MR32(cpu.esp+4) = 0x10200;
    assert(nfsu1_win32(&cpu, "lstrcmpiA", &result) && result == 0);
    MR8(0x10200) = 'c';
    assert(nfsu1_win32(&cpu, "lstrcmpiA", &result) && (int32_t)result < 0);
    assert(!nfsu1_win32(&cpu, "UnknownApi", &result));
    puts("Underground 1 string API checks passed");
    return 0;
}
