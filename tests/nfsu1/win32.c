#include "cpu.h"
#include <assert.h>
#include <stdio.h>
int nfsu1_win32(CPU *, const char *, uint32_t *);
static uint32_t last_error;
void win32_set_last_error(CPU *c, uint32_t error) { (void)c; last_error = error; }
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
    MR32(cpu.esp) = 0x800; MR32(cpu.esp + 4) = 1;
    MR32(cpu.esp + 8) = 0x10300; MR32(cpu.esp + 12) = 0;
    MR32(cpu.esp + 16) = 0x10400; MR32(cpu.esp + 20) = 12;
    MR16(0x10300) = 2024; MR16(0x10302) = 2; MR16(0x10306) = 29;
    memset(g_mem + 0x10400, 0xa5, 32);
    assert(nfsu1_win32(&cpu, "GetDateFormatA", &result) && result == 10);
    assert(!strcmp((char *)g_mem + 0x10400, "2/29/2024") && MR8(0x1040a) == 0xa5);
    MR32(cpu.esp + 20) = 0; MR32(cpu.esp + 16) = 0;
    assert(nfsu1_win32(&cpu, "GetDateFormatA", &result) && result == 10);
    MR32(cpu.esp + 20) = 9; MR32(cpu.esp + 16) = 0x10400;
    MR8(0x10400) = 0xa5;
    assert(nfsu1_win32(&cpu, "GetDateFormatA", &result) && !result && last_error == 122);
    assert(MR8(0x10400) == 0xa5);
    MR16(0x10300) = 2023;
    assert(nfsu1_win32(&cpu, "GetDateFormatA", &result) && !result && last_error == 87);
    /* Time formatting ignores the invalid date fields, as Windows does. */
    MR16(0x10308) = 23; MR16(0x1030a) = 7; MR16(0x1030c) = 42;
    MR32(cpu.esp + 4) = 2; MR32(cpu.esp + 20) = 12;
    assert(nfsu1_win32(&cpu, "GetTimeFormatA", &result) && result == 9);
    assert(!strcmp((char *)g_mem + 0x10400, "11:07 PM"));
    strcpy((char *)g_mem + 0x10500, "HH':'mm"); MR32(cpu.esp + 12) = 0x10500;
    assert(nfsu1_win32(&cpu, "GetTimeFormatA", &result) && result == 6);
    assert(!strcmp((char *)g_mem + 0x10400, "23:07"));
    MR16(0x10308) = 24;
    assert(nfsu1_win32(&cpu, "GetTimeFormatA", &result) && !result && last_error == 87);
    puts("Underground 1 string and save timestamp API checks passed");
    return 0;
}
