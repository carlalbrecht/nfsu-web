/* D3D9 capability output shared by both game ports. */
#include "cpu.h"
#include <stdlib.h>

void d3d9_fill_caps(uint32_t p){
    /* D3DCAPS9 is 304 bytes. Writing past it corrupts the adjacent
     * resolution-availability table in Underground 1. */
    mem_commit(p,0x130); memset(g_mem+p,0,0x130);
    MR32(p+0x00)=1; MR32(p+0x08)=0x00020000; MR32(p+0x0C)=0x00000002;
    MR32(p+0x10)=0x00000020; MR32(p+0x14)=0x80000001; MR32(p+0x18)=1;
    MR32(p+0x1C)=0x001BBEF0; MR32(p+0x20)=0x0000033F; MR32(p+0x24)=0x0F730191;
    MR32(p+0x28)=0x000000FF; MR32(p+0x2C)=0x00003FFF; MR32(p+0x30)=0x00003FFF;
    MR32(p+0x34)=0x000000FF; MR32(p+0x38)=0x0008FFFF; MR32(p+0x3C)=0x0021EDA5;
    MR32(p+0x40)=0x07030700; MR32(p+0x44)=0x07030700; MR32(p+0x48)=0x07030700;
    MR32(p+0x4C)=0x0000003F; MR32(p+0x50)=0x0000003F; MR32(p+0x54)=0x0000001F;
    MR32(p+0x58)=4096; MR32(p+0x5C)=4096; MR32(p+0x60)=256; MR32(p+0x64)=8192;
    MR32(p+0x68)=4096; MR32(p+0x6C)=16;
    MRF32(p+0x70)=1.0e10f; MRF32(p+0x74)=-32768.0f; MRF32(p+0x78)=-32768.0f;
    MRF32(p+0x7C)=32768.0f; MRF32(p+0x80)=32768.0f; MRF32(p+0x84)=0.0f;
    MR32(p+0x88)=0x000001FF; MR32(p+0x8C)=0x00100008; MR32(p+0x90)=0x03FFFFFF;
    MR32(p+0x94)=8; MR32(p+0x98)=8; MR32(p+0x9C)=0x0000013B;
    MR32(p+0xA0)=8; MR32(p+0xA4)=6; MR32(p+0xA8)=4; MR32(p+0xAC)=8;
    MRF32(p+0xB0)=256.0f; MR32(p+0xB4)=1048575; MR32(p+0xB8)=1048575;
    MR32(p+0xBC)=16; MR32(p+0xC0)=508;
    { /* Shader version settable from the environment (SM=0 -> fixed function) */
      const char *sm = getenv("D3D_SM");
      uint32_t vs=0xFFFE0200u, ps=0xFFFF0200u;
      if (sm){ int v=atoi(sm);
        if (v==0){ vs=0; ps=0; }
        else if (v==11){ vs=0xFFFE0101u; ps=0xFFFF0101u; }
        else if (v==14){ vs=0xFFFE0101u; ps=0xFFFF0104u; }
      }
      MR32(p+0xC4)=vs; MR32(p+0xC8)=256; MR32(p+0xCC)=ps; }
    MRF32(p+0xD0)=8.0f; MR32(p+0xD4)=0x00000051;
}
