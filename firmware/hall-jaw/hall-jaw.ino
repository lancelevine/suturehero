// SutureHero jaw sensor: Seeed XIAO nRF52840 (Sense) + OH49E/SS49E linear Hall sensor.
// Board package: "Seeed nRF52 mbed-enabled Boards". Library: ArduinoBLE.
// (The non-mbed "Seeed nRF52 Boards" package failed to link its Bluefruit library
// on Lance's Windows setup, 2026-11-21; see docs/AGENT_HANDOFF.md.)
// Wiring: sensor pin 1 (VCC) -> D1, pin 2 (GND) -> GND, pin 3 (OUT) -> A0.
// Optional 100 nF capacitor across D1 and GND, close to the sensor.
// The sensor is powered from D1 only while reading, to save battery.
// The app side is src/input/BleHallSensorSource.ts (same UUIDs and packet layout).
#include <ArduinoBLE.h>
#include "nrf_gpio.h"

const int HALL_PIN = A0;
const int HALL_POWER_PIN = D1;
const uint32_t HALL_POWER_NRF_PIN = 3;  // D1 is P0.03 on the XIAO nRF52840
const int HALL_SETTLE_US = 200;         // time for the sensor output to settle after power-on
const int SAMPLES_PER_READING = 8;      // averaged to reduce noise
const int SAMPLE_PERIOD_MS = 10;        // about 100 readings per second

// Each update is 6 bytes: raw value (uint16, 0-4095) + time since start in ms (uint32), little-endian.
BLEService hallService("5a1e0001-8f6c-4b8e-9d2a-3c4b5e6f7a80");
BLECharacteristic hallReading("5a1e0002-8f6c-4b8e-9d2a-3c4b5e6f7a80", BLERead | BLENotify, 6, true);

uint16_t readHall() {
  digitalWrite(HALL_POWER_PIN, HIGH);   // sensor on
  delayMicroseconds(HALL_SETTLE_US);
  uint32_t sum = 0;
  for (int i = 0; i < SAMPLES_PER_READING; i++) sum += analogRead(HALL_PIN);
  digitalWrite(HALL_POWER_PIN, LOW);    // sensor off
  return sum / SAMPLES_PER_READING;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);             // 0-4095
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);      // LED off (it lights when LOW)

  pinMode(HALL_POWER_PIN, OUTPUT);
  // Strong drive so the pin holds its voltage at the sensor's ~6 mA draw.
  nrf_gpio_cfg(HALL_POWER_NRF_PIN, NRF_GPIO_PIN_DIR_OUTPUT, NRF_GPIO_PIN_INPUT_DISCONNECT,
               NRF_GPIO_PIN_NOPULL, NRF_GPIO_PIN_H0H1, NRF_GPIO_PIN_NOSENSE);
  digitalWrite(HALL_POWER_PIN, LOW);    // sensor off until the first reading

  if (!BLE.begin()) {
    while (true) {                      // Bluetooth failed to start: fast blink
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      delay(100);
    }
  }
  BLE.setLocalName("SutureHero Jaw");
  BLE.setAdvertisedService(hallService);
  hallService.addCharacteristic(hallReading);
  BLE.addService(hallService);
  BLE.advertise();
}

void loop() {
  BLE.poll();

  static uint32_t nextSampleAt = 0;
  uint32_t now = millis();
  if ((int32_t)(now - nextSampleAt) < 0) return;
  nextSampleAt = now + SAMPLE_PERIOD_MS;

  uint16_t raw = readHall();

  Serial.print("hall:");
  Serial.println(raw);                  // view in Tools -> Serial Plotter

  bool connected = BLE.connected();
  digitalWrite(LED_BUILTIN, connected ? LOW : HIGH);  // LED on while connected
  if (connected) {
    uint8_t packet[6] = {
      (uint8_t)(raw & 0xFF), (uint8_t)(raw >> 8),
      (uint8_t)(now & 0xFF), (uint8_t)(now >> 8),
      (uint8_t)(now >> 16), (uint8_t)(now >> 24)};
    hallReading.writeValue(packet, sizeof(packet));
  }
}
