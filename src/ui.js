// UI text rendering.
export default function ui(ctx) {
    const notes = [],
        defaultFont = (w, h) => Math.floor(Math.min(w * 0.04, h * 0.08)) + "px Verdana"
    return {
        showNote: function (note) {
            note.transparency = 1
            notes.push(note)
        },
        hideNote: function (note) {
            note.transparency = Math.min(note.transparency, 0.99)
        },
        drawNotes: function () {
            const width = ctx.canvas.width, height = ctx.canvas.height
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i]
                ctx.font = note.font && note.font() || defaultFont(width, height)
                ctx.textAlign = note.align || "center"
                ctx.textBaseline = "alphabetic"
                const c = note.color || [255, 255, 255]
                ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${note.transparency})`
                const [x, y] = note.pos(width, height)
                ctx.fillText(note.text, x, y)
                if (note.lineWidth) {
                    ctx.lineWidth = note.lineWidth
                    const sc = note.strokeColor || [255, 255, 255]
                    ctx.strokeStyle = `rgba(${sc[0]}, ${sc[1]}, ${sc[2]}, ${note.transparency})`
                    ctx.strokeText(note.text, x, y)
                }
                if (note.transparency < 1) {
                    note.transparency -= 0.02
                    if (note.transparency <= 0) {
                        notes.splice(i, 1)
                        i--
                    }
                }
            }
        }
    }
}
