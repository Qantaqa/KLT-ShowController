
import dgram from 'node:dgram';
import http from 'node:http';
import os from 'node:os';

const AGENT_PORT = 3000;
const DISCOVERY_PORT = 5566;
const AGENT_NAME = process.env.AGENT_NAME || 'TestWall_Alpha';
const AGENT_MODEL = process.env.AGENT_MODEL || '4-screen';
const AGENT_LAYOUT = process.env.AGENT_LAYOUT || '2x2';
const AGENT_ORIENTATION = process.env.AGENT_ORIENTATION || 'landscape';

// UDP Discovery
const udp = dgram.createSocket('udp4');
udp.on('message', (msg, rinfo) => {
    try {
        const data = JSON.parse(msg.toString());
        if (data.action === 'discover_agent') {
            console.log(`[Discovery] Request from ${rinfo.address}:${rinfo.port}`);

            // Get MAC
            let mac = '00:00:00:00:00:00';
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name] || []) {
                    if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                        mac = iface.mac;
                        break;
                    }
                }
                if (mac !== '00:00:00:00:00:00') break;
            }

            const response = JSON.stringify({
                type: 'ledwall_agent_response',
                mac: mac,
                name: AGENT_NAME,
                version: '1.0.0-TEST',
                model: AGENT_MODEL,
                layout: AGENT_LAYOUT,
                orientation: AGENT_ORIENTATION
            });
            udp.send(response, rinfo.port, rinfo.address);
        }
    } catch (e) { }
});
udp.bind(DISCOVERY_PORT, () => {
    console.log(`[Discovery] Listening on port ${DISCOVERY_PORT}`);
});

// HTTP Status
const server = http.createServer((req, res) => {
    if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'running', agent: 'LedShow TEST Agent' }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>Test Agent "${AGENT_NAME}" Active</h1><p>Model: ${AGENT_MODEL}</p><p>Layout: ${AGENT_LAYOUT}</p>`);
});
server.listen(AGENT_PORT, () => {
    console.log(`[HTTP] Status server listening on port ${AGENT_PORT}`);
});

console.log('--- TEST AGENT RUNNING ---');
console.log(`Name: ${AGENT_NAME}`);
console.log(`Config: ${AGENT_MODEL} - ${AGENT_LAYOUT} (${AGENT_ORIENTATION})`);
