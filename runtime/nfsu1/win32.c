/* Windows APIs additionally used by Underground 1. Arguments follow the
 * import bridge's popped return address, so arg0 is at guest ESP. */
#include "cpu.h"
#include <string.h>

static uint8_t upper_1252(uint8_t ch) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= 0xe0 && ch <= 0xf6) || (ch >= 0xf8 && ch <= 0xfe))
        return ch - 0x20;
    switch (ch) { case 0x9a: return 0x8a; case 0x9c: return 0x8c;
                  case 0x9e: return 0x8e; case 0xff: return 0x9f; }
    return ch;
}

int nfsu1_win32(CPU *c, const char *name, uint32_t *result) {
    uint32_t a = MR32(c->esp);
    if (!strcmp(name, "CharUpperA")) {
        if (!(a >> 16)) { *result = upper_1252((uint8_t)a); return 1; }
        for (uint32_t p = a; mem_is_committed(p) && MR8(p); p++) MR8(p) = upper_1252(MR8(p));
        *result = a;
        return 1;
    }
    if (!strcmp(name, "lstrcmpiA")) {
        uint32_t b = MR32(c->esp + 4);
        uint8_t x, y;
        do {
            x = upper_1252(MR8(a++)); y = upper_1252(MR8(b++));
        } while (x && x == y);
        *result = (uint32_t)((int)x - (int)y);
        return 1;
    }
    return 0;
}
