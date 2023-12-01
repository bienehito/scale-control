export default /*glsl*/ `
// Fragment shader to render gate rays.
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform float time;
uniform vec2 leftGatePos; // Gate [bottom, height].
uniform vec2 rightGatePos;
uniform float leftAlpha;  // Global ray alpha.
uniform float rightAlpha;
uniform vec3 leftColor; // Ray color.
uniform vec3 rightColor;

float rayStrength(vec2 point, float time, vec2 raySource, float freq1, float freq2, float speed, float maxRayLength, vec2 gatePos) {
    vec2 ray = point - raySource;
    // Rays can pass only through the gate.
    float rayGateY = point.y - point.x * ray.y / ray.x;
    if (rayGateY < gatePos[0] || rayGateY > gatePos[0]+gatePos[1]) return 0.0;
    // Use cosine of ray angle to vertical as an approximation of ray angle to horizontal.
	float cosAngle = dot(normalize(ray), vec2(0, 1));
    return pow(
        // Combine two sin waves in ranges (0.1-0.7) + (0.1-0.3) = range (0.2-1.0)
        ((0.4 + 0.3 * sin(cosAngle * freq1 + time * speed)) +
        (0.2 + 0.1 * cos(-cosAngle * freq2 + time * speed)))
        * clamp(1.0 - point.x / maxRayLength, 0.0, 1.0)
    , 1.5); // Apply gamma.
}

void main () {
    float maxRayLength = 0.5;
    float gateMin = 0.6;
    float gateMax = 0.8;
    float raySourceY = (gateMin + gateMax) / 2.0;
    vec2 point;
    vec2 gatePos;
    float sideTime; // Side specific time.
    float alpha;
    vec3 color;
    if (vUv.x < 0.5){
        point = vUv;
        gatePos = leftGatePos;
        sideTime = time;
        alpha = leftAlpha;
        color = leftColor;
    } else {
        point = vec2(1.0 - vUv.x, vUv.y);
        gatePos = rightGatePos;
        sideTime = time + 10.0; 
        alpha = rightAlpha;
        color = rightColor;
    }
    // Combine two rays for a better effect.
    float ray1 = rayStrength(point, sideTime, vec2(-0.5, raySourceY), 57.8, 35.1, 1.0, maxRayLength, gatePos);
    float ray2 = rayStrength(point, sideTime, vec2(-0.55, raySourceY), 46.2, 22.2, 1.11, maxRayLength, gatePos);
    gl_FragColor = vec4(color, ray1 * 0.6 + ray2 * 0.4);
    // Attenuate brightness towards the bottom, simulating light-loss due to depth.
	// Give the whole thing a blue-green tinge as well.
	float brightness = 1.0 - point.x * 2.0;
	gl_FragColor.r *= 0.1 + (brightness * 0.8);
	gl_FragColor.g *= 0.3 + (brightness * 0.6);
	gl_FragColor.b *= 0.5 + (brightness * 0.5);
    gl_FragColor.a *= alpha;
}
`