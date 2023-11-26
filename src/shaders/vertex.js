export default /*glsl*/ `
// Base vertex shader:
// - Translates vec2 vertex coordinates to vec4.
precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`