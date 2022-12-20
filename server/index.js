const express = require("express");
const expressws = require("express-ws");
const cors = require("cors");

const app = express();

const PORT = 3000;

expressws(app);

app.use(cors());

let players = new Map();

const packets = {
    0x0: "initGame",
    0x1: "newPlayer",
    0x2: "requestPlayerData",
    0x3: "sendMove",
};

function generateID() {
    let id = Math.floor(Math.random() * 255);

    if (players.has(id)) {
        return generateID();
    } else {
        return id;
    }
}

app.ws("/ws", (ws, req) => {
    let userid = null;
    console.log("Client connected");

    ws.on("message", (msg) => {
        const buffer = new Uint8Array(msg).buffer;
        const view = new DataView(buffer);
        const packet = {
            type: view.getUint8(0),
            data: buffer.slice(1),
        };

        const type = packets[packet.type];
        if (!type) {
            return;
        }

        switch (type) {
            case "initGame": {
                const id = userid = generateID();
                const bfer = Buffer.alloc(2);
                const view = new DataView(bfer.buffer);

                view.setUint8(0, 0);
                view.setUint8(1, id);

                ws.send(bfer);

                players.set(userid, []);
                break;
            }
            case "newPlayer": {
                const id = view.getUint8(1);
                const x = 100;
                const y = 100;

                const bfer = Buffer.alloc(4);
                const vieww = new DataView(bfer.buffer);

                vieww.setUint8(0, 1); // packet type
                vieww.setUint8(1, id); // player id
                vieww.setUint8(2, x); // x
                vieww.setUint8(3, y); // y

                players.set(id, [x, y]);

                ws.send(bfer);
                break;
            }

            case "requestPlayerData": {
                const data = new ArrayBuffer(1 + players.size * 6); // 1 byte opcode, 2 bytes * id,x, y * players
                const view = new DataView(data);
                let i = 0;
                view.setUint8(i++, 2);

                for (let [id, [x, y]] of players) {
                    view.setUint16(i, id);
                    i += 2;
                    view.setInt16(i, x);
                    i += 2;
                    view.setInt16(i, y);
                    i += 2;
                }

                ws.send(data);
                break;
            }

            case "sendMove": {
                const keyCode = view.getUint8(1);
                let [x, y] = players.get(userid);

                switch (keyCode) {
                    case 83: // w (up)
                        y += 10;
                        break;
                    case 87: // s (down)
                        y -= 10;
                        break;
                    case 65: // a (left)
                        x -= 10;
                        break;
                    case 68: // d (right)
                        x += 10;
                        break;
                }

                players.set(userid, [x, y]);
                console.log(players);
                break;
            }
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        players.delete(userid);
    });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
