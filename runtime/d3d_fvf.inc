/* SetFVF selects a vertex declaration, including texture coordinate widths.
 * Keep generated declarations stable for the same caches as explicit ones. */
static uint32_t fvf_declaration(uint32_t fvf){
    static struct { uint32_t fvf, decl; } cache[128];
    static unsigned used;
    for (unsigned i=0;i<used;i++) if (cache[i].fvf==fvf) return cache[i].decl;
    if (used==NEL(cache)) return 0;
    unsigned pos=fvf&0x400eu, textures=(fvf>>8)&15u;
    if (textures>8 || (pos!=2 && pos!=4 && pos!=0x4002 && (pos<6 || pos>14))) return 0;
    unsigned char el[16*8]={0}; unsigned n=0, off=0;
#define FVF_ELEM(type_,usage_,index_,bytes_) do { \
    el[n*8+2]=(unsigned char)off; el[n*8+3]=(unsigned char)(off>>8); \
    el[n*8+4]=(type_); el[n*8+6]=(usage_); el[n*8+7]=(index_); \
    n++; off+=(bytes_); \
} while(0)
    if (pos==4 || pos==0x4002) { FVF_ELEM(3,pos==4 ? 9 : 0,0,16); }
    else { FVF_ELEM(2,0,0,12); }
    if (pos>=6 && pos<=14){
        unsigned weights=(pos-4)/2, indices=fvf&(0x1000u|0x8000u);
        if (indices) weights--;
        if (weights){ unsigned count=weights>4 ? 4 : weights; FVF_ELEM(count-1,1,0,4*count); }
        if (indices){ FVF_ELEM((fvf&0x1000u) ? 5 : 4,2,0,4); }
        else if (weights==5){ FVF_ELEM(0,2,0,4); }
    }
    if (fvf&0x10u){ FVF_ELEM(2,3,0,12); }
    if (fvf&0x20u){ FVF_ELEM(0,4,0,4); }
    if (fvf&0x40u){ FVF_ELEM(4,10,0,4); }
    if (fvf&0x80u){ FVF_ELEM(4,10,1,4); }
    for (unsigned i=0;i<textures;i++){
        static const unsigned sizes[]={2,3,4,1};
        unsigned size=sizes[(fvf>>(16+2*i))&3u]; FVF_ELEM(size-1,5,i,4*size);
    }
#undef FVF_ELEM
    el[n*8]=255; el[n*8+4]=17; n++;
    uint32_t h=com_new(IF_VDECL,32), bytes=8*n, copy=gbuf_alloc(bytes);
    CH_FLAGS(h)|=CF_DEVICE;
    memcpy(g_mem+copy,el,bytes); MR32(h+4)=copy; MR32(h+8)=bytes;
    cache[used].fvf=fvf; cache[used++].decl=h;
    if (VB()) fprintf(stderr,"  [fvf] %08x -> declaration %08x, stride %u\n",fvf,h,off);
    return h;
}
