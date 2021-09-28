#define BUTTON_PIN 0
#define LED_PIN 5
#define LED_COUNT 6
#define WIFI_SSID "buzzer"
#define WIFI_PASSWORD "buzzerbuzzer'
#define SERVER_HOST "10.3.141.1"
#define SERVER_PORT 3000
#define URL "/websockets/buzzer"
#define DEBOUNCE_DELAY 50

#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <WebSocketsClient.h> // https://github.com/Links2004/arduinoWebSockets

#include <WS2812FX.h> // https://github.com/kitesurfer1404/WS2812FX

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;
WS2812FX ws2812fx = WS2812FX(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WSc] Disconnected!\n");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WSc] Connected to url: %s\n", payload);
      break;
    case WStype_TEXT:
      // commands
      // b <num> - change brightness
      // s <num> - change speed
      // m <num> - change mode
      // c <color> - change color
      if (strncmp((char*)payload, "b ", 2) == 0) {
        uint8_t b = atoi((char*)payload + 2);
        ws2812fx.setBrightness(b);
        Serial.printf("Brightness: %d", b);
      }
      if (strncmp((char*)payload, "s ", 2) == 0) {
        uint8_t b = atoi((char*)payload + 2);
        ws2812fx.setSpeed(b);
        Serial.printf("Speed: %d", b);
      }
      if (strncmp((char*)payload, "m ", 2) == 0) {
        uint8_t b = atoi((char*)payload + 2);
        ws2812fx.setMode(b);
        Serial.printf("Mode: %d", b);
      }
      if (strncmp((char*)payload, "c", 2) == 0) {
        uint32_t c = strtoul((char*)payload + 2, NULL, 16);
        ws2812fx.setColor(c);
        Serial.print("Color: ");
        Serial.println(c, HEX);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  Serial.println();
  Serial.println();
  Serial.println();

  for(uint8_t t = 4; t > 0; t--) {
    Serial.printf("[SETUP] BOOT WAIT %d...\n", t);
    Serial.flush();
    delay(1000);
  }
  pinMode(BUTTON_PIN, INPUT);
  
  WiFiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);

  //WiFi.disconnect();
  while(WiFiMulti.run() != WL_CONNECTED) {
    delay(100);
  }
  
  // server address, port and URL
  webSocket.begin(SERVER_HOST, SERVER_PORT, URL);

  // event handler
  webSocket.onEvent(webSocketEvent);

  // try ever 5000 again if connection has failed
  webSocket.setReconnectInterval(5000);
  
  // start heartbeat (optional)
  // ping server every 15000 ms
  // expect pong from server within 3000 ms
  // consider connection disconnected if pong is not received 2 times
  webSocket.enableHeartbeat(15000, 3000, 2);

  ws2812fx.init();
  ws2812fx.setBrightness(100);
  ws2812fx.setSpeed(200);
  ws2812fx.setMode(FX_MODE_RAINBOW_CYCLE);
  ws2812fx.start();
}

int buttonState = LOW;             // the current reading from the input pin
int lastButtonState = HIGH;   // the previous reading from the input pin
unsigned long lastDebounceTime = 0;  // the last time the output pin was toggled

void loop() {
  webSocket.loop();
  ws2812fx.service();

  // read button input, with debounce
  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    if (reading != buttonState) {
      buttonState = reading;
      if (!reading) {
        webSocket.sendTXT("hit");
      }
    }
  }
  lastButtonState = reading;
}
