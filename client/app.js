
const values = o => Object.keys(o).map(k => o[k])
const dom = (tag, v) => `<${tag}>${Array.isArray(v) ? v.join('') : v}</${tag}>`

const now = () => (new Date).getTime()

let fps = 1
let lastFrame = now()

const renderRect = (ctx, rect, color) => {
    ctx.fillStyle = color
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
}

const renderText = (ctx, txt, pos) => {
    ctx.fillStyle = '#0f0'
    ctx.fillText(txt, pos.x, pos.y)
}

const render = (layout, ctx, state) => {
    renderRect(ctx, layout, '#000')

    const ids = Object.keys(state)
    ids.forEach(id => {
        const {pos, color, path} = state[id]
        const x = Math.floor(pos.x / 100 * layout.width)
        const y = Math.floor(pos.y / 100 * layout.height)
        // const {x, y} = pos
        // console.log(x,y)
        if (path) {
            path.forEach((p, i) => {
            const p1 = {
                x: Math.floor(p.x / 100 * layout.width),
                y: Math.floor(p.y / 100 * layout.height)
            }
            const p2 = (i !== path.length - 1) ? {
                x: Math.floor(path[i + 1].x / 100 * layout.width),
                y: Math.floor(path[i + 1].y / 100 * layout.height)
            } : {x, y}

            if (p1.x === p2.x) {
                const yMin = Math.min(p1.y, p2.y)
                renderRect(ctx, {
                    x: p1.x - 1, y: yMin,
                    width: 3, height: Math.max(p1.y, p2.y) - yMin
                }, color)
            } else {
                const xMin = Math.min(p1.x, p2.x)
                renderRect(ctx, {
                    y: p1.y - 1, x: xMin,
                    height: 3, width: Math.max(p1.x, p2.x) - xMin
                }, color)
            }

            })
        }

        if (pos) {
            renderRect(ctx, {
                x: x - 10, y: y - 10,
                width: 20, height: 20,
            }, color)
            renderRect(ctx, {
                x: x - 5, y: y - 5,
                width: 10, height: 10,
            }, '#fff')
        }

    })
    renderText(ctx, fps, {x: layout.width - 25, y: 15})
}

let state = {}
const setState = newState => {
    state = newState
}

//TODO: Make immutable + share with server
const withinLimits = (v, min, max) => Math.max(Math.min(v, max), min)
const clientTick = state => {
    // console.log('client tick')
    const ids = Object.keys(state)
    ids.forEach(id => {
        if (state[id] && state[id].pos && state[id].speed) {
            const {pos, speed} = state[id]
            state[id].pos = {
                x: withinLimits(pos.x + speed.x, 0 ,100),
                y: withinLimits(pos.y + speed.y, 0, 100)
            }
        }
    })
    return state
}

const init = () => {
    const canvas = document.getElementById('game')
    const ctx = canvas.getContext('2d')

    if (!window.io) throw new Error('socket.io is missing!')

    // const boundingRect = canvas.getBoundingClientRect()
    const layout = {
        // x: boundingRect.left,
        // y: boundingRect.top,
        // width: boundingRect.width,
        // height: boundingRect.height
        x: 0,
        y: 0,
        width: 1920,
        height: 1080
    }
    const socket = io.connect('/')
    socket.on('tick', setState)
    // socket.on('tick', newState => {
        // console.log('server tick')
        // setState(newState)
    // })

    // setInterval(() => setState(clientTick(state)), 25)

    const renderLoop = () => {
        render(layout, ctx, state)
        let t = now()
        if (t % 10 /* arbitrary */ === 0) fps = Math.floor(1000 / (t - lastFrame))
        lastFrame = t
        window.requestAnimationFrame(renderLoop)
    }


    window.addEventListener('keydown', e => socket.emit('userAction', e.keyCode))

    renderLoop()
}

init()
