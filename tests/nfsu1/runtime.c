/* Exercise actual COM dispatch and ownership, with a recording audio backend. */
#include "cpu.h"
#include "gfx.h"
#include <assert.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

void heap_init(void);
uint32_t com_directsoundcreate(uint32_t);
uint32_t com_direct3dcreate9(void);
uint32_t com_directinput8create(uint32_t);
int com_call(CPU *, uint32_t);
static unsigned next_voice, live[32], playing[32], releases;
static unsigned render_target;
static TVert drawn_vertex;
static int pointer_x, pointer_y;
void metal_get_cursor(int *x, int *y){ *x=pointer_x; *y=pointer_y; }
void metal_fill_mouse(unsigned char *dst, unsigned n){
    memset(dst,0,n); dst[12]=0x80;
    int wheel=120; memcpy(dst+8,&wheel,4);
}
void metal_draw_tv(const TVert *v,unsigned n,unsigned prim,unsigned tex){
    (void)prim; (void)tex; assert(n); drawn_vertex=v[0];
}
void metal_set_render_target(unsigned target){ render_target = target; }
int audio_register(uint32_t data, uint32_t bytes, uint32_t rate, uint32_t chans, uint32_t bits){
    (void)data; (void)bytes; (void)rate; (void)chans; (void)bits;
    assert(next_voice+1 < 32); live[++next_voice] = 1; return (int)next_voice;
}
void audio_unregister(int id){ assert(live[id]); live[id] = playing[id] = 0; releases++; }
void audio_play(int id, int loop){ (void)loop; assert(live[id]); playing[id] = 1; }
void audio_stop(int id){ assert(live[id]); playing[id] = 0; }
int audio_duplicate(int id){ assert(live[id]); return audio_register(0,0,0,0,0); }
static CPU cpu;
static uint32_t call(uint32_t object, unsigned slot, unsigned nargs, ...){
    CPU *c = &cpu; c->esp = 0x18000;
    MR32(c->esp) = 0xdeadbeef; MR32(c->esp+4) = object;
    va_list ap; va_start(ap, nargs);
    for (unsigned i=0;i<nargs;i++) MR32(c->esp+8+4*i) = va_arg(ap, uint32_t);
    va_end(ap);
    assert(com_call(c, MR32(MR32(object)+4*slot)));
    assert(c->esp == 0x18000+8+4*nargs && c->eip == 0xdeadbeef);
    return c->eax;
}
static uint32_t device(void){ assert(!com_directsoundcreate(0x11000)); return MR32(0x11000); }
static uint32_t buffer(uint32_t ds){
    MR32(0x11100)=36; MR32(0x11104)=0; MR32(0x11108)=4096;
    assert(!call(ds,3,3,0x11100u,0x11000u,0u)); return MR32(0x11000);
}
static void menu_mouse(void){
    void metal_set_game_size(unsigned, unsigned);
    mem_commit(0x706000,0x1000);
    assert(!com_directinput8create(0x11000)); uint32_t di=MR32(0x11000);
    MR32(0x11300)=0x6f1d2b60u;
    assert(!call(di,3,3,0x11300u,0x11000u,0u)); uint32_t mouse=MR32(0x11000);
    metal_set_game_size(800,600);
    pointer_x=400; pointer_y=300;
    MR32(0x70649c)=200; MR32(0x7064a0)=200;
    assert(!call(mouse,9,2,20u,0x11400u));
    assert((int32_t)MR32(0x11400)==120 && (int32_t)MR32(0x11404)==40);
    assert(MR32(0x11408)==120 && MR8(0x1140c)==0x80);
    /* The stock consumer adds these deltas to its own cursor. */
    MR32(0x70649c)+=MR32(0x11400); MR32(0x7064a0)+=MR32(0x11404);
    assert(!call(mouse,9,2,20u,0x11400u));
    assert(!MR32(0x11400) && !MR32(0x11404));
    /* An edge, a render-size change and a re-entry must not accumulate drift. */
    pointer_x=799; pointer_y=599;
    assert(!call(mouse,9,2,16u,0x11400u));
    assert(MR32(0x11400)==319 && MR32(0x11404)==239);
    MR32(0x70649c)=639; MR32(0x7064a0)=479;
    metal_set_game_size(640,480); pointer_x=160; pointer_y=120;
    assert(!call(mouse,9,2,20u,0x11400u));
    assert((int32_t)MR32(0x11400)==-479 && (int32_t)MR32(0x11404)==-359);
    assert(MR32(0x11408)==120 && MR8(0x1140c)==0x80);
    call(mouse,2,0); call(di,2,0);
    puts("Menu mouse: 640x480 coordinates, first click, repeat, edge and resolution change passed");
}
static void cube_faces(void){
    uint32_t d3d=com_direct3dcreate9();
    MR32(0x11200)=800; MR32(0x11204)=600;
    assert(!call(d3d,16,6,0u,1u,0u,0x40u,0x11200u,0x11000u));
    uint32_t dev=MR32(0x11000);
    /* SetFVF must replace the previous FLOAT2 declaration, even with the
     * same programmable shader. The minimap uses FLOAT4 projected UVs. */
    const uint32_t shader[]={0xfffe0101u,
        31,0x80000000u,0x900f0000u,31,0x8000000au,0x900f0001u,31,0x80000005u,0x900f0002u,
        1,0xc00f0000u,0x90e40000u,1,0xd00f0000u,0x90e40001u,
        1,0xe00f0000u,0x90e40002u,0xffffu};
    const unsigned char decl[]={0,0,0,0,2,0,0,0, 0,0,12,0,4,0,10,0,
        0,0,16,0,1,0,5,0, 255,0,0,0,17,0,0,0};
    memcpy(g_mem+0x12000,shader,sizeof shader); memcpy(g_mem+0x12100,decl,sizeof decl);
    assert(!call(dev,91,2,0x12000u,0x11000u)); uint32_t vs=MR32(0x11000);
    assert(!call(dev,92,1,vs));
    assert(!call(dev,86,2,0x12100u,0x11000u)); uint32_t vd=MR32(0x11000);
    assert(!call(dev,87,1,vd));
    const float vertex[]={0,0,1,0,0.001f,0.002f,0.004f,0.004f};
    for(unsigned v=0;v<3;v++) memcpy(g_mem+0x12200+32*v,vertex,sizeof vertex);
    assert(!call(dev,83,4,4u,1u,0x12200u,32u)); assert(drawn_vertex.t[0][3]==1);
    assert(!call(dev,89,1,0x20142u));
    assert(!call(dev,83,4,4u,1u,0x12200u,32u));
    assert(drawn_vertex.t[0][2]==0.004f && drawn_vertex.t[0][3]==0.004f);
    assert(!call(dev,87,1,vd));
    assert(!call(dev,83,4,4u,1u,0x12200u,32u)); assert(drawn_vertex.t[0][3]==1);
    assert(!call(dev,89,1,0x20142u));
    assert(!call(dev,83,4,4u,1u,0x12200u,32u)); assert(drawn_vertex.t[0][3]==0.004f);
    puts("Vertex layouts: SetFVF and explicit declarations switch without losing projected UVs");
    assert(!call(dev,25,7,64u,1u,1u,21u,0u,0x11000u,0u));
    uint32_t cube=MR32(0x11000), id=MR32(cube+28), faces[6];
    for (unsigned face=0;face<6;face++){
        // The shared texture vtable slot must preserve the extra face argument.
        assert(!call(cube,18,3,face,0u,0x11000u)); faces[face]=MR32(0x11000);
        assert(!call(dev,37,2,0u,faces[face]));
        assert(render_target == (id | ((face+1u)<<16)));
        for (unsigned other=0;other<face;other++) assert(faces[other]!=faces[face]);
    }
    assert(!call(cube,18,3,3u,0u,0x11000u)); assert(MR32(0x11000)==faces[3]);
    call(faces[3],2,0);
    assert(!call(dev,37,2,0u,0u));
    for (unsigned face=0;face<6;face++) call(faces[face],2,0);
    assert(call(cube,2,0)==0);
    puts("Cube surfaces: all six distinct faces reach the renderer through real COM dispatch");
}
int main(void){
    mem_init(); mem_commit(0x10000,0x10000); heap_init();
    uint32_t first=device(), second=device(); assert(first != second);
    uint32_t a=buffer(first), b=buffer(first), c=buffer(second);
    unsigned aid=MR32(a+28), bid=MR32(b+28), cid=MR32(c+28);
    assert(!call(a,12,3,0u,0u,1u)); assert(!call(b,12,3,0u,0u,1u)); assert(!call(c,12,3,0u,0u,1u));
    assert(call(a,1,0)==2); assert(call(a,2,0)==1); assert(playing[aid]);
    assert(call(first,1,0)==2); assert(call(first,2,0)==1); assert(playing[aid] && playing[bid]);
    assert(call(first,2,0)==0); assert(!live[aid] && !live[bid] && playing[cid] && releases==2);
    uint32_t d=buffer(second); unsigned did=MR32(d+28);
    assert(!call(second,5,2,d,0x11000u)); uint32_t dup=MR32(0x11000), dupid=MR32(dup+28);
    assert(MR32(d+8)==MR32(dup+8));
    assert(call(d,2,0)==0); assert(!live[did] && live[dupid]);
    assert(call(c,2,0)==0); assert(!live[cid] && live[dupid]);
    assert(call(second,2,0)==0); assert(!live[dupid] && releases==5);
    puts("DirectSound lifetime: independent devices, partial Release, playing teardown, unlink and duplicate PCM passed");
    cube_faces();
    menu_mouse();
    return 0;
}
