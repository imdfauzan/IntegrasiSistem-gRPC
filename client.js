const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

const packageDef = protoLoader.loadSync("dormguard.proto", { keepCase: true });
const dormProto = grpc.loadPackageDefinition(packageDef).dormguard;

const clientAccess = new dormProto.AccessControl('localhost:50051', grpc.credentials.createInsecure());
const clientSensor = new dormProto.SecurityMonitor('localhost:50051', grpc.credentials.createInsecure());
const clientNotify = new dormProto.Notification('localhost:50051', grpc.credentials.createInsecure());

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Kita buat notifikasi jalan terus di background
function startNotification(name) {
    const call = clientNotify.subscribeAlerts({ resident_id: name });
    call.on('data', (alert) => {
        console.log(`\n\n📢 [NOTIFIKASI]: ${alert.type} - ${alert.description}`);
        process.stdout.write("Pilih menu (1-4): ");
    });
    call.on('error', () => { });
}

function showMenu() {
    console.log("\n--- DORMGUARD INTERACTIVE MENU ---");
    console.log("1. Tap Kartu (Unary)");
    console.log("2. Kirim Data Sensor Lorong (Client-side Streaming)");
    console.log("3. Keluar");
    rl.question("Pilih menu (1-3): ", (choice) => {
        switch (choice) {
            case '1':
                rl.question("Masukkan Nama Resident: ", (name) => {
                    clientAccess.validateEntry({ resident_id: name, door_id: "LOBBY_A" }, (err, res) => {
                        if (err) console.error("❌ Error:", err.message);
                        else console.log("✅ Response:", res.message);
                        showMenu();
                    });
                });
                break;
            case '2':
                console.log("Mengecek Suhu Lorong...");
                const stream = clientSensor.streamSensorData((err, res) => {
                    if (err) console.error(err);
                    else console.log("🏁 Summary Server:", res.status, "| Total Data:", res.total_packets_received);
                    showMenu();
                });
                stream.write({ sensor_id: "LORONG_1", temperature: 25 });
                setTimeout(() => stream.write({ sensor_id: "LORONG_1", temperature: 30 }), 1000);
                setTimeout(() => stream.write({ sensor_id: "LORONG_1", temperature: 60 }), 2000); // Trigger Alert
                setTimeout(() => stream.end(), 3000);
                break;
            case '3':
                clientAccess.validateEntry({ resident_id: "ORANG_ASING", door_id: "LOBBY_A" }, (err, res) => {
                    console.log("Mengetes Error Handling (ID Salah)...");
                    if (err) console.log("✅ Berhasil Menangkap Error:", err.message);
                    showMenu();
                });
                break;
            case '4':
                console.log("Sampai jumpa!");
                process.exit();
                break;
            default:
                console.log("Pilihan tidak ada.");
                showMenu();
                break;
        }
    });
}

// RUN
console.log("Selamat Datang di DormGuard Client");
rl.question("Siapa nama Anda untuk login aplikasi? ", (name) => {
    startNotification(name);
    showMenu();
});