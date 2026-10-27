/* Stock Underground entry point, shared by the native diagnostic and Wasm. */
#include "cpu.h"
#include "decls.h"
#include <setjmp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern jmp_buf g_exit_jmp;
extern int g_exit_code, g_exit_armed;
extern CPU *g_cur_cpu;
void dispatch_init(void), dispatch_report(void), win32_init(void), win32_report(void);
void guest_lock(CPU *), guest_unlock(void);
void fileio_set_root(const char *), fileio_set_write_root(const char *);
void fileio_set_readonly_root(int), win32_set_trace_max(uint32_t);
void nfsu2_sha256(const void *, size_t, uint8_t[32]);
int mem_load_pe(const char *);

static int verify_image(const char *path) {
    FILE *file = fopen(path, "rb");
    if (!file) { perror(path); return 0; }
    if (fseek(file, 0, SEEK_END)) { fclose(file); return 0; }
    long length = ftell(file);
    if (length < 0 || length > 64 * 1024 * 1024) { fclose(file); return 0; }
    rewind(file);
    uint8_t *bytes = malloc((size_t)length);
    if (!bytes) { fclose(file); return 0; }
    int ok = fread(bytes, 1, (size_t)length, file) == (size_t)length;
    fclose(file);
    uint8_t hash[32]; char hex[65];
    if (ok) {
        nfsu2_sha256(bytes, (size_t)length, hash);
        for (int i = 0; i < 32; i++) snprintf(hex + i * 2, 3, "%02x", hash[i]);
        ok = strcmp(hex, GAME_EXE_SHA256) == 0;
    }
    free(bytes);
    if (!ok) fprintf(stderr, "Executable hash does not match this generated module\n");
    return ok;
}

int main(int argc, char **argv) {
    const char *exe = argc > 1 ? argv[1] : "/data/Speed.exe";
    if (!verify_image(exe)) return 2;
    mem_init();
    mem_fault_handler_install();
    if (mem_load_pe(exe)) return 2;
    const uint32_t teb = 0x00c00000u, peb = 0x00c10000u;
    const uint32_t stack_low = 0x05000000u, stack_high = 0x05ff0000u;
    mem_commit(teb, 0x20000u);
    mem_commit(stack_low, stack_high - stack_low);
    MR32(teb) = 0xffffffffu;
    MR32(teb+4) = stack_high; MR32(teb+8) = stack_low;
    MR32(teb+0x18) = teb; MR32(teb+0x20) = 100; MR32(teb+0x24) = 1;
    MR32(teb+0x2c) = teb+0x1000; MR32(teb+0x30) = peb;
    MR32(peb+8) = 0x00400000u; MR32(peb+0xa4) = 5; MR32(peb+0xa8) = 1;
    fileio_set_root(exe);
    const char *save = getenv("NFSU1_SAVEDIR");
    fileio_set_write_root(save ? save : "/save");
    fileio_set_readonly_root(1);
    dispatch_init(); win32_init();
    { void com_set_trace(int); com_set_trace(getenv("COMTRACE") != NULL); }
#ifdef __wasm__
    { void input_web_init(void); input_web_init(); }
#endif
    win32_set_trace_max(getenv("TRACE_MAX") ? (uint32_t)atoi(getenv("TRACE_MAX")) : 80);
    static CPU cpu;
    cpu.esp = stack_high - 0x1000; cpu.fcw = 0x027f;
    cpu.fs_base = teb; cpu.gs_base = teb;
    g_cur_cpu = &cpu;
    fprintf(stderr, "NFSU1: executing stock entry point 0x%08x\n", GAME_ENTRY_VA);
    if (!setjmp(g_exit_jmp)) {
        g_exit_armed = 1;
        guest_lock(&cpu);
        CPU *c = &cpu;
        PUSH32(0xdeadc0deu);
        GAME_ENTRY(&cpu);
        guest_unlock();
        fprintf(stderr, "NFSU1: entry returned eax=%08x eip=%08x\n", cpu.eax, cpu.eip);
    } else {
        guest_unlock();
        fprintf(stderr, "NFSU1: ExitProcess(%d)\n", g_exit_code);
    }
    win32_report(); dispatch_report();
    return g_exit_code;
}
