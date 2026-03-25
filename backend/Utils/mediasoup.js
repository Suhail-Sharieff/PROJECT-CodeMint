import * as mediasoup from 'mediasoup';

let worker;

export const createWorker = async () => {
    worker = await mediasoup.createWorker({
        rtcMinPort: 10000,
        rtcMaxPort: 10100, // Configure range of ports for WebRTC traffic
    });

    worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
        setTimeout(() => process.exit(1), 2000);
    });

    console.log(`[Mediasoup] Worker created (pid: ${worker.pid})`);
    return worker;
};

export const getWorker = () => {
    if (!worker) {
        throw new Error("Mediasoup Worker has not been created yet.");
    }
    return worker;
};

// Common configuration for mediasoup Routers and Transports
export const mediasoupConfig = {
    // Router config
    routerOptions: {
        mediaCodecs: [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
        ],
    },
    // WebRtcTransport config
    webRtcTransportOptions: {
        // Here we provide the IP to bind to. In production, this should be the public IP.
        listenIps: [
            {
                ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
                announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    },
};
