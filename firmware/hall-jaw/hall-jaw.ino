// SutureHero jaw sensor: nRF52840 Pro Micro / nice!nano-style board + OH49E/SS49E linear Hall sensor.
// Lance's board (2026-11-21). Arduino IDE board: "Seeed XIAO BLE Sense - nRF52840"
// (package "Seeed nRF52 mbed-enabled Boards"). Library: ArduinoBLE.
// (The non-mbed "Seeed nRF52 Boards" package failed to link its Bluefruit library on
// Lance's Windows PC; see docs/AGENT_HANDOFF.md.)
// Wiring: sensor pin 1 (VCC) -> 1.15, pin 2 (GND) -> GND, pin 3 (OUT) -> 0.02.
// Optional 100 nF capacitor across 1.15 and GND, close to the sensor.
// The sensor is powered from 1.15 only while reading, to save battery.
// The app side is src/input/BleHallSensorSource.ts (same UUIDs and packet layout).
//
// Two boards (needle driver + forceps): give each its own DEVICE_NAME so they can be
// told apart in Chrome's device list, e.g. "SutureHero Jaw" and "SutureHero Jaw 2".
#include <ArduinoBLE.h>
#include "nrf_gpio.h"

const char DEVICE_NAME[] = "SutureHero Jaw";  // change for the second board, e.g. "SutureHero Jaw 2"

// Battery level (2026-11-23): on nice!nano-style boards the battery feeds the chip's VDDH
// pin, which the chip can measure internally (no extra wiring). Set to false if the
// reported percentage is nonsense or the Hall readings misbehave after this change.
const bool READ_BATTERY = true;
const uint32_t BATTERY_PERIOD_MS = 30000;    // read the battery every 30 s
const float BATTERY_EMPTY_V = 3.3;           // LiPo voltage reported as 0 %
const float BATTERY_FULL_V = 4.2;            // LiPo voltage reported as 100 %

const int HALL_PIN = A0;                     // board pin 0.02
const uint32_t HALL_POWER_NRF_PIN = 32 + 15; // board pin 1.15
const uint32_t LED_NRF_PIN = 15;             // board pin 0.15: the blue LED on these boards (on when HIGH)
const int HALL_SETTLE_US = 200;              // time for the sensor output to settle after power-on
const int SAMPLES_PER_READING = 8;           // averaged to reduce noise
const int SAMPLE_PERIOD_MS = 10;             // about 100 readings per second
const uint32_t BLINK_PERIOD_MS = 5000;       // one flash every 5 seconds
const uint32_t FLASH_MS = 80;                // length of each flash
const uint32_t FLASH_GAP_MS = 150;           // gap between the two flashes while connected

// Each update is 6 bytes: raw value (uint16, 0-4095) + time since start in ms (uint32), little-endian.
BLEService hallService("5a1e0001-8f6c-4b8e-9d2a-3c4b5e6f7a80");
BLECharacteristic hallReading("5a1e0002-8f6c-4b8e-9d2a-3c4b5e6f7a80", BLERead | BLENotify, 6, true);
// Standard Bluetooth battery service: level in percent.
BLEService batteryService("180F");
BLEUnsignedCharCharacteristic batteryLevel("2A19", BLERead | BLENotify);

// Battery voltage from VDDH/5, read directly with the chip's ADC (SAADC), channel 7.
float readBatteryVolts() {
  volatile int16_t result = 0;
  NRF_SAADC->ENABLE = SAADC_ENABLE_ENABLE_Enabled;
  NRF_SAADC->RESOLUTION = SAADC_RESOLUTION_VAL_12bit;
  NRF_SAADC->CH[7].PSELP = SAADC_CH_PSELP_PSELP_VDDHDIV5;
  NRF_SAADC->CH[7].PSELN = SAADC_CH_PSELN_PSELN_NC;
  NRF_SAADC->CH[7].CONFIG = (SAADC_CH_CONFIG_GAIN_Gain1_6 << SAADC_CH_CONFIG_GAIN_Pos)
                          | (SAADC_CH_CONFIG_REFSEL_Internal << SAADC_CH_CONFIG_REFSEL_Pos)
                          | (SAADC_CH_CONFIG_TACQ_10us << SAADC_CH_CONFIG_TACQ_Pos);
  NRF_SAADC->RESULT.PTR = (uint32_t)&result;
  NRF_SAADC->RESULT.MAXCNT = 1;
  NRF_SAADC->EVENTS_STARTED = 0;
  NRF_SAADC->TASKS_START = 1;
  while (!NRF_SAADC->EVENTS_STARTED) {}
  NRF_SAADC->EVENTS_END = 0;
  NRF_SAADC->TASKS_SAMPLE = 1;
  while (!NRF_SAADC->EVENTS_END) {}
  NRF_SAADC->EVENTS_STOPPED = 0;
  NRF_SAADC->TASKS_STOP = 1;
  while (!NRF_SAADC->EVENTS_STOPPED) {}
  NRF_SAADC->CH[7].PSELP = SAADC_CH_PSELP_PSELP_NC;  // free the channel again
  // 12 bits over 0.6 V reference with gain 1/6 = 3.6 V full scale, times 5 for the VDDH divider.
  return result < 0 ? 0 : result * 3.6f / 4096.0f * 5.0f;
}

uint8_t batteryPercent(float volts) {
  float fraction = (volts - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V);
  if (fraction < 0) fraction = 0;
  if (fraction > 1) fraction = 1;
  return (uint8_t)(fraction * 100 + 0.5f);
}

uint16_t readHall() {
  nrf_gpio_pin_set(HALL_POWER_NRF_PIN);      // sensor on
  delayMicroseconds(HALL_SETTLE_US);
  uint32_t sum = 0;
  for (int i = 0; i < SAMPLES_PER_READING; i++) sum += analogRead(HALL_PIN);
  nrf_gpio_pin_clear(HALL_POWER_NRF_PIN);    // sensor off
  return sum / SAMPLES_PER_READING;
}

// LED: one short flash every 5 s; two flashes while the app is connected.
void updateLed(uint32_t now, bool connected) {
  uint32_t phase = now % BLINK_PERIOD_MS;
  bool on = phase < FLASH_MS;
  if (connected) on = on || (phase >= FLASH_MS + FLASH_GAP_MS && phase < 2 * FLASH_MS + FLASH_GAP_MS);
  nrf_gpio_pin_write(LED_NRF_PIN, on ? 1 : 0);
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);                  // 0-4095

  nrf_gpio_cfg_output(LED_NRF_PIN);
  nrf_gpio_pin_clear(LED_NRF_PIN);           // LED off

  // Strong drive so the pin holds its voltage at the sensor's ~6 mA draw.
  nrf_gpio_cfg(HALL_POWER_NRF_PIN, NRF_GPIO_PIN_DIR_OUTPUT, NRF_GPIO_PIN_INPUT_DISCONNECT,
               NRF_GPIO_PIN_NOPULL, NRF_GPIO_PIN_H0H1, NRF_GPIO_PIN_NOSENSE);
  nrf_gpio_pin_clear(HALL_POWER_NRF_PIN);    // sensor off until the first reading

  if (!BLE.begin()) {
    while (true) {                           // Bluetooth failed to start: fast blink
      nrf_gpio_pin_toggle(LED_NRF_PIN);
      delay(100);
    }
  }
  BLE.setLocalName(DEVICE_NAME);
  BLE.setDeviceName(DEVICE_NAME);
  BLE.setAdvertisedService(hallService);
  hallService.addCharacteristic(hallReading);
  BLE.addService(hallService);
  if (READ_BATTERY) {
    batteryService.addCharacteristic(batteryLevel);
    BLE.addService(batteryService);
    batteryLevel.writeValue(batteryPercent(readBatteryVolts()));
  }
  BLE.advertise();
}

void loop() {
  BLE.poll();

  static uint32_t nextSampleAt = 0;
  uint32_t now = millis();
  bool connected = BLE.connected();
  updateLed(now, connected);
  if ((int32_t)(now - nextSampleAt) < 0) return;
  nextSampleAt = now + SAMPLE_PERIOD_MS;

  uint16_t raw = readHall();

  static uint32_t nextBatteryAt = BATTERY_PERIOD_MS;
  if (READ_BATTERY && (int32_t)(now - nextBatteryAt) >= 0) {
    nextBatteryAt = now + BATTERY_PERIOD_MS;
    float volts = readBatteryVolts();
    Serial.print("battery_volts:");
    Serial.println(volts);
    batteryLevel.writeValue(batteryPercent(volts));
  }

  Serial.print("hall:");
  Serial.println(raw);                       // view in Tools -> Serial Plotter

  if (connected) {
    uint8_t packet[6] = {
      (uint8_t)(raw & 0xFF), (uint8_t)(raw >> 8),
      (uint8_t)(now & 0xFF), (uint8_t)(now >> 8),
      (uint8_t)(now >> 16), (uint8_t)(now >> 24)};
    hallReading.writeValue(packet, sizeof(packet));
  }
}
