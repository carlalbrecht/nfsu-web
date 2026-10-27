/* Compatibility seams for optional UG2 runtime features. No guest patches. */
#include "cpu.h"
#include "module.h"
#include "widescreen.h"
#include <stdio.h>

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
