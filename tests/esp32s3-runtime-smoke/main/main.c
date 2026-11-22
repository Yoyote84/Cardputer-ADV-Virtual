#include <stdio.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

void app_main(void)
{
    ESP_LOGI("CARDPUTER_SMOKE", "CARDPUTER_RUNTIME_OK");

    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000));
        ESP_LOGI("CARDPUTER_SMOKE", "CARDPUTER_RUNTIME_HEARTBEAT");
    }
}
