# DormGuard: Smart Dormitory Safety & Access System
Sistem manajemen keamanan asrama pintar yang mengintegrasikan kontrol akses, pemantauan sensor lorong secara real-time, dan **Web Dashboard** menggunakan protokol **gRPC** dan **WebSocket**.

## 👥 Anggota Kelompok
- **Imam Mahmud Dalil Fauzan** - 5027241100
- **Raya Ahmad Syarif** - 5027241041

---

## 📌 Deskripsi Projek
**DormGuard** adalah implementasi sistem terdistribusi yang menghubungkan perangkat IoT, aplikasi terminal, dan Web UI ke satu server pusat. Sistem ini menggunakan **gRPC** untuk komunikasi antar-layanan yang cepat dan **WebSocket** sebagai gateway untuk menyajikan data streaming secara visual ke browser pengguna.

### Layanan Utama:
1. **AccessControl (Unary gRPC)**: Validasi tap kartu penghuni di lobby.
2. **SecurityMonitor (Client-side Streaming)**: Aliran data suhu dari sensor IoT lorong asrama.
3. **Notification (Server-side Streaming)**: Push notifikasi darurat ke aplikasi terminal penghuni.
4. **WebSocket Gateway**: Jembatan data real-time dari gRPC stream ke **Web Dashboard**.

---

## 🏗️ Arsitektur & Interoperabilitas
Sistem ini menggunakan arsitektur **Hybrid gRPC-WebSocket**:
- **Back-end (Node.js)**: Bertindak sebagai gRPC Server sekaligus WebSocket Server.
- **Data Flow**: Data yang masuk melalui *gRPC stream* dari sensor secara otomatis di-*broadcast* ke *WebSocket client* (Browser) untuk ditampilkan pada grafik dan log secara otomatis.

---

## ✅ Fitur Wajib & Implementasi

### 1. gRPC Core
* **Request-Response (Unary)**: Digunakan pada fitur validasi akses pintu asrama.
* **Streaming gRPC**: 
    * **Client-side**: Sensor IoT mengirim data suhu kontinu ke server.
    * **Server-side**: Server mengirim push-notif ke terminal penghuni.
* **Error Handling**: Penggunaan gRPC status codes (`NOT_FOUND`, `INVALID_ARGUMENT`) untuk validasi input.
* **State Management**: Pengelolaan status sistem (SAFE/EMERGENCY) dan daftar client aktif secara *in-memory* di server.

### 2. WebSocket & UI Optimization
* **WebSocket Implementation**: Menghubungkan gRPC streaming data ke Web UI secara real-time.
* **Event-Driven UI**: 3 komponen dinamis di browser: **Grafik Suhu** (Chart.js), **Log Aktivitas** akses, dan **Indikator Status** sistem (Hijau/Merah).
* **Server-Initiated Events**: Server mendorong *Alert* darurat ke browser secara proaktif saat suhu > 50°C.
* **Command & Control Bridge**: Browser dapat mengirim instruksi "RESET SYSTEM" via WebSocket untuk mengubah status *state* di back-end secara otomatis.

---

## 🎮 Skenario Demo
1. **Standby Mode**: Jalankan `server.js` dan buka `index.html` di browser.
2. **Interactive Client**: Jalankan `client.js` di terminal:
    - **Menu 1**: Tap kartu berhasil/gagal akan muncul seketika di **Access Log** Dashboard.
    - **Menu 2**: Mengirim data suhu. Grafik di dashboard akan bergerak naik secara otomatis. Jika suhu > 50°C, Dashboard akan berubah menjadi **EMERGENCY** dan muncul alert.
    - **Menu 3**: Mendemonstrasikan penanganan error jika ID kartu tidak dikenal.
3. **Control Mode**: Klik tombol **RESET ALARM** di Browser untuk mengembalikan status server menjadi **SAFE**.

---

## 🚀 Cara Menjalankan

### 1. Instalasi Dependensi
```bash
# Install gRPC dan WebSocket Library
npm install @grpc/grpc-js @grpc/proto-loader ws
```
### 2. Menjalankan Sistem
    - Server: `node server.js`
    - Web Dashboard: Buka file `index.html` di Browser favorit Anda.
    - Client Simulation: `node client.js` (Gunakan beberapa terminal untuk simulasi multi-client).

## 📂 Struktur Folder
```
week5
├── dormguard.proto    # Definisi Kontrak Service gRPC
├── server.js          # Core Backend (gRPC + WebSocket Server)
├── client.js          # Simulator Hardware/Terminal (CLI)
├── index.html         # Web Dashboard (Front-end)
└── README.md          # Dokumentasi Proyek
```