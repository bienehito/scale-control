export default /*glsl*/ `
// Fragment shader to render gate glow.
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform vec2 anglePoint;
uniform vec2 distPoint; 
uniform vec3 amplitude;
uniform vec3 frequency;
uniform vec3 phase;
uniform vec3 base;
uniform float minAngle;
uniform float maxAngle;
uniform float minY;
uniform float maxY;
uniform vec3 color;

// Angle from a to b.
float angleBetween(vec2 a, vec2 b) {
    vec2 p = vec2(-a.y, a.x);
    return atan(dot(b, p), dot(b, a));
}

void main () {
    // Angle from distPoint to uVv looking from the anglePoint.
    float angle = angleBetween(distPoint-anglePoint,vUv-anglePoint);
    // Angle relative to the maxAngle: 0 at maxAngle, 1 at 0.
    float relAngle = 1.0 - abs(angle) / maxAngle;
    if (relAngle <= 0.0) {
        gl_FragColor = vec4(0);
        return;
    }
    // Wave function instaneneous amplitude.
    float amp = dot(amplitude * (cos(angle * frequency + phase) + base), vec3(1.0));
    // Reduce wave at edges.
    if (relAngle < 0.2) {
        amp = amp * relAngle / 0.2;
    }
    // Distance from uVv to distPoint
    float d = length(vUv - distPoint);
    // Transparency at distance d relative to the amp: 0 @ 0 -> 1 @ amp/2 -> 0 @ amp.
    float alpha = pow(max(0.0, 1.0 - pow(d / amp * 2.0 - 1.0, 2.0)), 2.0);
    // Transparency at distance d relative to the amp: 1 @ 0 -> 0 @ amp.
    // float alpha = max(0.0, 1.0 - d / amp );
    gl_FragColor = vec4(color, alpha);
}
`