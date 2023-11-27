import { asyncFor } from "./utils.js"

const
    musicVolume = 0.15,
    sfxVolume = 0.2,
    trackList = [
        "Dolphin-esque - Godmode.mp3",
        "Drown Me Out - VYEN.mp3",
        "Fugitive Kind - Devon Church.mp3",
        "Lost and Found - Jeremy Blake.mp3",
        "Pixelated Autumn Leaves - Jeremy Blake.mp3",
        "Through The Crystal - Jeremy Blake.mp3"
    ],
    musicEl = new Audio(),
    muteStates = [ // [label, musicMuted, sfxMuted]
        ["all sounds", false, false],
        ["sfx only", true, false],
        ["music only", false, true],
        ["no sounds", true, true]],
    muteNote = {
        pos: (w, h) => [w / 2, h * 0.8],
        color: [255, 255, 0],
    }

var
    audioCtx,
    currentTrack = Math.floor(Math.random() * trackList.length),
    muteState = 0

// Starting audio context is only allowed after user has interacted with the page.
document.addEventListener("keydown", setup)
document.addEventListener("click", setup)
function setup() {
    document.removeEventListener("keydown", setup)
    document.removeEventListener("click", setup)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)
    musicEl.volume = musicVolume
    musicEl.addEventListener("ended", nextTrack)
}

export function nextMuteState(ui) {
    muteState = (muteState + 1) % muteStates.length
    pauseMusic()
    playMusic()
    muteNote.text = muteStates[muteState][0]
    ui.showNote(muteNote)
    ui.hideNote(muteNote)
}

export function nextTrack() {
    currentTrack = (currentTrack + 1) % trackList.length
    playMusic()
}

export function pauseMusic() {
    musicEl.pause()
}

export function playMusic() {
    if (!audioCtx) return
    if (muteStates[muteState][1]) return
    const src = `audio/music/${trackList[currentTrack]}`
    if (!musicEl.src.endsWith(encodeURI(src))) {
        musicEl.src = src
        console.log("Playing", trackList[currentTrack])
    }
    musicEl.play()
}

const soundEffects = {
    score: { src: "Ship Bell.mp3" },
    shoot: { src: "Water Leak.mp3", loop: true, gain: 0.9, },
    ballScale: { src: "440Hz beep.mp3" },
    powerUp: { src: "Bubble up.mp3" },
    powerDown: { src: "Bubble down.mp3" },
}

/** Plays sfx. */
export function playSfx(name, opt) {
    sfx(name, opt).start()
}

/** Creates a playable sfx object. */
export function sfx(name, opt) {
    opt = Object.assign({ pan: 0, gain: 1, rate: 1 }, opt)
    const soundEffect = soundEffects[name]
    const calcGain = (val) => sfxVolume * (soundEffect.gain || 1) * val
    var started = false, source, gainNode, gain = calcGain(opt.gain)
    return {
        /** Starts sfx playback.*/
        start: async () => {
            if (muteStates[muteState][2]) return
            if (!audioCtx) return
            if (started) return
            started = true
            if (!soundEffect.buffer) {
                const response = await fetch(`audio/sfx/${soundEffect.src}`)
                soundEffect.buffer = await audioCtx.decodeAudioData(await response.arrayBuffer())
            }
            source = audioCtx.createBufferSource()
            source.buffer = soundEffect.buffer
            source.playbackRate.value = opt.rate
            if (soundEffect.loop) source.loop = true
            gainNode = audioCtx.createGain()
            gainNode.gain.value = gain
            var track = source.connect(gainNode)
            if (opt.pan != 0) {
                const panner = audioCtx.createStereoPanner()
                panner.pan.value = opt.pan
                track = track.connect(panner)
            }
            track.connect(audioCtx.destination);
            source.start()
        },
        /** Stops sfx, optionally over fade seconds. */
        stop: (fade) => {
            if (!started || !source) return
            started = false
            const oldSource = source, oldGainNode = gainNode, oldVol = gainNode.gain.value
            asyncFor(fade, -0.1, 0, 100, // Iterate from fade to 0 every 100ms.
                (timeLeft) => oldGainNode.gain.value = oldVol * timeLeft / fade,
                () => oldSource.stop()
            )
        },
        set gain(val) {
            gain = calcGain(val)
            if (gainNode) gainNode.gain.value = gain
        },
    }
}
