import ui_ from "./ui.js"
import vertexShaderCode from "./shaders/vertex.js"
import gateShaderCode from "./shaders/gate.js"
import { FluidDynamics, webGlUtils } from "@bienehito/fluid-dynamics"
import { vecAdd, vecMinus, vecMult, vecLen, vecDot, vecProduct } from "./utils.js"
import { playSfx, sfx, playMusic, nextMuteState } from "./sound.js"

window.addEventListener("load", function () {
    const canvas3d = document.getElementById("canvas3d"),
        canvas2d = document.getElementById("canvas2d"),
        gl = canvas3d.getContext("webgl2"),
        ctx = canvas2d.getContext("2d"),
        fd = new FluidDynamics(gl, {
            velocityDissipation: 0.1,
            dyeDissipation: 0.6,
            curl: 10,
            paused: true,
            postRender: update,
        }),
        ui = ui_(ctx)

    // Game constants.
    const weaponLength = 0.02,
        weaponColor = "white",
        forceLength = 0.07,
        forceWidth = 0.02,
        forceStrength = 0.6,
        forceLengthScaleStep = 2,
        forceWidthScaleStep = 2,
        turnSpeed = 0.04,
        gravity = 20,
        borderBounce = 0.8,
        gateBottom = 0.55,
        gateHeight = 0.25,
        gateScaleStep = 2,
        startBallRadius = 0.03,
        maxBallScale = 5,
        ballScaleStepUp = 1.1,
        ballScaleStepDown = 2,
        startBallPosition = [0.5, 0.25],
        startBallVelocity = [0, 0.20],
        numPowerUps = 2,
        powerUpRadius = 10,
        powerUpColors = ["#ff4", "#4f4"],
        powerUpLabels = ["+", "-"],
        powerUpLabelColor = "#222",
        powerUpTransition = 1, // sec
        powerUpDuration = 10 // sec


    // Game state variables
    var state, // main game state: "title", "ready", "play", "score"
        enableBallScale // hitting the floor and ceiling will scale ball.
    const players = [
        { // Left player.
            x: 0.2,
            y: 0.02,
            angle: 1.04,
            color: [0, 0.1, 0.8],
            score: 0,
        },
        { // Right player.
            x: 0.8,
            y: 0.02,
            angle: 2.09,
            color: [0.8, 0.1, 0],
            score: 0,
        }],
        ball = {
            density: 2,
            color: "white",
        }

    // Track key press status.
    const keyDown = {};
    window.onkeydown = function (e) {
        keyDown[e.code] = true;
    }
    window.onkeyup = function (e) {
        keyDown[e.code] = false;
    }

    // Canvas size and base dimension for object sizes.
    var width, height, baseDim;
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    function resizeCanvas() {
        width = canvas3d.scrollWidth
        height = canvas3d.scrollHeight
        baseDim = width
        canvas3d.width = width
        canvas3d.height = height
        canvas2d.width = width
        canvas2d.height = height
        fd.bottom = 0
        fd.left = 0
        fd.width = width
        fd.height = height
    }

    async function shoot(pid) {
        const player = players[pid],
            cos = Math.cos(player.angle),
            sin = Math.sin(player.angle),
            l = forceLength * Math.pow(forceLengthScaleStep, player.powerLevel),
            w = forceWidth * Math.pow(forceWidthScaleStep, player.powerLevel),
            x = width * player.x + baseDim * (weaponLength + l) * cos,
            y = height * player.y + baseDim * (weaponLength + l) * sin
        fd.setDye(x, y, player.angle, baseDim * l, baseDim * w, player.color)
        fd.setVelocity(x, y, player.angle, baseDim * l, baseDim * w, baseDim * forceStrength * cos, baseDim * forceStrength * sin)
        player.shootSfx.gain = player.powerLevel + 1
        player.shootSfx.start()
    }

    function stopShooting(pid) {
        players[pid].shootSfx.stop(0.5)
    }

    function turn(pid, dir) {
        var angle = players[pid].angle
        angle += turnSpeed * dir
        players[pid].angle = Math.max(0, Math.min(3.14, angle))
    }

    function drawWeapon(pid) {
        const player = players[pid],
            cos = Math.cos(player.angle),
            sin = Math.sin(player.angle),
            l = 10 * Math.pow(2, player.powerLevel), // length of the cross
            w = 5 * Math.pow(2, player.powerLevel), // width of the cross
            x = player.x * width + baseDim * weaponLength * cos,
            y = (1.0 - player.y) * height - baseDim * weaponLength * sin
        ctx.beginPath();
        ctx.moveTo(x - l * cos, y + l * sin)
        ctx.lineTo(x + l * cos, y - l * sin)
        ctx.moveTo(x - w * sin, y - w * cos)
        ctx.lineTo(x + w * sin, y + w * cos)
        ctx.lineWidth = 2 * Math.pow(2, player.powerLevel)
        ctx.strokeStyle = weaponColor
        ctx.stroke();
    }

    var ballsVisible = true
    function drawBalls() {
        if (!ballsVisible) return
        for (let ball of fd.solids) {
            ctx.beginPath()
            ctx.arc(ball.position[0], height - ball.position[1], ball.radius, 0, 2 * Math.PI)
            ctx.fillStyle = ball.color
            ctx.fill()
            if (ball.text) {
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillStyle = ball.textStyle
                ctx.font = "bold " + ball.radius * 2 + "px Verdana"
                ctx.fillText(ball.text, ball.position[0], height - ball.position[1])
            }
        }
    }

    // UI text elements.
    const
        titleFontSize = () => Math.floor(Math.min(height * 0.1, width * 0.1)),
        titleNotes = [{
            text: "Scale Control:",
            pos: () => [width / 2, height / 2 - titleFontSize() * 0.7],
            font: () => titleFontSize() + "px Verdana",
            color: [200, 200, 100]
        },
        {
            text: "A Liquid Experience",
            pos: () => [width / 2, height / 2 + titleFontSize() * 0.7],
            font: () => titleFontSize() * 0.8 + "px Verdana",
            color: [200, 200, 100]
        }],
        instructionNotes = [-1, 1].map(i => ({
            text: i < 0 ? "A W D" : "← ↑ →",
            pos: () => [(0.5 + i * 0.3) * width, 0.8 * height],
            color: i < 0 ? [100, 100, 255] : [255, 100, 100]
        })),
        anyKeyNote = {
            text: "press any key",
            pos: () => [width / 2, height * 0.9],
            color: [255, 255, 255]
        },
        renderSourceNote = {
            pos: () => [width / 2, height * 0.9],
            color: [255, 255, 0],
        },
        playerScoreY = () => height * 0.3,
        playerScoreFont = () => Math.floor(height) * 0.2 + "px Verdana",
        playerScoreDividerNote = {
            text: ":",
            pos: () => [width / 2, playerScoreY()],
            font: playerScoreFont,
            color: [255, 255, 255],
        },
        playerScoreNotes = [-1, 1].map(i => ({
            pos: () => [width / 2 + i * 50, playerScoreY()],
            align: i < 0 ? "right" : "left",
            font: playerScoreFont,
            color: i < 0 ? [0, 0, 255] : [255, 0, 0],
            lineWidth: 2,
            strokeColor: [255, 255, 255]
        }))


    // Gate
    const vao = webGlUtils.vertexArrayObject2D(gl, [-1, -1, -1, 1, 1, 1, 1, -1], [0, 1, 2, 0, 2, 3])
    const programs = webGlUtils.compilePrograms(gl, {
        gate: [vertexShaderCode, gateShaderCode],
    })
    const gatePhases = [0, 0, 0], gatePhaseDeltas = [0.02, -0.04, 0.06]
    var minGateWidth = 0

    function animateGate() {
        for (let i = 0; i < 3; i++) {
            gatePhases[i] += gatePhaseDeltas[i];
        }
    }

    function drawGate() {
        if (!ball.position) return
        const theBall = ball,
            senseX = 0.3, // x of a ball at which gate starts to show.
            powerUpWidth = 0.3 // power ups have a smaller gate width.
        for (let left of [true, false]) {
            // Width: 0 when ball is at senseX, 1 or powerUpWidth when ball is at 0.
            var gateWidth = minGateWidth
            // Color: 1 when ball is at >= 0, 0 when ball is at -radius.
            var gateColor = 1
            for (let ball of fd.solids) {
                const isMain = ball == theBall,
                    x = (left ? ball.position[0] : width - ball.position[0]) / width
                gateWidth = Math.max(gateWidth,
                    Math.min(1, 1 - x / senseX) * (isMain ? 1 : powerUpWidth))
                gateColor = Math.min(gateColor,
                    1 - Math.max(0, -x / (ball.radius / width)))
            }
            if (!gateWidth) continue
            // Draw gate.
            programs.gate.use({
                anglePoint: [left ? -1 : 2, 0.5],
                distPoint: [left ? 0 : 1, 0.5],
                amplitude: [0.2 * gateWidth, 0.2 * gateWidth, 0.1 * gateWidth],
                frequency: [20, 55, 107],
                base: [2.5, 0, 0],
                maxAngle: 0.29,
                color: [left ? 0.8 : gateColor, gateColor, left ? gateColor : 0.8],
                phase: gatePhases,
            })
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            const [gateBottom, gateHeight] = gatePos(left ? 0 : 1),
                s = 0.4 // Extra height for rays that go outside of the gate.
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.enable(gl.BLEND);
            gl.viewport(left ? 0 : width - width * 0.1,
                height * (gateBottom - gateHeight * s),
                width * 0.1,
                height * gateHeight * (1 + 2 * s));
            gl.bindVertexArray(vao)
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)

            // ctx.beginPath();
            // ctx.moveTo(0, height * (1 - gateBottom))
            // ctx.lineTo(0, height * (1 - gateBottom - gateHeight))
            // ctx.lineWidth = 10
            // ctx.strokeStyle = "red"
            // ctx.stroke()
        }
    }


    /** Transitions the game to show title. */
    function toTitleState() {
        state = "title"
        for (var note of titleNotes)
            ui.showNote(note)
        setTimeout(toReadyState, 2000)
    }

    /** Transitions the game to ready to play state. */
    function toReadyState() {
        state = "ready"
        ui.showNote(anyKeyNote)
    }

    /** Transitions the game to main play state. */
    function toPlayState() {
        state = "play"
        enableBallScale = true
        // Hide title.
        for (var note of titleNotes)
            ui.hideNote(note)
        // Hide score notes.
        for (let i = 0; i < 2; i++)
            ui.hideNote(playerScoreNotes[i])
        ui.hideNote(playerScoreDividerNote)
        ui.hideNote(anyKeyNote)
        // Show instruction notes if didn't show them before.
        for (let i = 0; i < 2; i++)
            if (instructionNotes[i].transparency == undefined)
                ui.showNote(instructionNotes[i])
        // Set up players
        for (let i = 0; i < 2; i++) {
            // Reset power levels.
            players[i].powerLevel = 0
            players[i].newPowerLevel = 0
            players[i].powerUpDuration = 0
            // Create shoot sfx instances.
            players[i].shootSfx = sfx("shoot", { pan: i == 0 ? -1 : 1 })
        }
        // Reposition balls.
        const wh = [width, height]
        ball.radius = startBallRadius * baseDim
        ball.position = vecProduct(startBallPosition, wh)
        ball.velocity = vecProduct(startBallVelocity, wh)
        fd.solids = [ball]
        for (let i = 0; i < numPowerUps; i++) {
            fd.solids.push({
                position: [width * Math.random(), height * Math.random()],
                velocity: [0, 0],
                // position: [width / 2, height / 2 + i * 300],
                // velocity: [0, -200],
                // position: [300 + i * 200, 1000],
                // velocity: [-400, 0],
                radius: powerUpRadius,
                density: 2,
                color: powerUpColors[i % 2],
                text: powerUpLabels[i % 2],
                textStyle: powerUpLabelColor,
            })
        }
        // Reset and start simulation.
        fd.reset()
        fd.paused = false
        playMusic()
        gtag("event", "level_start", { level_name: players[0].score + players[1].score })
    }

    /** Transitions the game to show scores state. */
    function toScoreState() {
        state = "score"
        // fd.paused = true
        for (let i = 0; i < 2; i++) {
            playerScoreNotes[i].text = players[i].score
            ui.showNote(playerScoreNotes[i])
            stopShooting(i)
        }
        ui.showNote(playerScoreDividerNote)
        setTimeout(toReadyState, 3000)
    }

    /** FPS counter.*/
    var fps = 0, frameCounter = 0
    function computeFps() {
        fps = frameCounter
        console.log("fps", this.fps)
        frameCounter = 0
        window.setTimeout(computeFps, 1000)
    }

    // Main update loop.
    function update(dt) {
        if (keyDown["KeyA"]) turn(0, 1)
        if (keyDown["KeyD"]) turn(0, -1)
        if (keyDown["ArrowLeft"]) turn(1, 1)
        if (keyDown["ArrowRight"]) turn(1, -1)
        if (state == "play") {
            if (keyDown["KeyW"]) shoot(0)
            else stopShooting(0)
            if (keyDown["ArrowUp"]) shoot(1)
            else stopShooting(1)
        }
        if (!fd.paused) {
            ballPhysics(dt)
            scoreCheck()
            powerUpCheck()
            powerUpUpdate(dt)
        }
        animateGate()
        render()
        frameCounter += 1
    }

    /** Scales ball up or down based on dir. */
    function scaleBall(dir) {
        if (!enableBallScale) return
        enableBallScale = false
        const scaledRadius = ball.radius * Math.pow(dir > 0 ? ballScaleStepUp : ballScaleStepDown, dir),
            newRadius = Math.max(startBallRadius * baseDim / maxBallScale,
                Math.min(startBallRadius * baseDim * maxBallScale, scaledRadius)
            )
        if (ball.radius != newRadius) {
            ball.radius = newRadius
            playSfx("ballScale", { rate: Math.sqrt(startBallRadius * baseDim / newRadius) })
        }
        setTimeout(() => enableBallScale = true, 1000)
    }

    /** Returns array of points to check for collision: [[x, y], optional ball]. */
    function collisionPoints(ball) {
        // Border and gate collision.
        const
            [posX, posY] = ball.position,
            closeXi = posX < width / 2 ? 0 : 1,
            closeX = closeXi * width,
            closeY = posY < height / 2 ? 0 : height,
            [gateBottom, gateHeight] = gatePos(closeXi),
            gateBottomPx = gateBottom * height,
            gateTopPx = (gateBottom + gateHeight) * height,
            collisionPoints = [
                [[posX, closeY]], // Top or bottom of the screen.
            ]
        if (posY > gateBottomPx && posY < gateTopPx) {
            // Gate edges.
            collisionPoints.push([[closeX, gateBottomPx]])
            collisionPoints.push([[closeX, gateTopPx]])
        } else {
            // Left or right of the screen.
            collisionPoints.push([[closeX, posY]])
        }
        // Other balls.
        for (let otherBall of fd.solids) {
            if (otherBall != ball)
                collisionPoints.push([otherBall.position, otherBall])
        }
        return collisionPoints
    }

    function ballPhysics(dt) {
        const mainBall = ball,
            // Velocity and position deltas to apply to balls: [ball, positionDelta, velocityDelta]
            deltas = []
        for (let ball of fd.solids) {
            var positionDelta = [0, 0], velocityDelta = [0, 0]

            // Apply gravity.
            velocityDelta[1] -= dt * gravity

            // Check for collisions.
            for (let point of collisionPoints(ball)) {
                const
                    // Vector from ball position to point position.
                    posDelta = vecMinus(point[0], ball.position), posDeltaLen = vecLen(posDelta),
                    otherBall = point[1],
                    // Distance at which collision woul occur.
                    colDist = ball.radius + (otherBall ? otherBall.radius : 0)
                if (posDeltaLen < colDist) {
                    // Scale ball if it hits top or bottom of the screen.
                    if (ball == mainBall && !otherBall) {
                        if (point[0][1] == height) scaleBall(1)
                        if (point[0][1] == 0) scaleBall(-1)
                    }
                    const
                        // Unit vector in direction from ball to point.
                        posDeltaUnit = vecMult(posDelta, 1 / posDeltaLen),
                        // Velocity of point relative to the ball.
                        velDelta = otherBall ? vecMinus(otherBall.velocity, ball.velocity) : vecMult(ball.velocity, -1),
                        // Velocity of point relative to the ball in direction away from the ball.
                        colVel = vecDot(velDelta, posDeltaUnit)
                    // Move ball outside of the collision distance.
                    positionDelta = vecMinus(positionDelta, vecMult(posDeltaUnit, colDist - posDeltaLen))
                    // Adjust velocity using ellastic collision formula.
                    if (colVel < 0) {
                        const ballMass = ball.density * ball.radius * ball.radius,
                            otherBallMass = otherBall ? otherBall.density * otherBall.radius * otherBall.radius : 1e9,
                            massRatio = otherBallMass / (ballMass + otherBallMass)
                        velocityDelta = vecAdd(velocityDelta,
                            vecMult(posDeltaUnit, colVel * (1 + borderBounce) * massRatio))
                    }
                }
            }
            deltas.push([ball, positionDelta, velocityDelta])
        }
        // Apply position and velocity deltas.
        for (let delta of deltas) {
            const ball = delta[0]
            ball.position = vecAdd(ball.position, delta[1])
            ball.velocity = vecAdd(ball.velocity, delta[2])
        }
    }

    function gatePos(i) {
        const height = gateHeight * Math.pow(gateScaleStep, players[i].powerLevel)
        return [gateBottom + gateHeight / 2 - height / 2, height]
    }

    /** Returns which gate contains the ball if any, left: -1, right: 1, none: 0*/
    function scoringGate(ball) {
        if (ball.position[0] < -ball.radius) return -1
        if (ball.position[0] > width + ball.radius) return 1
        return 0
    }

    /** Checks and handles scoring. */
    function scoreCheck() {
        if (state != "play") return
        const gate = scoringGate(ball)
        if (gate == 0) return
        gtag('event', 'level_end', { level_name: players[0].score + players[1].score })
        const playerId = (1 - gate) / 2, player = players[playerId]
        player.score += 1
        gtag("event", "level_up", { level: player.score, character: playerId });
        playSfx("score", { pan: gate })
        // Remove main ball from simulation.
        fd.solids.splice(0, 1)
        toScoreState()
    }

    /** Scales gate and weapons based on dir, resets power-up location. */
    function powerUp(player, dir) {
        players[player].newPowerLevel += dir
        players[player].powerUpDuration = powerUpDuration
        playSfx(dir > 0 ? "powerUp" : "powerDown", { pan: player == 0 ? -1 : 1 })
    }

    /** Smoothly updates player powerLevels.*/
    function powerUpUpdate(dt) {
        for (let player of players) {
            if (player.powerUpDuration > 0)
                player.powerUpDuration -= dt
            else
                player.newPowerLevel = 0
            if (player.powerLevel != player.newPowerLevel)
                player.powerLevel += Math.sign(player.newPowerLevel - player.powerLevel) * dt / powerUpTransition
        }
    }

    /** Checks and handles power ups. */
    function powerUpCheck() {
        const mainBall = ball
        for (let ball of fd.solids) {
            if (ball == mainBall) continue
            const gate = scoringGate(ball)
            if (gate == 0) continue
            powerUp((1 - gate) / 2, ball.text == "+" ? 1 : -1)
            // Rewpawn power up avoiding the main ball.
            do { ball.position = [width * Math.random(), height * Math.random()] }
            while (vecLen(vecMinus(ball.position, mainBall.position)) < mainBall.radius + ball.radius)
        }
    }


    /** Renders 2d elements. */
    function render() {
        ctx.clearRect(0, 0, width, height);
        drawBalls()
        if (state != "title") {
            drawWeapon(0)
            drawWeapon(1)
            drawGate()
        }
        ui.drawNotes()
    }

    var lastLogTime
    function logActivity() {
        // Rate limit to once per 10 sec.
        if (!lastLogTime || (new Date() - lastLogTime) > 10000) {
            gtag('event', 'play')
            lastLogTime = new Date()
        }
    }


    /** Single key press event handlers. */
    window.addEventListener("keydown", evt => {
        // Cycle renders sources.
        if (evt.key == "v") {
            const sources = ["dye", "velocity", "pressure", "divergence", "curl"]
            fd.renderSource = sources[(sources.indexOf(fd.renderSource) + 1) % sources.length]
            renderSourceNote.text = fd.renderSource
            ui.showNote(renderSourceNote)
            ui.hideNote(renderSourceNote)
            return
        }
        // Pause/unpause simulation.
        if (evt.key == "p") {
            fd.paused = !fd.paused
            return
        }
        // Show/hide ball.
        if (evt.key == "b") {
            ballsVisible = !ballsVisible
            return
        }

        if (evt.code == "KeyW") {
            ui.hideNote(instructionNotes[0])
        }

        if (evt.code == "ArrowUp") {
            ui.hideNote(instructionNotes[1])
        }

        if (evt.code == "KeyM") {
            nextMuteState(ui)
        }

        // Go to play state on any other key.
        if (state == "ready") {
            toPlayState()
        }

        logActivity()
    })

    // Initial game state.
    // toPlayState()
    toTitleState()
});

window.onerror = function myErrorHandler(event, url, line, pos) {
    gtag("event", "error", { "error": `${url} ${line}:${pos} ${event}` })
    return false;
}
