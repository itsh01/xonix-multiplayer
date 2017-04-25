// 'use strict'

const express = require('express')
const {createServer} = require('http')
const {listen} = require('socket.io')

const app = express()
const server = createServer(app)
const io = listen(server)

app.use(express.static('client'))

const clients = {}

const removeClient = id => {
    delete clients[id]
}

const randomColor = () => '#' + [0,0,0]
    .map(() => 5 + Math.floor(Math.random() * 10))
    .map(n => n.toString(16))
    .join('')

const randomPercent = () => Math.floor(Math.random() * 100)
const generateNewClientState = () => {
    x = randomPercent()
    y = randomPercent()
    return {
        pos: {x, y},
        speed: {x: 0, y: 0},
        area: [
            {x, y},
            {x: x - 5, y},
            {x: x - 5, y: y + 5},
            {x: x, y: y + 5}
        ],
        path: [],
        color: randomColor()
    }
}

const KEYS = {
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
}

const DIR = {
    LEFT: {x: -1, y: 0},
    UP: {x: 0, y: -1},
    RIGHT: {x: 1, y: 0},
    DOWN: {x: 0, y: 1},
}

const isSameDir = (a, b) => a && b && a.x === b.x && a.y === b.y

const userAction = (socketId, keyCode) => {
    const key = KEYS[keyCode]
    const dirChanged = !isSameDir(clients[socketId].speed, DIR[key])
    clients[socketId].speed = DIR[key] || {x: 0, y: 0}

    if (dirChanged && DIR[key]) {
        clients[socketId].path.push(clients[socketId].pos)
    }
}

const addClient = socket => {
    clients[socket.id] = generateNewClientState()

    socket.on('userAction', keyCode => userAction(socket.id, keyCode))
    socket.on('disconnect', () => { removeClient(socket.id) })
}

io.sockets.on('connection', addClient)

const findHit = (client) => {
    const {x, y} = client.pos
    const possibleHits = client.area.reduce((acc, p, i) => {
        return (i < client.area.length - 1 && (
            (p.x === x && client.area[i + 1].x === p.x) ||
            (p.y === y && client.area[i + 1].y === p.y)
        )) ? acc.concat({p, i}) : acc
    }, [])

    return possibleHits.find(({p, i}) =>
        (p.x < x && x < client.area[i + 1].x) ||
        (p.x > x && x > client.area[i + 1].x) ||
        (p.y < y && y < client.area[i + 1].y) ||
        (p.y > y && y > client.area[i + 1].y)
    )
}

const withinLimits = (v, min, max) => Math.max(Math.min(v, max), min)
const gameTick = () => {
    const ids = Object.keys(clients)
    ids.forEach(id => {
        if (clients[id] && clients[id].pos && clients[id].speed) {
            const {pos, speed} = clients[id]
            clients[id].pos = {
                x: withinLimits(pos.x + speed.x, 0 ,100),
                y: withinLimits(pos.y + speed.y, 0, 100)
            }

            if (clients[id].area && clients[id].path && (speed.x || speed.y)) {
                const hit = findHit(clients[id])

                if (hit) {
                    const pathStart = findHit(Object.assign({}, clients[id], {pos: clients[id].path[0]}))
                    clients[id].area = clients[id].area.slice(0, pathStart)
                        .concat(clients[id].path)
                        .concat(clients[id].pos)
                        .concat(clients[id].area.slice(pathStart + 1))
                    clients[id].path = []
                    clients[id].speed = {x: 0, y: 0}
                }
            }
        }

    })
}

const sendUpdates = () => io.sockets.emit('tick', clients)

setInterval(gameTick, 1000 / 60)
setInterval(sendUpdates, 1000 / 40)
// setInterval(sendUpdates, 1000 / 60)

const blue = t => '\033[1;34m' + t + '\033[0m'
server.listen(1234, () => console.log(`open: ${blue('http://localhost:1234/')}`))
