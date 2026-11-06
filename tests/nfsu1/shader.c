/* Matrix instructions must use each vertex's bone index, including every row.
 * Emit the actual WGSL and CPU-oracle vectors for the browser regression. */
#include "vsemu.h"
#include "web/wgsl.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

int main(int argc,char **argv){
    assert(argc==2);
    static VSConst k;
    for (int bone=0;bone<2;bone++) {
        for (int row=0;row<4;row++) k.f[bone*4+row][row]=(float)(bone ? row+2 : 1);
        if (bone) { k.f[4][3]=10; k.f[5][3]=20; k.f[6][3]=30; k.f[7][3]=1; }
    }
    for (unsigned op=20;op<=24;op++) {
        unsigned mask=(op==21||op==23) ? 7u : op==24 ? 3u : 15u;
        uint32_t tok[]={0xfffe0101u,1,0xb0010000u,0x90000001u,
                        op,0xc0000000u|(mask<<16),0x90e40000u,0xa0e42000u,0xffff};
        VSProg *p=vs_compile(tok,sizeof tok/4); assert(p && !vs_unknown(p));
        int decl[16][2]; for(int i=0;i<16;i++){ decl[i][0]=-1; decl[i][1]=0; }
        decl[0][0]=0; decl[0][1]=3; decl[1][0]=16;
        char code[32768],path[1024]; int n=vs_to_wgsl(p,(int)op,(const int (*)[2])decl,code,sizeof code);
        assert(n>0);
        assert(strstr(code,"clamp(a0.x + 0") && strstr(code,"clamp(a0.x + 1"));
        snprintf(path,sizeof path,"%s/vs_%u.wgsl",argv[1],op);
        FILE *f=fopen(path,"wb"); assert(f); fwrite(code,1,(size_t)n,f); fclose(f);
        snprintf(path,sizeof path,"%s/vs_%u.vec",argv[1],op);
        f=fopen(path,"wb"); assert(f);
        const uint32_t header[]={0x31565356u,2,20,0};
        const float vertices[]={1,2,3,1,0, 1,2,3,1,4};
        fwrite(header,4,4,f); fwrite(vertices,4,10,f); fwrite(k.f,16,256,f);
        for(int bone=0;bone<2;bone++) {
            float in[16][4]={{0}}; memcpy(in[0],vertices+bone*5,16); in[1][0]=(float)(bone*4);
            VSOut out; assert(vs_run(p,&k,(const float (*)[4])in,&out));
            float expectedX=bone ? (op<=21 ? 12.f : 2.f) : 1.f;
            assert(out.pos[0]==expectedX);
            float v[29]; memcpy(v,out.pos,16); memcpy(v+4,out.col,32); memcpy(v+12,out.tex,64); v[28]=1;
            fwrite(v,4,29,f);
        }
        fclose(f); vs_free(p);
    }
    puts("Shader matrix regression: five instructions, two bone transforms; browser vectors written");
    return 0;
}
