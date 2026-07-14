#include <ArduinoJson.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include <LiquidCrystal_I2C.h>
#include <Wire.h>

#include <DFRobotDFPlayerMini.h>

// =====================
// USER CONFIG
// =====================
static const char *WORKER_BASE = "http://server.soundboxqris123.workers.dev";

// I2C pins (ESP32 default SDA=21 SCL=22)
#define I2C_SDA 21
#define I2C_SCL 22
static const uint8_t LCD_ADDR =
    0x27; // LCD I2C address (try 0x3F if not working)
static const uint32_t I2C_CLOCK_HZ = 100000; // 100kHz

// DFPlayer pins
static const int DF_RX = 2; // ESP32 RX  <- DFPlayer TX
static const int DF_TX = 4; // ESP32 TX  -> DFPlayer RX

// =====================
// Track khusus fitur ANTRIAN (queue)
// =====================
// File suara "Selamat Datang, di E-MOTO GARAGE, nomor antrian" harus
// disimpan di kartu SD di dalam folder "MP3" dengan nama "0000.mp3"
// (playMp3Folder butuh format 4 digit, sesuai konvensi track lain di
// project ini seperti 0001.mp3, 0002.mp3, dst). Jika module DFPlayer kamu
// ternyata butuh nama persis "000.mp3", tinggal sesuaikan nama file fisiknya
// saja di SD card, nomor track (0) di kode ini TIDAK perlu diubah.
static const int TRACK_QUEUE_GREETING = 0; // 0000.mp3

// Time config
static const char *ntpServer = "pool.ntp.org";
static const long gmtOffset_sec = 25200; // WIB (UTC+7)
static const int daylightOffset_sec = 0;

// Reset config
#define EN_RESET_PIN 0      // Pin used for EN/boot button (GPIO 0)
#define RESET_WINDOW_MS 900 // Max time between presses
#define RESET_COUNT 3       // How many presses to trigger reset
#define MIN_PRESS_MS 50     // Debounce

// Captive DNS
static const byte DNS_PORT = 53;

// =====================
// EN triple reset detection (FLASH-based, survives hard reset)
// =====================
static const uint32_t EN_WINDOW_MS = 6000; // 6 seconds window
static const uint32_t EN_REQUIRED = 3;     // 3 resets => factory reset

// We'll store in flash (Preferences) because RTC doesn't survive POWERON_RESET
// Preferences keys:
// - "enCount" = reset count
// - "enTime" = millis() at last reset (boot time reference)
// - "enBoot" = boot number (increments each boot to detect actual reboots)

// =====================
// Globals
// =====================
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2); // LCD 16x2 I2C
bool lcdOk = false;

HardwareSerial DFSerial(2);
DFRobotDFPlayerMini df;
bool dfOk = false;

// HTTP Server Object
WebServer server(80);

// HTTP timeout for outgoing requests
static const uint32_t HTTP_TIMEOUT_MS = 3000;

DNSServer dnsServer;
Preferences prefs;

String wifiSsid, wifiPass;
String storeId, deviceToken, storeName;

bool apOn = false;
bool timeSynced = false;

uint32_t nextPollAt = 0;
uint32_t backoffMs = 5000;
const uint32_t POLL_MS = 1500;
const uint32_t MAX_BACKOFF = 10000;
uint8_t pollFailStreak = 0;

// LCD idle animation state
uint32_t lastIdleDraw = 0;
int16_t idleScrollX = 0;
bool idleBlink = false;
static const uint32_t IDLE_ANIM_MS = 500; // 500ms for LCD scrolling

enum PollResult { POLL_GOT_TX, POLL_NO_TX, POLL_ERROR };
PollResult pollOnce();

// Function Prototypes
void handleRoot();
void handleScanWifi();
void handleSaveWifi();
void handlePair();
void handleStatus();
void handleTestWorker();
void handleFactory();
void handleRestart();
void handleHeap();
void handleNotFound();
void playTrack(int t, int ms);
void playPaymentSequence(int amount);
void playQueueSequence(int queueNumber);
String urlDecode(String str);
int hexCharToInt(char c);

// =====================
// Helpers
// =====================
String cut16(String s) {
  s.trim();
  if (s.length() > 16)
    s = s.substring(0, 16);
  return s;
}

void lcd2(String l1, String l2) {
  if (!lcdOk)
    return;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(cut16(l1));
  lcd.setCursor(0, 1);
  lcd.print(cut16(l2));
}

// Tampilkan 1 baris teks di baris pertama LCD, posisi center (tengah)
void lcdCenter1(String text) {
  if (!lcdOk)
    return;
  text.trim();
  if (text.length() > 16)
    text = text.substring(0, 16);
  int pad = (16 - (int)text.length()) / 2;
  if (pad < 0)
    pad = 0;
  lcd.clear();
  lcd.setCursor(pad, 0);
  lcd.print(text);
}

bool initLCD() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(I2C_CLOCK_HZ);

  lcd.init();
  lcd.backlight();

  // Test if LCD responds
  lcd.setCursor(0, 0);
  lcd.print("BOOT...");
  delay(100);

  Serial.println("[LCD] OK");
  lcd2("BOOT", "");
  return true;
}

// =====================
// Preferences
// =====================
void loadPrefs() {
  wifiSsid = prefs.getString("wifiSsid", "");
  wifiPass = prefs.getString("wifiPass", "");
  storeId = prefs.getString("storeId", "");
  deviceToken = prefs.getString("deviceToken", "");
  storeName = prefs.getString("storeName", ""); // Load store name
}

void saveWifi(const String &ssid, const String &pass) {
  prefs.putString("wifiSsid", ssid);
  prefs.putString("wifiPass", pass);
  wifiSsid = ssid;
  wifiPass = pass;
}

void savePair(const String &sid, const String &tok, const String &name = "") {
  prefs.putString("storeId", sid);
  prefs.putString("deviceToken", tok);
  if (name.length() > 0)
    prefs.putString("storeName", name);

  storeId = sid;
  deviceToken = tok;
  if (name.length() > 0)
    storeName = name;
}

bool isPaired() { return storeId.length() > 0 && deviceToken.length() > 0; }

void clearPairing() {
  prefs.putString("storeId", "");
  prefs.putString("deviceToken", "");
  prefs.putString("storeName", "");
  storeId = "";
  deviceToken = "";
  storeName = "";
}

void clearWifi() {
  prefs.putString("wifiSsid", "");
  prefs.putString("wifiPass", "");
  wifiSsid = "";
  wifiPass = "";
}

void factoryResetNow(const char *reason) {
  // Clear ALL preferences (WiFi, pairing, EN counter, everything)
  prefs.clear();

  // Reset in-memory variables too
  storeId = "";
  deviceToken = "";
  storeName = "";
  wifiSsid = "";
  wifiPass = "";

  Serial.print("[FACTORY] cleared WiFi + pairing. reason=");
  Serial.println(reason);

  if (lcdOk) {
    lcd2("FACTORY", "RESET");
    delay(1000);
  }

  // Play "Reset Berhasil" (0009.mp3)
  // Asumsi durasi 3-4 detik cukup
  if (dfOk) {
    playTrack(9, 4000);
  }

  ESP.restart();
}

// =====================
// EN triple reset logic (FLASH-based)
// Uses boot counter + timestamp to detect 3 quick resets
// =====================
void handleENTripleResetEarly() {
  // Get current values from flash
  uint32_t enCount = prefs.getUInt("enCount", 0);
  uint32_t enBoot = prefs.getUInt("enBoot", 0);

  // Current boot number (increment on every boot)
  uint32_t currentBoot = enBoot + 1;
  prefs.putUInt("enBoot", currentBoot);

  // Let's use boot sequence numbers:
  uint32_t firstBoot = prefs.getUInt("enFirstBoot", 0);

  if (enCount == 0) {
    // First reset in sequence
    enCount = 1;
    firstBoot = currentBoot;
    prefs.putUInt("enFirstBoot", firstBoot);
    prefs.putUInt("enCount", enCount);
    Serial.printf("[EN] First reset detected, count=1, boot=%lu\n",
                  (unsigned long)currentBoot);
  } else {
    // Subsequent reset - check if it's within reasonable boot sequence
    // If too many boots have passed (e.g., >10 boots), assume timeout
    uint32_t bootDiff = currentBoot - firstBoot;

    if (bootDiff > 5) {
      // Too many boots, reset counter
      Serial.printf(
          "[EN] Boot sequence timeout (boots=%lu), resetting counter\n",
          (unsigned long)bootDiff);
      enCount = 1;
      firstBoot = currentBoot;
      prefs.putUInt("enFirstBoot", firstBoot);
      prefs.putUInt("enCount", enCount);
    } else {
      // Within sequence, increment
      enCount++;
      prefs.putUInt("enCount", enCount);
      Serial.printf("[EN] Reset %lu/%lu, boot=%lu\n", (unsigned long)enCount,
                    (unsigned long)EN_REQUIRED, (unsigned long)currentBoot);
    }
  }

  // Show LCD indicator AFTER LCD is initialized
  // We'll do this in setup() after initLCD()

  // Check if factory reset threshold reached
  if (enCount >= EN_REQUIRED) {
    Serial.println("[EN] ✓✓✓ TRIPLE RESET DETECTED!");
    if (lcdOk) {
      lcd2("RESET", "DONE");
      delay(1500);
    }
    factoryResetNow("EN triple reset");
  }
}

void showENResetIndicator() {
  uint32_t enCount = prefs.getUInt("enCount", 0);

  // Custom display logic:
  // 1/3 -> REFRESH
  // 2/3 -> (Skip/Hidden)
  // 3/3 -> Handled in main logic (RESET DONE)

  if (lcdOk) {
    if (enCount == 1) {
      Serial.println("[EN] Showing LCD: REFRESH");
      lcd2("REFRESH", "...");
      delay(1200);
    }
    // enCount == 2 is skipped (hidden)
  }
}

// =====================
// EN live triple-press detection (BARU)
// Membaca langsung state tombol EN_RESET_PIN selama alat menyala (loop()),
// tidak butuh reboot chip. Dulu pin ini di-set INPUT_PULLUP tapi tidak
// pernah dibaca sama sekali, jadi tombol tidak berfungsi saat ditekan
// tanpa menyebabkan reset chip yang sesungguhnya.
// =====================
uint32_t enPressCount = 0;
uint32_t enPressWindowStart = 0;
bool enLastState = HIGH;
uint32_t enLastChangeMs = 0;
static const uint32_t EN_DEBOUNCE_MS = 50;

void checkENButtonLive() {
  bool reading = digitalRead(EN_RESET_PIN); // LOW = ditekan (INPUT_PULLUP)
  uint32_t now = millis();

  if (reading != enLastState && (now - enLastChangeMs) > EN_DEBOUNCE_MS) {
    enLastChangeMs = now;
    enLastState = reading;

    if (reading == LOW) { // baru saja ditekan
      if (enPressCount == 0 || (now - enPressWindowStart) <= EN_WINDOW_MS) {
        if (enPressCount == 0)
          enPressWindowStart = now;
        enPressCount++;
        Serial.printf("[EN-LIVE] Tekan %lu/%lu\n", (unsigned long)enPressCount,
                      (unsigned long)EN_REQUIRED);

        if (enPressCount >= EN_REQUIRED) {
          Serial.println("[EN-LIVE] ✓✓✓ TRIPLE PRESS TERDETEKSI!");
          if (lcdOk) {
            lcd2("RESET", "DONE");
            delay(1500);
          }
          factoryResetNow("EN live triple press");
        }
      } else {
        // window sudah lewat, hitung ulang dari 1
        enPressCount = 1;
        enPressWindowStart = now;
        Serial.println("[EN-LIVE] Window habis, hitung ulang dari 1");
      }
    }
  }

  // Kalau window lewat dan belum sampai 3x, reset counter
  if (enPressCount > 0 && (now - enPressWindowStart) > EN_WINDOW_MS) {
    enPressCount = 0;
  }
}

// =====================
// smartDelay (keeps web responsive)
// =====================
void smartDelay(uint32_t ms) {
  uint32_t t0 = millis();
  while (millis() - t0 < ms) {
    server.handleClient();
    if (apOn)
      dnsServer.processNextRequest();
    yield();
    delay(5);
  }
}

const char *wifiStatusStr(wl_status_t s) {
  switch (s) {
  case WL_NO_SSID_AVAIL:
    return "NO_SSID";
  case WL_CONNECTED:
    return "CONNECTED";
  case WL_CONNECT_FAILED:
    return "CONNECT_FAILED";
  case WL_CONNECTION_LOST:
    return "CONNECTION_LOST";
  case WL_DISCONNECTED:
    return "DISCONNECTED";
  case WL_IDLE_STATUS:
    return "IDLE";
  default:
    return "UNKNOWN";
  }
}

void logWifiStatus(const char *tag) {
  wl_status_t st = WiFi.status();
  int rssi = (st == WL_CONNECTED) ? WiFi.RSSI() : 0;
  Serial.printf("[%s] WiFi status=%s (%d), RSSI=%d dBm\n", tag,
                wifiStatusStr(st), (int)st, rssi);
}

uint32_t jitteredDelay(uint32_t baseMs, int32_t jitterMs = 100) {
  int32_t j = random(-jitterMs, jitterMs + 1);
  int32_t v = (int32_t)baseMs + j;
  if (v < 0)
    v = 0;
  return (uint32_t)v;
}

// Layar utama LCD: kalau device SUDAH connect WiFi + SUDAH pairing -> tampilkan
// animasi scroll welcome (renderIdleScreen). Kalau BELUM (masih setup WiFi /
// belum dipasangkan ke toko) -> tampilkan status statis "ALAT SUDAH SIAP"
// (tidak di-redraw berulang tiap 500ms supaya tidak flicker).
bool lcdIsShowingReadyIdle = false;
bool lcdMainScreenInited = false;

void updateMainScreen() {
  if (!lcdOk)
    return;

  bool ready = (WiFi.status() == WL_CONNECTED && isPaired());

  if (ready) {
    renderIdleScreen(); // scroll welcome, jalan tiap 500ms
    lcdIsShowingReadyIdle = true;
    lcdMainScreenInited = true;
  } else {
    // Belum siap: cukup gambar sekali, jangan clear() berulang tiap 500ms
    if (lcdIsShowingReadyIdle || !lcdMainScreenInited) {
      lcd2("ALAT SUDAH", "SIAP");
      lcdIsShowingReadyIdle = false;
      lcdMainScreenInited = true;
    }
  }
}

void renderIdleScreen() {
  if (!lcdOk)
    return;

  uint32_t now = millis();
  if (now - lastIdleDraw < IDLE_ANIM_MS)
    return;
  lastIdleDraw = now;

  // Teks idle di-hardcode (tidak pakai storeName dinamis) supaya scroll
  // tidak lag karena tidak perlu concat string tiap frame.
  static const char *msg = "SELAMAT DATANG DI E-MOTO GARAGE";

  // Scroll di baris 1 saja, baris 2 dikosongkan (tidak ada "READY" lagi)
  static int scrollPos = 0;
  lcd.clear();
  lcd.setCursor(0, 0);

  // Buat substring scroll dengan jeda spasi di ujung
  String displayText = String(msg) + "    ";
  int totalLen = displayText.length();

  String scrollText = "";
  for (int i = 0; i < 16; i++) {
    scrollText += displayText.charAt((scrollPos + i) % totalLen);
  }

  lcd.print(scrollText);
  scrollPos++;
  if (scrollPos >= totalLen)
    scrollPos = 0;
}

// =====================
// NTP for TLS
// =====================
bool syncTimeNtp(uint32_t maxWaitMs = 15000) {
  configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com",
             "time.cloudflare.com");
  Serial.print("[NTP] syncing");
  uint32_t start = millis();
  time_t now = time(nullptr);

  while (now < 1700000000 && (millis() - start) < maxWaitMs) {
    smartDelay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println();

  if (now >= 1700000000) {
    Serial.print("[NTP] ok now=");
    Serial.println((long)now);
    timeSynced = true;
    return true;
  } else {
    Serial.print("[NTP] failed now=");
    Serial.println((long)now);
    timeSynced = false;
    return false;
  }
}

// =====================
// WiFi Event Handler & Reconnect (ANTI-BADAI EDITION)
// =====================
void WiFiEvent(arduino_event_id_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_START:
    Serial.println("[WIFI-EVENT] Station Mode Started");
    break;
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.print("[WIFI-EVENT] Connected! IP: ");
    Serial.println(WiFi.localIP());
    logWifiStatus("CONNECTED");
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println(
        "[WIFI-EVENT] Disconnected from WiFi. Trying to reconnect...");
    logWifiStatus("FAIL (DISCONNECTED)");
    timeSynced = false;
    if (!wifiSsid.isEmpty() && !apOn) {
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
    }
    break;
  default:
    break;
  }
}

// =====================
// WiFi STA connect (ANTI-BADAI EDITION)
// =====================
bool connectWiFi(uint32_t timeoutMs = 15000) {
  if (wifiSsid.isEmpty())
    return false;

  // 1. Maximize TX Power (More range)
  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  // 2. Disable Power Saving (No sleep!)
  WiFi.setSleep(false);

  // 3. Prefer strongest signal
  WiFi.setSortMethod(WIFI_CONNECT_AP_BY_SIGNAL);

  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  Serial.print("[WIFI] Connecting to ");
  Serial.println(wifiSsid);

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    smartDelay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    WiFi.setSleep(false); // Ensure it stays off
    WiFi.setAutoReconnect(true);

    Serial.println("[WIFI] sleep disabled, auto-reconnect enabled (MAX POWER)");
    Serial.print("[WIFI] OK IP: ");
    Serial.println(WiFi.localIP());

    logWifiStatus("CONNECTED");

    // Play "Wifi Tersambung" (0006.mp3)
    playTrack(6, 7000); // 7 seconds duration

    // Sync time and wait a bit for network stack to stabilize
    if (syncTimeNtp(12000)) {
      Serial.println("[WIFI] Waiting 2s for network stack stability...");
      delay(2000); // Give SSL stack time to initialize after NTP
    }
    return true;
  }

  Serial.println("[WIFI] Failed");
  logWifiStatus("FAIL");
  return false;
}

// =====================
// AP control + policy
// =====================
String apSsid() {
  uint64_t chip = ESP.getEfuseMac();
  char buf[32];
  snprintf(buf, sizeof(buf), "SOUNDBOX-%04X", (uint16_t)(chip & 0xFFFF));
  return String(buf);
}

void startAP() {
  if (apOn)
    return;

  WiFi.mode(WIFI_AP_STA);
  delay(50);

  String ssid = apSsid();
  WiFi.softAP(ssid.c_str());
  delay(50);

  IPAddress apIP = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", apIP);

  apOn = true;
  Serial.print("[AP] ON SSID: ");
  Serial.println(ssid);
  Serial.print("[AP] ON IP : ");
  Serial.println(apIP);

  if (lcdOk)
    lcd2("SETUP", "192.168.4.1");
}

void stopAP() {
  if (!apOn)
    return;
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  apOn = false;
  Serial.println("[AP] OFF (ready)");
}

void enforceApPolicy() {
  if (WiFi.status() == WL_CONNECTED && isPaired())
    stopAP();
  else
    startAP();
}

// =====================
// Portal HTML
// =====================
String htmlEscape(String s) {
  s.replace("&", "&amp;");
  s.replace("<", "&lt;");
  s.replace(">", "&gt;");
  s.replace("\"", "&quot;");
  s.replace("'", "&#39;");
  return s;
}

// =====================

// =====================
// HTTPS Request Handlers
// =====================

// =====================
// WiFi Scan API (async JSON)
// =====================
void handleScanWifi() {
  Serial.println("[SCAN] Starting WiFi scan...");

  // Disconnect from any previous AP and ensure STA mode is ready
  WiFi.disconnect();
  delay(100);

  // Kick off sync scan
  int n = WiFi.scanNetworks(false);
  String json = "[";
  bool first = true;
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    if (ssid.length() == 0)
      continue;
    String strength = (rssi > -50)   ? "Sangat Baik"
                      : (rssi > -60) ? "Baik"
                      : (rssi > -70) ? "Cukup"
                                     : "Lemah";
    if (!first)
      json += ",";
    first = false;
    json += "{\"ssid\":\"" + ssid + "\",\"rssi\":" + String(rssi) +
            ",\"strength\":\"" + strength + "\"}";
  }
  json += "]";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
  Serial.printf("[SCAN] Done, found %d networks\n", n);
}

void handleRoot() {
  Serial.println("[HTTP] Serving portal page...");
  Serial.printf("[HTTP] Free heap before: %d\n", ESP.getFreeHeap());

  String pairBadgeClass = isPaired() ? "badge-green" : "badge-yellow";
  String pairBadgeText = isPaired() ? htmlEscape(storeId) : "Menunggu";
  String wifiBadgeClass =
      (WiFi.status() == WL_CONNECTED) ? "badge-green" : "badge-red";
  String wifiBadgeText =
      (WiFi.status() == WL_CONNECTED) ? htmlEscape(WiFi.SSID()) : "Offline";
  String devId = apSsid();

  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/html", "");

  server.sendContent(R"rawliteral(<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Soundbox QRIS — Setup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #f9f9f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #111;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { width: 100%; max-width: 400px; }
    .logo-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .logo-mark {
      width: 30px; height: 30px; background: #111; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-mark svg { width: 16px; height: 16px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; }
    .logo-text { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: #111; }
    .logo-text span { font-weight: 400; color: #888; }
    .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; }
    .card-head { padding: 24px 28px 20px; border-bottom: 1px solid #f4f4f5; }
    .card-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: #111; margin-bottom: 4px; }
    .card-sub { font-size: 13px; color: #888; font-weight: 400; }
    .card-body { padding: 24px 28px; }
    .status-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .status-item { border: 1px solid #f0f0f0; border-radius: 8px; padding: 11px 14px; background: #fafafa; }
    .status-key { font-size: 11px; color: #bbb; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 5px; font-family: monospace; }
    .status-val { font-size: 13px; font-weight: 500; display: flex; align-items: center; }
    .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 100px; }
    .badge-red { background: #fef2f2; color: #dc2626; }
    .badge-green { background: #f0fdf4; color: #16a34a; }
    .badge-yellow { background: #fefce8; color: #ca8a04; }
    .badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .divider { height: 1px; background: #f4f4f5; margin: 20px 0; }
    .device-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; padding: 12px 14px;
      border: 1px solid #f0f0f0; border-radius: 8px; background: #fafafa;
    }
    .device-label { font-size: 11px; color: #bbb; font-family: monospace; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
    .device-val { font-family: monospace; font-size: 14px; font-weight: 500; color: #111; letter-spacing: 0.04em; }
    .btn-copy {
      font-size: 12px; font-weight: 500; color: #666; background: #fff;
      border: 1px solid #e4e4e7; border-radius: 6px; padding: 5px 11px;
      cursor: pointer; transition: border-color 0.15s, color 0.15s;
    }
    .btn-copy:hover { border-color: #aaa; color: #111; }
    .field { margin-bottom: 16px; }
    .field-label { display: block; font-size: 12px; font-weight: 500; color: #444; margin-bottom: 7px; letter-spacing: -0.01em; }
    .select-row { display: flex; gap: 8px; }
    .select-wrap { flex: 1; position: relative; }
    select {
      width: 100%; appearance: none; background: #fff;
      border: 1px solid #e4e4e7; border-radius: 8px;
      padding: 9px 32px 9px 12px; font-size: 13px; color: #111;
      outline: none; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
    }
    select:focus { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
    .chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #aaa; }
    .btn-scan {
      padding: 9px 14px; background: #fff; border: 1px solid #e4e4e7;
      border-radius: 8px; font-size: 12px; font-weight: 500; font-family: inherit;
      color: #555; cursor: pointer; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-scan:hover { border-color: #aaa; color: #111; }
    .btn-scan:disabled { opacity: 0.5; cursor: not-allowed; }
    .spinner {
      width: 11px; height: 11px; border: 1.5px solid #ddd; border-top-color: #555;
      border-radius: 50%; animation: spin 0.7s linear infinite; display: none;
    }
    .scanning .spinner { display: block; }
    .scanning .scan-label { display: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .field-hint { font-size: 11px; color: #bbb; margin-top: 6px; }
    .pass-field {
      display: flex; border: 1px solid #e4e4e7; border-radius: 8px;
      overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .pass-field:focus-within { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
    .pass-field input {
      flex: 1; border: none; padding: 9px 12px; font-size: 13px;
      color: #111; outline: none; background: #fff; font-family: inherit;
    }
    .pass-field input::placeholder { color: #ccc; }
    .btn-toggle {
      padding: 9px 13px; background: #fafafa; border: none;
      border-left: 1px solid #f0f0f0; font-size: 11px; font-weight: 500;
      font-family: inherit; color: #888; cursor: pointer; transition: color 0.15s; white-space: nowrap;
    }
    .btn-toggle:hover { color: #111; }
    .btn-submit {
      width: 100%; padding: 10px; background: #111; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit;
      color: #fff; cursor: pointer; letter-spacing: -0.01em;
      transition: background 0.15s, transform 0.1s; margin-top: 4px;
    }
    .btn-submit:hover { background: #222; }
    .btn-submit:active { transform: scale(0.99); }
    .card-foot {
      padding: 14px 28px; border-top: 1px solid #f4f4f5;
      display: flex; justify-content: space-between; align-items: center;
    }
    .foot-text { font-size: 11px; color: #ccc; font-family: monospace; }
    .foot-heap {
      font-size: 11px; color: #bbb; font-family: monospace;
      background: #f9f9f9; border: 1px solid #f0f0f0;
      border-radius: 4px; padding: 2px 8px;
    }
    .bottom-links { display: flex; justify-content: center; gap: 20px; margin-top: 20px; }
    .bottom-links a { font-size: 12px; color: #bbb; text-decoration: none; transition: color 0.15s; cursor: pointer; }
    .bottom-links a:hover { color: #555; }
    .toast {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%) translateY(8px);
      background: #111; color: #fff; font-size: 12px; font-family: inherit;
      font-weight: 500; padding: 8px 16px; border-radius: 100px;
      opacity: 0; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none; white-space: nowrap;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  </style>
</head>
<body>
<div class="wrapper">
  <!-- Logo -->
  <div class="logo-bar">
    <div class="logo-mark">
      <svg viewBox="0 0 16 16">
        <path d="M8 2v4M5 6c0 0-2 1-2 3s2 3 5 3 5-1 5-3-2-3-2-3"/>
        <circle cx="8" cy="12" r="1"/>
      </svg>
    </div>
    <span class="logo-text">Soundbox <span>QRIS</span></span>
  </div>

  <!-- Card -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">Konfigurasi Perangkat</div>
      <div class="card-sub">Hubungkan ke jaringan WiFi untuk mulai menerima pembayaran.</div>
    </div>
    <div class="card-body">

      <!-- Status row (WiFi + Pairing) -->
      <div class="status-row">
        <div class="status-item">
          <div class="status-key">WiFi</div>
          <div class="status-val">
            <span class="badge )rawliteral");

  server.sendContent(wifiBadgeClass);
  server.sendContent(R"rawliteral(" id="wifi-badge">)rawliteral");
  server.sendContent(wifiBadgeText);
  server.sendContent(R"rawliteral(</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-key">No. Seri</div>
          <div class="status-val">
            <span class="badge )rawliteral");

  server.sendContent(pairBadgeClass);
  server.sendContent(R"rawliteral(">)rawliteral");
  server.sendContent(pairBadgeText);
  server.sendContent(R"rawliteral(</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Device ID -->
      <div class="device-row">
        <div>
          <div class="device-label">Device ID</div>
          <div class="device-val" id="devid">)rawliteral");

  server.sendContent(devId);
  server.sendContent(R"rawliteral(</div>
        </div>
        <button class="btn-copy" onclick="copyId()">Salin</button>
      </div>

      <!-- WiFi Field -->
      <div class="field">
        <label class="field-label">Jaringan WiFi</label>
        <div class="select-row">
          <div class="select-wrap">
            <select id="ssid-select" name="ssid" required>
              <option value="">Memuat jaringan...</option>
            </select>
            <span class="chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8l3.5-3.5" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <button class="btn-scan" id="btn-scan" onclick="doScan()" type="button">
            <div class="spinner"></div>
            <span class="scan-label">Scan</span>
          </button>
        </div>
        <div class="field-hint" id="scan-hint">Memuat jaringan...</div>
      </div>

      <!-- Password Field -->
      <div class="field">
        <label class="field-label">Password</label>
        <div class="pass-field">
          <input type="password" id="pass" name="pass" placeholder="Masukkan password WiFi">
          <button class="btn-toggle" id="toggle-btn" onclick="togglePass()" type="button">Tampilkan</button>
        </div>
      </div>

      <button class="btn-submit" onclick="doConnect()" type="button">Sambungkan</button>

    </div>
    <div class="card-foot">
      <span class="foot-text">192.168.4.1</span>
      <span class="foot-heap">)rawliteral");

  server.sendContent(String(ESP.getFreeHeap()));
  server.sendContent(R"rawliteral( B free</span>
    </div>
  </div>

  <!-- Bottom links -->
  <div class="bottom-links">
    <a href="/restart">Restart</a>
    <a href="/status">Status</a>
    <a href="/factory" onclick="return confirm('Factory reset? Semua data akan terhapus.')">Factory Reset</a>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
  function doScan() {
    var btn  = document.getElementById('btn-scan');
    var sel  = document.getElementById('ssid-select');
    var hint = document.getElementById('scan-hint');
    btn.disabled = true;
    btn.classList.add('scanning');
    hint.textContent = 'Memindai...';
    fetch('/scan-wifi')
      .then(function(r) { return r.json(); })
      .then(function(nets) {
        sel.innerHTML = '';
        if (!nets || nets.length === 0) {
          sel.innerHTML = '<option value="">Tidak ada jaringan</option>';
          hint.textContent = 'Tidak ada WiFi terdeteksi. Coba scan ulang.';
        } else {
          nets.forEach(function(n) {
            var o = document.createElement('option');
            o.value = n.ssid;
            o.textContent = n.ssid + ' — ' + n.strength + ' (' + n.rssi + ' dBm)';
            sel.appendChild(o);
          });
          hint.textContent = nets.length + ' jaringan ditemukan.';
        }
        btn.disabled = false;
        btn.classList.remove('scanning');
      })
      .catch(function(e) {
        sel.innerHTML = '<option value="">Gagal memindai</option>';
        hint.textContent = 'Error: ' + e.message;
        btn.disabled = false;
        btn.classList.remove('scanning');
      });
  }

  function togglePass() {
    var inp = document.getElementById('pass');
    var btn = document.getElementById('toggle-btn');
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = 'Sembunyikan'; }
    else { inp.type = 'password'; btn.textContent = 'Tampilkan'; }
  }

  function doConnect() {
    var sel  = document.getElementById('ssid-select');
    var pass = document.getElementById('pass');
    if (!sel.value) { showToast('Pilih jaringan terlebih dahulu'); return; }
    showToast('Menyambungkan ke ' + sel.value + '...');
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/save-wifi';
    var s = document.createElement('input'); s.type='hidden'; s.name='ssid'; s.value=sel.value; form.appendChild(s);
    var p = document.createElement('input'); p.type='hidden'; p.name='pass'; p.value=pass.value; form.appendChild(p);
    document.body.appendChild(form);
    form.submit();
  }

  function copyId() {
    var txt = document.getElementById('devid').textContent;
    if (navigator.clipboard) { navigator.clipboard.writeText(txt); }
    showToast('Device ID disalin');
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2200);
  }

  // Auto-scan on page load
  window.addEventListener('load', function() { doScan(); });
</script>
</body>
</html>)rawliteral");

  server.sendContent(""); // end chunked transfer
  Serial.printf("[HTTP] Free heap after: %d\n", ESP.getFreeHeap());
  Serial.println("[HTTP] Portal page sent OK");
}

void handleSaveWifi() {
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");

  if (ssid.length() > 0) {
    prefs.putString("wifiSsid", ssid);
    prefs.putString("wifiPass", pass);

    server.send(
        200, "text/html",
        "<html><body><h1>Simpan Berhasil!</h1><p>SSID: " + ssid +
            "</p><p>Password: ***</p><p>Device akan restart dalam 3 "
            "detik...</p><script>setTimeout(function(){window.location.href='/"
            "restart';}, 3000);</script></body></html>");

    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/plain", "Missing SSID");
  }
}

void handlePair() {
  String sid = server.arg("store_id");
  String tok = server.arg("token");
  String nameParam = server.arg("name");

  if (sid.length() > 0 && tok.length() > 0) {
    storeId = sid;
    deviceToken = tok;

    if (nameParam.length() > 0) {
      storeName = urlDecode(nameParam);
      prefs.putString("storeName", storeName);
    }

    prefs.putString("storeId", storeId);
    prefs.putString("deviceToken", deviceToken);

    Serial.printf("[PAIR] Saved store_id=%s, token=%s\n", storeId.c_str(),
                  deviceToken.c_str());

    if (dfOk)
      playTrack(7, 4000); // "Pairing Berhasil"

    server.send(
        200, "text/html",
        "<html><head><meta charset='UTF-8'><meta name='viewport' "
        "content='width=device-width, initial-scale=1.0'></head><body><div "
        "style='text-align:center; padding:50px; "
        "font-family:sans-serif;'><h1>Pairing Berhasil!</h1><p>Store ID: " +
            storeId +
            "</p><p>Silakan tutup halaman ini.</p></div></body></html>");
  } else {
    server.send(400, "text/plain", "Missing store_id or token");
  }
}

void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["uptime"] = millis() / 1000;
  doc["wifi_status"] =
      (WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED";
  doc["wifi_ssid"] = WiFi.SSID();
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["store_id"] = storeId;
  doc["store_name"] = storeName;
  doc["device_id"] = apSsid();
  doc["paired"] = isPaired();
  doc["time_synced"] = timeSynced;
  doc["heap_free"] = ESP.getFreeHeap();
  doc["poll_fail_streak"] = pollFailStreak;

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handleTestWorker() {
  PollResult result = pollOnce();

  if (result == POLL_GOT_TX) {
    server.send(200, "text/plain", "PASS: Transaction found and played");
  } else if (result == POLL_NO_TX) {
    server.send(200, "text/plain",
                "PASS: Worker reachable, no pending transaction");
  } else {
    server.send(500, "text/plain",
                "FAIL: Error reaching worker (check Serial logs)");
  }
}

void handleFactory() {
  server.send(200, "text/plain", "Factory Resetting... Goodbye!");
  delay(1000);
  prefs.clear();
  ESP.restart();
}

void handleRestart() {
  server.send(200, "text/plain", "Restarting...");
  delay(1000);
  ESP.restart();
}

void handleHeap() { server.send(200, "text/plain", String(ESP.getFreeHeap())); }

void handleNotFound() {
  // Captive Portal Redirection
  if (server.hostHeader() != "192.168.4.1") {
    server.sendHeader("Location", "http://192.168.4.1/");
    server.send(302);
    return;
  }

  server.send(404, "text/plain", "404 Not Found");
}

// Helper for URL decoding
String urlDecode(String str) {
  String ret;
  char c;
  int i, len = str.length();

  for (i = 0; i < len; i++) {
    c = str[i];
    if (c == '+') {
      ret += ' ';
    } else if (c == '%') {
      char code0 = str[i + 1];
      char code1 = str[i + 2];
      c = (hexCharToInt(code0) << 4) | hexCharToInt(code1);
      ret += c;
      i += 2;
    } else {
      ret += c;
    }
  }
  return ret;
}

int hexCharToInt(char c) {
  if (c >= '0' && c <= '9')
    return c - '0';
  if (c >= 'A' && c <= 'F')
    return c - 'A' + 10;
  if (c >= 'a' && c <= 'f')
    return c - 'a' + 10;
  return 0;
}

// =====================
// DFPlayer Audio Logic (Updated)
// =====================
void dfInitNonBlocking() {
  DFSerial.begin(9600, SERIAL_8N1, DF_RX, DF_TX);
  smartDelay(1500); // Allow DFPlayer module to power up

  for (int attempt = 1; attempt <= 3; attempt++) {
    dfOk = df.begin(DFSerial);
    if (dfOk) {
      df.volume(25);
      Serial.printf("[DF] ✓ Initialized (attempt %d)\n", attempt);

      int fileCount = df.readFileCounts();
      Serial.printf("[DF] Files found on SD: %d\n", fileCount);
      return;
    }
    Serial.printf("[DF] ✗ Init attempt %d/3 failed, retrying...\n", attempt);
    smartDelay(1000);
  }

  Serial.println("[DF] ✗ Init failed after 3 attempts (audio disabled)");
}

void playTrack(int t, int ms) {
  if (!dfOk)
    return;
  Serial.printf("[DF] Play (Folder MP3) track %d (%d ms)\n", t, ms);

  // Use playMp3Folder for reliable ordering
  // Files MUST be in folder "MP3" and named "0001.mp3", etc.
  df.playMp3Folder(t);

  smartDelay(ms);
}

// Logic Terbilang Recursive
void playTerbilang(long n) {
  if (!dfOk)
    return;

  // Mapping based on user request:
  // 10=Nol, 11=Satu .. 19=Sembilan
  // 20=Sepuluh, 21=Sebelas, 22=Belas
  // 23=Puluh, 24=Ratus, 25=Ribu, 26=Juta
  // 27=Seratus, 28=Seribu

  // Delays tailored to user files (2s phrases, 1s numbers) + buffer

  if (n < 12) {
    // 0..11 matches mapping directly (0->10, 1->11..9->19, 10->20, 11->21)
    playTrack(10 + n, 1200);
  } else if (n < 20) {
    // 12..19 -> "Dua Belas" .. "Sembilan Belas"
    playTerbilang(n - 10); // e.g. 12 -> 2 ("Dua")
    playTrack(22, 1200);   // "Belas"
  } else if (n < 100) {
    // 20..99 -> "Dua Puluh" .. "Sembilan Puluh Sembilan"
    playTerbilang(n / 10);
    playTrack(23, 1200); // "Puluh"
    if (n % 10 > 0)
      playTerbilang(n % 10);
  } else if (n < 200) {
    // 100..199 -> "Seratus" ...
    playTrack(27, 1200); // "Seratus"
    if (n % 100 > 0)
      playTerbilang(n % 100);
  } else if (n < 1000) {
    // 200..999 -> "Dua Ratus" ...
    playTerbilang(n / 100);
    playTrack(24, 1200); // "Ratus"
    if (n % 100 > 0)
      playTerbilang(n % 100);
  } else if (n < 2000) {
    // 1000..1999 -> "Seribu" ...
    playTrack(28, 1200); // "Seribu"
    if (n % 1000 > 0)
      playTerbilang(n % 1000);
  } else if (n < 1000000) {
    // 2000..999,999 -> "Dua Ribu" ...
    playTerbilang(n / 1000);
    playTrack(25, 1200); // "Ribu"
    if (n % 1000 > 0)
      playTerbilang(n % 1000);
  } else if (n < 1000000000) {
    // 1M.. -> "Satu Juta" ...
    playTerbilang(n / 1000000);
    playTrack(26, 1200); // "Juta"
    if (n % 1000000 > 0)
      playTerbilang(n % 1000000);
  }
}

// Update LCD + Audio simultaneously
void playPaymentSequence(int amount) {
  if (!dfOk)
    return;

  Serial.println("[DF] Playing payment sequence...");

  // 0. "Kringggg" (0005.mp3) + Show "UANG MASUK" (1 baris, center)
  if (lcdOk)
    lcdCenter1("UANG MASUK");
  playTrack(5, 1500);

  // 1. "Uang Masuk" (2s)
  // LCD already showing "UANG MASUK"
  playTrack(1, 2200);

  // 2. "Sebesar" (2s) + Show "SEBESAR" (1 baris, center)
  if (lcdOk)
    lcdCenter1("SEBESAR");
  playTrack(2, 2200);

  // 3. Amount (Terbilang) (1s each) + Show "RP xxx" (1 baris, center)
  if (lcdOk)
    lcdCenter1("RP" + String(amount));

  if (amount == 0) {
    playTrack(10, 1200); // "Nol"
  } else {
    playTerbilang(amount);
  }

  // 4. "Rupiah" (2s)
  // Keep showing amount
  playTrack(3, 2200);

  // 5. "Terima Kasih" (Asumsi 3s aman) + Show "TERIMA KASIH" (1 baris, center)
  if (lcdOk)
    lcdCenter1("TERIMA KASIH");
  playTrack(4, 3000);
}

// =====================
// Panggilan Nomor Antrian (fitur baru)
// =====================
// Urutan suara: "Selamat Datang, di E-MOTO GARAGE, nomor antrian" (0000.mp3)
// lalu disambung angka nomor antrian memakai file suara angka yang SUDAH ADA
// (playTerbilang, sama seperti dipakai untuk menyebut nominal QRIS).
void playQueueSequence(int queueNumber) {
  if (!dfOk)
    return;

  // Batasi nomor antrian 1-99 (sesuai kebutuhan: nomor dari server)
  if (queueNumber < 1)
    queueNumber = 1;
  if (queueNumber > 99)
    queueNumber = 99;

  Serial.printf("[DF] Playing queue sequence, nomor antrian=%d\n", queueNumber);

  // 0. LCD: tampilkan info antrian
  if (lcdOk)
    lcdCenter1("NOMOR ANTRIAN");

  // 1. "Selamat Datang, di E-MOTO GARAGE, nomor antrian" (0000.mp3)
  //    Durasi disamakan gaya track lain (silakan sesuaikan ms-nya kalau
  //    durasi file mp3 asli berbeda).
  playTrack(TRACK_QUEUE_GREETING, 5000);

  // 2. Tampilkan nomor antrian di LCD
  if (lcdOk)
    lcdCenter1("NO. " + String(queueNumber));

  // 3. Sebut nomor antriannya pakai file suara angka lama (playTerbilang)
  playTerbilang(queueNumber);

  // 4. Balik LCD ke status siap
  if (lcdOk)
    lcd2("READY", storeId);
}

// =====================
// Poll Worker
// =====================
PollResult pollOnce() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[POLL] ✗ WiFi not connected");
    logWifiStatus("POLL");
    return POLL_ERROR;
  }
  if (!isPaired()) {
    Serial.println("[POLL] ✗ Device not paired");
    return POLL_ERROR;
  }

  if (!timeSynced) {
    Serial.println("[POLL] NTP not synced, syncing...");
    if (syncTimeNtp(12000)) {
      Serial.println("[POLL] NTP synced, waiting for SSL stack...");
      delay(2000); // Wait for SSL to be ready after NTP
    }
  }

  // Check heap before HTTPS call
  uint32_t freeHeap = ESP.getFreeHeap();
  Serial.printf("[POLL] Free heap: %lu bytes\n", (unsigned long)freeHeap);

  if (freeHeap < 20000) {
    Serial.println("[POLL] ⚠ Low memory, forcing GC...");
    delay(100);
  }

  WiFiClient client;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false); // Don't reuse connections

  String url = String(WORKER_BASE) + "/next-transaction?store_id=" + storeId;

  Serial.printf("[POLL] Connecting to %s\n", WORKER_BASE);

  if (!http.begin(client, url)) {
    Serial.println("[POLL] ✗ http.begin failed");
    return POLL_ERROR;
  }

  http.addHeader("x-device-token", deviceToken);

  int code = http.GET();

  // Retry once if connection failed
  if (code <= 0) {
    Serial.printf("[POLL] ✗ GET failed (code=%d: %s), retrying...\n", code,
                  http.errorToString(code).c_str());
    logWifiStatus("POLL");
    http.end();
    delay(300); // Brief delay before retry

    // Retry with fresh connection
    if (http.begin(client, url)) {
      http.addHeader("x-device-token", deviceToken);
      code = http.GET();

      if (code <= 0) {
        Serial.printf("[POLL] ✗ Retry failed, code=%d: %s\n", code,
                      http.errorToString(code).c_str());
        logWifiStatus("POLL");
        http.end();
        delay(100); // Cleanup delay
        return POLL_ERROR;
      }
    } else {
      Serial.println("[POLL] ✗ Retry http.begin failed");
      return POLL_ERROR;
    }
  }

  String body = http.getString();
  http.end();
  delay(100); // Cleanup delay after http.end()

  if (code != 200) {
    Serial.printf("[POLL] ✗ HTTP %d, body=%s\n", code, body.c_str());
    return POLL_ERROR;
  }

  // DEBUG: Print Body to see what we really got
  Serial.printf("[POLL] Body: %s\n", body.c_str());

  StaticJsonDocument<512> doc; // Increased buffer for safety
  DeserializationError jsonErr = deserializeJson(doc, body);
  if (jsonErr) {
    Serial.printf("[POLL] ✗ JSON parse error: %s\n", jsonErr.c_str());
    return POLL_ERROR;
  }

  // Update store name if provided
  String sName = doc["store_name"] | "";
  if (sName.length() > 0 && !sName.equals(storeName)) {
    Serial.printf("[POLL] New Name Detected: '%s' (was '%s')\n", sName.c_str(),
                  storeName.c_str());
    storeName = sName;
    prefs.putString("storeName", storeName);

    // Force immediate UI update if idle
    if (WiFi.status() == WL_CONNECTED && isPaired() && lcdOk) {
      renderIdleScreen();
    }
  }

  int amount = doc["amount"] | 0;
  const char *txid = doc["transaction_id"] | "";
  bool available = doc["available"] | false;

  // Field baru "type" dari server. Default "qris" supaya backward-compatible
  // dengan response API lama yang belum punya field ini.
  String txType = doc["type"] | "qris";

  // Server only sends transaction_id+amount when a real TX exists.
  // The 'available' field is unreliable (not always sent). Use txid+amount
  // instead.
  if (strlen(txid) == 0 || amount <= 0) {
    Serial.println("[POLL] OK (No TX)");
    return POLL_NO_TX;
  }

  Serial.printf("[POLL] ✓ TX found: %s, type=%s, amount=%d\n", txid,
                txType.c_str(), amount);

  if (txType == "queue") {
    // Nomor antrian pelanggan
    playQueueSequence(amount);
  } else {
    // "qris" (atau nilai lain/tidak dikenal) -> logic pembayaran seperti biasa
    playPaymentSequence(amount);
  }

  if (lcdOk)
    lcd2("READY", storeId);
  Serial.println("[POLL] Back to READY state");

  return POLL_GOT_TX;
}

// =====================
// Setup
// =====================
void setup() {
  Serial.begin(115200);
  delay(300);
  randomSeed(micros());

  Serial.println("\n╔════════════════════════════════╗");
  Serial.println("║  SOUNDBOX v3.0 - WIFI ONLY    ║");
  Serial.println("╚════════════════════════════════╝");
  Serial.println();

  // Preferences MUST be opened BEFORE handleENTripleResetEarly
  Serial.println("[STEP] Opening preferences...");
  prefs.begin("soundbox", false);

  // LCD init
  Serial.println("[STEP] Initializing LCD...");
  lcdOk = initLCD();

  pinMode(EN_RESET_PIN, INPUT_PULLUP);

  // Show Boot Mode
  if (lcdOk) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SOUNDBOX PRO");
    lcd.setCursor(0, 1);
    lcd.print("WIFI VERSION");
    delay(2000);
  }

  // DFPlayer init (MUST be before handleENTripleResetEarly so audio works
  // during factory reset)
  Serial.println("[STEP] Initializing DFPlayer...");
  dfInitNonBlocking();
  if (dfOk)
    playTrack(8, 8000); // 0008.mp3 "Selamat Datang"

  // Now handle EN reset detection (after prefs + LCD + dfplayer ready)
  Serial.println("[STEP] Checking EN reset sequence...");
  handleENTripleResetEarly();
  showENResetIndicator();

  loadPrefs();
  Serial.printf("[STEP] ✓ SSID='%s', paired=%s\n", wifiSsid.c_str(),
                isPaired() ? "YES" : "NO");

  // WIFI MODE
  Serial.println("[STEP] Starting WiFi Mode...");
  Serial.println("[STEP] Starting Access Point...");
  startAP();

  Serial.println("[STEP] Starting HTTP Server...");
  server.on("/", HTTP_GET, handleRoot);
  server.on("/scan-wifi", HTTP_GET, handleScanWifi);
  server.on("/save-wifi", HTTP_POST, handleSaveWifi);
  server.on("/pair", HTTP_GET, handlePair);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/test-worker", HTTP_GET, handleTestWorker);
  server.on("/factory", HTTP_GET, handleFactory);
  server.on("/restart", HTTP_GET, handleRestart);
  server.on("/heap", HTTP_GET, handleHeap);
  server.onNotFound(handleNotFound);
  server.begin();

  // Register WiFi event handler once, before connecting
  WiFi.onEvent(WiFiEvent);

  // Connect to WiFi if configured
  if (!wifiSsid.isEmpty()) {
    Serial.println("[STEP] Connecting to WiFi...");
    connectWiFi(15000);
    if (WiFi.status() == WL_CONNECTED && isPaired()) {
      Serial.println("[STEP] Paired, playing sound...");
      playTrack(7, 4000);
    }
  }
  enforceApPolicy();

  // Final UI Update
  // Status "SET WIFI" / "WAIT PAIR" / "READY (WIFI)" disatukan jadi 1 pesan
  if (lcdOk)
    lcd2("ALAT SUDAH", "SIAP");

  Serial.println("\n[SETUP] COMPLETE");

  // Init Polling
  nextPollAt = millis() + jitteredDelay(POLL_MS);
  backoffMs = POLL_MS;

  // Clear EN reset counter
  prefs.putUInt("enCount", 0);
  prefs.putUInt("enFirstBoot", 0);
}

// =====================
// Poll pairing from worker
// =====================
uint32_t nextPairPollAt = 0;

void pollPairing() {
  String devId = apSsid();
  String url = String(WORKER_BASE) + "/pair-check?device_id=" + devId;

  Serial.printf("[PAIR] Checking worker for pending pair (device_id=%s)...\n",
                devId.c_str());

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, url)) {
    Serial.println("[PAIR] HTTP begin failed");
    return;
  }

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[PAIR] HTTP %d\n", code);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, body)) {
    Serial.println("[PAIR] JSON parse error");
    return;
  }

  bool paired = doc["paired"] | false;
  if (!paired) {
    Serial.println("[PAIR] No pending pair");
    return;
  }

  // Got pairing data!
  storeId = String((const char *)(doc["store_id"] | ""));
  deviceToken = String((const char *)(doc["device_token"] | ""));
  storeName = String((const char *)(doc["store_name"] | ""));

  if (storeId.isEmpty() || deviceToken.isEmpty()) {
    Serial.println("[PAIR] Empty store_id or device_token in response");
    return;
  }

  prefs.putString("storeId", storeId);
  prefs.putString("deviceToken", deviceToken);
  if (!storeName.isEmpty())
    prefs.putString("storeName", storeName);

  Serial.printf("[PAIR] \u2713 AUTO-PAIRED! store_id=%s, name=%s\n",
                storeId.c_str(), storeName.c_str());

  if (dfOk)
    playTrack(7, 4000); // "Pairing Berhasil"

  if (lcdOk)
    lcd2("TERSAMBUNG!", storeId);

  // Turn off AP now that we're paired
  enforceApPolicy();
}

// =====================
// Main Loop
// =====================
void loop() {
  unsigned long now = millis();

  // ==================
  // WIFI MODE LOOP (Original)
  // ==================

  // 0. Cek tombol EN triple-press (live, tidak perlu reboot)
  checkENButtonLive();

  // 1. Process HTTP server requests
  server.handleClient();

  // 2. Process DNS requests
  if (apOn)
    dnsServer.processNextRequest();

  // 3. LCD Main Screen (status statis kalau belum siap, idle scroll kalau sudah)
  if (now - lastIdleDraw > IDLE_ANIM_MS) {
    updateMainScreen();
    lastIdleDraw = now;
  }

  // 4. Poll Worker (WiFi)
  if (WiFi.status() == WL_CONNECTED && isPaired()) {
    if (now >= nextPollAt) {
      Serial.println("[LOOP] Polling worker...");
      PollResult res = pollOnce();

      if (res == POLL_ERROR) {
        pollFailStreak++;
        backoffMs = min(backoffMs * 2, MAX_BACKOFF); // Fixed MAX_BACKOFF usage
      } else {
        pollFailStreak = 0;
        backoffMs = POLL_MS;
      }
      nextPollAt = now + jitteredDelay(backoffMs);
    }
  } else if (WiFi.status() == WL_CONNECTED && !isPaired()) {
    if (now >= nextPairPollAt) {
      pollPairing();
      nextPairPollAt = now + 10000;
    }
  } else {
    // Rely on WiFiEvent to handle fast auto-reconnects non-blockingly.
    // If we've been disconnected for exceptionally long periods and events
    // fail, we use a very relaxed periodic check (every 30 seconds) without
    // blocking the loop UI rendering.
    static uint32_t lastReconnectTry = 0;
    if (!wifiSsid.isEmpty() && WiFi.status() != WL_CONNECTED) {
      if (now - lastReconnectTry > 30000) {
        lastReconnectTry = now;
        Serial.println("[WIFI-LOOP] Periodic disconnected check. Event handler "
                       "should be working...");
        if (lcdOk)
          lcd2("WIFI", "DISCONN.");

        // Non-blocking reconnect trigger just in case
        WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      }
    }
  }

  delay(10);
}