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
