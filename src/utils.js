export function asyncFor(start, step, end, delay, callback, after) {
    if (step > 0 ? start >= end : start <= end) {
        if (after) after.apply(this)
        return
    }
    callback.apply(this, [start, end, ...Array.prototype.slice.call(arguments, 4)])
    setTimeout(() => asyncFor.apply(this, [start + step, ...Array.prototype.slice.call(arguments, 1)]), delay)
}

export function vecAdd(a, b) {
    return a.map((av, i) => av + b[i])
}

export function vecMinus(a, b) {
    return a.map((av, i) => av - b[i])
}

export function vecMult(vec, scalar) {
    return vec.map(v => v * scalar)
}

export function vecLen(vec) {
    return Math.sqrt(Math.pow(vec[0], 2) + Math.pow(vec[1], 2), 0.5)
}

export function vecDot(a, b) {
    return a.reduce((res, v, i) => res + v * b[i], 0)
}

export function vecProduct(a, b) {
    return a.map((v, i) => v * b[i])
}