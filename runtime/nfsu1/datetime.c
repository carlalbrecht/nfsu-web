/* Save timestamp APIs used by the profiled English executable. The virtual
 * Windows locale is en-US. Other locales/format options return an error;
 * they must be implemented before enabling other language profiles.
 * Contracts: learn.microsoft.com/windows/win32/api/datetimeapi/
 * nf-datetimeapi-getdateformata and nf-datetimeapi-gettimeformata. */
#include "cpu.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

void win32_set_last_error(CPU *, uint32_t);

static uint32_t failure(CPU *c, uint32_t error) {
    win32_set_last_error(c, error);
    return 0;
}

int nfsu1_datetime(CPU *c, const char *name, uint32_t *result) {
    int date = !strcmp(name, "GetDateFormatA");
    if (!date && strcmp(name, "GetTimeFormatA")) return 0;
    uint32_t locale = MR32(c->esp), flags = MR32(c->esp + 4);
    uint32_t st = MR32(c->esp + 8), picture = MR32(c->esp + 12);
    uint32_t output = MR32(c->esp + 16), capacity = MR32(c->esp + 20);
    if (locale != 0x800 && locale != 0x400 && locale != 0x409) {
        *result = failure(c, 87); return 1; /* ERROR_INVALID_PARAMETER */
    }
    if ((date && (flags > 1 || (picture && flags))) || (!date && (flags & ~15u))) {
        *result = failure(c, 1004); return 1; /* ERROR_INVALID_FLAGS */
    }
    struct tm now = {0};
    if (st) {
        now.tm_year = MR16(st) - 1900; now.tm_mon = MR16(st + 2) - 1;
        now.tm_mday = MR16(st + 6); now.tm_hour = MR16(st + 8);
        now.tm_min = MR16(st + 10); now.tm_sec = MR16(st + 12);
        if (date) {
            int year = now.tm_year + 1900, month = now.tm_mon;
            static const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
            int leap = !(year % 4) && (year % 100 || !(year % 400));
            if (year < 1601 || year > 9999 || month < 0 || month > 11 ||
                now.tm_mday < 1 || now.tm_mday > days[month] + (month == 1 && leap)) {
                *result = failure(c, 87); return 1;
            }
        } else if (now.tm_hour > 23 || now.tm_min > 59 || now.tm_sec > 59 || MR16(st + 14) > 999) {
            *result = failure(c, 87); return 1;
        }
    } else {
        time_t t = time(NULL);
        if (!localtime_r(&t, &now)) { *result = failure(c, 87); return 1; }
    }
    char formatted[128];
    int length;
    if (date && !picture) {
        length = snprintf(formatted, sizeof formatted, "%d/%d/%04d", now.tm_mon + 1, now.tm_mday, now.tm_year + 1900);
    } else if (!date && (!picture || !strcmp((char *)g_mem + picture, "HH':'mm"))) {
        int hour = now.tm_hour;
        int use24 = picture || (flags & 8);
        const char *marker = (picture || (flags & 4)) ? "" : hour < 12 ? " AM" : " PM";
        if (!use24) hour = hour % 12 ? hour % 12 : 12;
        if (flags & 1) length = snprintf(formatted, sizeof formatted, "%d%s", hour, marker);
        else if (picture || (flags & 2)) length = snprintf(formatted, sizeof formatted, use24 ? "%02d:%02d%s" : "%d:%02d%s", hour, now.tm_min, marker);
        else length = snprintf(formatted, sizeof formatted, use24 ? "%02d:%02d:%02d%s" : "%d:%02d:%02d%s", hour, now.tm_min, now.tm_sec, marker);
    } else {
        *result = failure(c, 87); return 1; /* unsupported format picture */
    }
    uint32_t required = (uint32_t)length + 1; /* Windows includes the NUL. */
    if (!capacity) { *result = required; return 1; }
    if (!output || capacity < required || capacity > INT32_MAX) {
        *result = failure(c, 122); return 1; /* ERROR_INSUFFICIENT_BUFFER */
    }
    memcpy(g_mem + output, formatted, required);
    *result = required;
    return 1;
}
