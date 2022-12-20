let ws = null;
let myPlayer = {
    id: null,
    x: 0,
    y: 0
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.height = window.innerHeight
canvas.width = window.innerWidth

let players = new Map();



let packets = {
    0x0: "initGame",
    0x1: "newPlayer",
    0x2: "playerData",
    0x3: "sendMove"
}

function chunk(arr, size) {
    let chunks = [];

    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }

    return chunks;
}

function sendMoveMsg(keycode) {
    let buffer = new ArrayBuffer(2);
    let view = new DataView(buffer);

    view.setUint8(0, 3);
    view.setUint8(1, keycode);

    ws.send(buffer);
}

document.addEventListener('keydown', e => {
    if (e.keyCode == 87) {
        sendMoveMsg(87);
    } else if (e.keyCode == 83) {
        sendMoveMsg(83);
    } else if (e.keyCode == 65) {
        sendMoveMsg(65);
    } else if (e.keyCode == 68) {
        sendMoveMsg(68);
    }
});


function joinGame() {
    ws = new WebSocket('ws://localhost:3000/ws');
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
        console.log('Connected to server');
        requestGameJoin();

        setInterval(() => {
            let buffer = new ArrayBuffer(1);
            let view = new DataView(buffer);

            view.setUint8(0, 2);

            ws.send(buffer);
        }, 1/3);
    };

    ws.onmessage = msg => {
        let buffer = new Uint8Array(msg.data).buffer

        let view = new DataView(buffer);


        let packet = {
            type: view.getUint8(0),
            data: buffer.slice(1)
        }

        let type = packets[packet.type];
        if (type) {
            switch (type) {
                case "initGame": {
                    let id = view.getUint8(1);
                    console.log("Got id: " + id);
                    myPlayer.id = id;
                    spawnGame();
                    break;
                }
                case "newPlayer": {
                    let id = view.getUint8(1);
                    let x = view.getUint8(2);
                    let y = view.getUint8(3);

                    players.set(id, {
                        x: x,
                        y: y
                    });

                    myPlayer.x = x;
                    myPlayer.y = y;
                    break;
                }

                case "playerData": {
                    let data = msg.data;
                    let view = new DataView(data)
                    let i = 1
                    while (i < data.byteLength) {
                        let id = view.getUint16(i)
                        i += 2
                        let x = view.getInt16(i)
                        i += 2
                        let y = view.getInt16(i)
                        i += 2
                        players.set(id, {
                            x: x,
                            y: y
                        })
                    }

                    break;
                }
                default:
                    console.log(view)

            }
        }

    };

    ws.onclose = () => {
        console.log('Disconnected from server');
    };
}

function requestGameJoin() {
    let buffer = new ArrayBuffer(1);
    let view = new DataView(buffer);
    view.setUint8(0, 0);

    ws.send(buffer);
}

function spawnGame() {
    let buffer = new ArrayBuffer(2);
    let view = new DataView(buffer);

    view.setUint8(0, 1);
    view.setUint8(1, myPlayer.id);

    ws.send(buffer);
}

joinGame();

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let player of players) {
        ctx.fillStyle = "blue";
        if (player[0] == myPlayer.id) {
            ctx.fillStyle = "red";
        }

        ctx.fillRect(player[1].x, player[1].y, 10, 10);
    }
}

setInterval(draw, 1000 / 60);