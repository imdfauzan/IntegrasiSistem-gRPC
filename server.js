const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { WebSocketServer } = require('ws'); // Library WebSocket (Pastikan sudah npm install ws)

const packageDef = protoLoader.loadSync("dormguard.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const dormProto = grpc.loadPackageDefinition(packageDef).dormguard;

const state = {
    residents: ["Fauzan", "Raya", "Prof Bambang"],
    systemStatus: "SAFE", // Tambahan untuk status sistem
    connectedSubscribers: new Set(),
    wsClients: new Set()
};

// --- PERUBAHAN DI SERVICE 1: Access (Unary) ---
function validateEntry(call, callback) {
    const { resident_id, door_id } = call.request;
    console.log(`\n[Access] Request: ID ${resident_id} di ${door_id}`);

    const isRegistered = state.residents.includes(resident_id);

    // FITUR: Kirim Log ke Web UI secara otomatis
    broadcastToWeb({
        event: 'ACCESS_LOG',
        message: `${resident_id} mencoba akses ${door_id}`,
        status: isRegistered ? 'SUCCESS' : 'FAILED'
    });

    if (!resident_id || !door_id) {
        return callback({ code: grpc.status.INVALID_ARGUMENT, message: "Data tidak lengkap!" });
    }

    if (isRegistered) {
        callback(null, { granted: true, message: `Selamat datang, ${resident_id}!` });
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: "ID tidak dikenal!" });
    }
}

// --- PERUBAHAN DI SERVICE 2: Security (Client-side Streaming) ---
function streamSensorData(call, callback) {
    let internalCount = 0;

    call.on('data', (data) => {
        internalCount++;
        console.log(`[Sensor] Masuk: ${data.sensor_id} | Suhu: ${data.temperature}°C`);

        // FITUR WAJIB 1: Hubungkan gRPC stream ke WebSocket
        broadcastToWeb({
            event: 'SENSOR_UPDATE',
            sensor_id: data.sensor_id,
            temperature: data.temperature
        });

        if (data.temperature > 50) {
            state.systemStatus = "EMERGENCY";
            // FITUR WAJIB 3: Server-Initiated Event (Push notif ke Browser)
            broadcastToWeb({ event: 'SYSTEM_ALERT', message: `BAHAYA! Suhu tinggi di ${data.sensor_id}` });
            broadcastAlert("FIRE_ALERT", `BAHAYA! Suhu ${data.temperature}°C di ${data.sensor_id}`);
        }
    });

    call.on('end', () => {
        callback(null, { status: "Monitoring Selesai", total_packets_received: internalCount });
    });
}

// Service 3: Notification (Tetap sama)
function subscribeAlerts(call) {
    const { resident_id } = call.request;
    state.connectedSubscribers.add(call);
    call.write({ type: "INFO", description: "Terhubung ke DormGuard System." });
    call.on('cancelled', () => state.connectedSubscribers.delete(call));
}

function broadcastAlert(type, description) {
    const msg = { type, description };
    state.connectedSubscribers.forEach(c => c.write(msg));
}

// --- FITUR WAJIB 1 & 4: WEBSOCKET SERVER & BRIDGE ---
const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket Server berjalan di port 8080");

wss.on('connection', (ws) => {
    state.wsClients.add(ws);

    // Kirim status awal ke browser saat baru konek
    ws.send(JSON.stringify({ event: 'SYSTEM_STATUS', status: state.systemStatus }));

    // FITUR WAJIB 4: Command & Control Bridge (Terima instruksi dari Browser)
    ws.on('message', (message) => {
        const command = JSON.parse(message);
        if (command.type === 'RESET_SYSTEM') {
            console.log("[Control] Reset sistem diminta oleh Browser.");
            state.systemStatus = "SAFE";
            broadcastToWeb({ event: 'SYSTEM_ALERT', message: 'Sistem telah di-reset oleh Admin.' });
        }
    });

    ws.on('close', () => state.wsClients.delete(ws));
});

function broadcastToWeb(data) {
    state.wsClients.forEach(ws => {
        if (ws.readyState === 1) ws.send(JSON.stringify(data));
    });
}

function main() {
    const server = new grpc.Server();
    server.addService(dormProto.AccessControl.service, { validateEntry });
    server.addService(dormProto.SecurityMonitor.service, { streamSensorData });
    server.addService(dormProto.Notification.service, { subscribeAlerts });

    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) return console.error(err);
        console.log(`gRPC Server DormGuard jalan di port ${port}`);
    });
}

main();