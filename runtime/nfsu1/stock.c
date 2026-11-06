/* Compatibility seams for optional UG2 runtime features. No guest patches. */
#include "cpu.h"
#include "gamepad.h"
#include "module.h"
#include "widescreen.h"
#include <stdio.h>
#include <string.h>

/* UG1 adds DIMOUSESTATE deltas directly to its 640x480 front-end cursor
 * (4130d0 -> 70649c/7064a0; 4f6080 subtracts 320/240). Render pixels are
 * therefore not mouse units. Rebase the browser's staged absolute position
 * against that accumulator, so first clicks, clipped edges, resolution
 * changes and returning from outside the canvas cannot leave an offset.
 * Only the API result changes; the original game updates its own cursor. */
void nfsu1_mouse_state(unsigned char *state) {
    void metal_get_cursor(int *, int *), metal_game_size(unsigned *, unsigned *);
    if (!mem_is_committed(0x7064a3u)) return;
    unsigned w = 0, h = 0;
    int x = 0, y = 0;
    metal_game_size(&w, &h);
    if (!w || !h) return;
    metal_get_cursor(&x, &y);
    int ux = (int)((int64_t)x * 640 / w), uy = (int)((int64_t)y * 480 / h);
    if (ux < 0) ux = 0; else if (ux > 639) ux = 639;
    if (uy < 0) uy = 0; else if (uy > 479) uy = 479;
    uint32_t dx = (uint32_t)ux - MR32(0x70649cu), dy = (uint32_t)uy - MR32(0x7064a0u);
    memcpy(state, &dx, 4); memcpy(state + 4, &dy, 4);
}

/* No additional guest DLL has been translated for this executable yet. */
typedef struct { uint32_t iat; const char *dll, *name; int nargs; } ImpEnt;
const uint32_t g_srv_imp_count = 0, g_srv_fn_count = 0;
const ImpEnt g_srv_imp[1] = {{0}};
const uint32_t g_srv_fn_addr[1] = {0};
const mod_fn g_srv_fn_ptr[1] = {0};
const ModInfo g_srv_modinfo = {"server.dll", "", 0x00a00000u, 0, 0, 0, 0, 0, 0};

int g_efx_stat, g_dx_in_pass;
uint32_t g_fx_epoch;
void overrides_report(void) {}
void d3dx_hle_report(void) {}
void efx_stat_note(CPU *c, uint32_t addr) { (void)c; (void)addr; }
void autotest_note_trap(uint32_t ip, const char *name) { (void)ip; (void)name; }
void autotest_note_unimpl(const char *dll, const char *name, uint32_t ip) {
    fprintf(stderr, "NFSU1: unimplemented import %s!%s at %08x\n", dll, name, ip);
}
void autotest_on_present(CPU *c) { (void)c; }
void ws_set_mapping(float scale) { (void)scale; }
double ws_render_factor(void) { return 1.0; }
double ws_max_pixels(void) { return 0.0; }
float ws_persp_x(void) { return 1.0f; }
float ws_persp_y(void) { return 1.0f; }
float ws_ui_x(void) { return 1.0f; }
float ws_ui_y(void) { return 1.0f; }
int ws_fill_target(void) { return 0; }
int ws_take_border_quad(void) { return 0; }
void ws_report(void) {}
void headlights_vs_ramp(float scale, float offset) { (void)scale; (void)offset; }
void headlights_report(void) {}
void app_local_network_notice(void) {}
long metal_frames(void);
long autotest_frame(void) { return metal_frames(); }
const char *autotest_screen(void) { return 0; }
uint32_t g_fe_mgr;
void guest_cpu_mark(void) {}
int hfr_mode_off(void) { return 1; }
int hfr_display_live(void) { return 1; }
uint64_t hfr_vclock_floor_us(void) { return 0; }
const char *language_registry(void) { return "English"; }
void roam_game_parked(int on) { (void)on; }
void olfilter_lobby_mark(uint32_t link, uint8_t *data, int length) { (void)link; (void)data; (void)length; }
void olfilter_lobby_sent(uint32_t link, uint8_t *data, int length) { (void)link; (void)data; (void)length; }
void online_lobby_read(uint32_t link, const uint8_t *data, int length) { (void)link; (void)data; (void)length; }
int hfr_mailbox(void) { return 0; }
void hfr_note_vsync(double time, double duration) { (void)time; (void)duration; }
int mprace_owns_input(void) { return 0; }
void sms_request(int id) { (void)id; }
void photo_input(int command, int a, int b) { (void)command; (void)a; (void)b; }
void horn_mix(float *acc, unsigned frames, unsigned rate) { (void)acc; (void)frames; (void)rate; }
void carsfx_mix(float *acc, unsigned frames, unsigned rate) { (void)acc; (void)frames; (void)rate; }

/* Optional UG2 features called by the shared D3D, input, file and timing
 * backends. The stock UG1 target uses one viewport and passes input through. */
int hfr_fast(void) { return 0; }
uint64_t hfr_fast_frame_us(void) { return 0; }
double hfr_frame_input_ms(void) { return 0; }
void hfr_note_input_read(int pad) { (void)pad; }
void hfr_io_begin(void) {}
void hfr_io_end(void) {}
void garage_profile_written(const char *path) { (void)path; }
void garage_profile_deleted(const char *path) { (void)path; }
void savegame_profile_written(void) {}
int split_backbuffer_region(uint32_t surface, uint32_t rect[4]) {
    (void)surface; (void)rect; return 0;
}
int split_blur_region(uint32_t device, uint32_t src, uint32_t dst, uint32_t filter, int rect[4]) {
    (void)device; (void)src; (void)dst; (void)filter; (void)rect; return 0;
}
int split_effect_region(uint32_t rect[2]) { (void)rect; return 0; }
int split_render_limit(void) { return 1; }
int split_kb_hidden(unsigned key) { (void)key; return 0; }
int split_menu_pad(PadState *pad) { (void)pad; return 0; }
void split_keyboard_device(PadState *pad) { (void)pad; }
int look_back_held(const PadState *pad) { (void)pad; return 0; }
uint32_t showoff_pad(uint32_t buttons, uint32_t mask) { (void)mask; return buttons; }
void roam_plat_lobby_input(int action, uint32_t host, uint32_t lobby, uint32_t race) {
    (void)action; (void)host; (void)lobby; (void)race;
}
void roam_plat_name_piece(int offset, int total, const char *bytes, int length) {
    (void)offset; (void)total; (void)bytes; (void)length;
}
void roam_plat_name2_piece(int offset, int total, const char *bytes, int length) {
    (void)offset; (void)total; (void)bytes; (void)length;
}
