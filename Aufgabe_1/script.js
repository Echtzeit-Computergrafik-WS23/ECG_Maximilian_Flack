////////////////////////////////////////////////////////////////////////////////
// BOILERPLATE START

// Get the WebGL context
const canvas = document.getElementById('canvas')
const gl = canvas.getContext('webgl2')

// Add mouse move event handlers to the canvas to update the cursor[] array.
const cursor = [0, 0]
canvas.addEventListener('mousemove', (event) =>
{
    cursor[0] = (event.offsetX / canvas.width) * 2 - 1
    cursor[1] = (event.offsetY / canvas.height) * -2 + 1
})

// Basic render loop manager.
function setRenderLoop(callback)
{
    function renderLoop(time)
    {
        if (setRenderLoop._callback !== null) {
            setRenderLoop._callback(time)
            requestAnimationFrame(renderLoop)
        }
    }
    setRenderLoop._callback = callback
    requestAnimationFrame(renderLoop)
}
setRenderLoop._callback = null

// BOILERPLATE END
////////////////////////////////////////////////////////////////////////////////
// Shader //////////////////////////////////////////////////////////////////////

const vertexShaderSource = `#version 300 es
    precision highp float; // Calculate the varying outputs with high precision

    in vec2 a_pos;
    in vec3 a_color;

    out vec3 f_color;

    void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
        f_color = a_color;
    }
`

const fragmentShaderSource = `#version 300 es
    precision mediump float; // Fragment shader calculations require less precision.

    uniform float u_time;
    
    uniform vec2 u_cursor;

    in vec3 f_color;

    out vec4 FragColor;


    float random (in vec2 st) {
        return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
    }
    
    float noise (in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
    
        vec2 u = f * f * (3.0 - 2.0 * f);
    
        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    #define OCTAVES 6
    float fbm (in vec2 st) {
        float value = 0.0;
        float amplitude = .5;
        float frequency = 0.;
        for (int i = 0; i < OCTAVES; i++) {
            value += amplitude * noise(st);
            st *= 2.;
            amplitude *= .5;
        }
        return value;
    }

    float randomPattern(vec2 st, float time) {
        float scale = 100.0; // Skalierungsfaktor für die Mustergröße
        float speed = 50.0; // Geschwindigkeit der Bewegung
        vec2 p = st * scale;
        float pattern = sin(p.x + p.y + time * speed) * 0.5 + 0.5;
        return pattern;
    }
    
    float circle(in vec2 _st, in float _radius) {
        vec2 dist = _st + vec2(0.0, 2.8);

        float insideCircle = 1.0 - smoothstep(_radius - (_radius * 0.01),
                                            _radius + (_radius * 0.01),
                                            dot(dist, dist) * 4.0);

        float pattern = randomPattern(_st, u_time) * insideCircle;

        return insideCircle * pattern;
    }

    void main() {
        vec2 fragCoord = (gl_FragCoord.xy / 512.0) * 2.0 - vec2(1.0);

        vec2 delta = fragCoord - u_cursor;

        float dist = 0.05 / dot(delta, delta);


        vec2 q = vec2(0.);
        q.x = fbm( fragCoord + 0.00*u_time);
        q.y = fbm( fragCoord + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm( fragCoord + 1.0*q + vec2(1.7,9.2)+ 0.5*u_time );
        r.y = fbm( fragCoord + 1.0*q + vec2(8.3,2.8)+ 0.5*u_time);

        vec3 color = circle(fragCoord, 20.0) * vec3(sin(u_time), cos(u_time), 0.5);
        
        color += fbm(fragCoord+r);

        color += vec3(dist, dist, 0.2);

        FragColor = vec4(color, 1.0);
    }
`

// Create the Vertex Shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER)
gl.shaderSource(vertexShader, vertexShaderSource)
gl.compileShader(vertexShader)

// Create the Fragment Shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(fragmentShader, fragmentShaderSource)
gl.compileShader(fragmentShader)

// Link the two into a single Shader Program
const shaderProgram = gl.createProgram()
gl.attachShader(shaderProgram, vertexShader)
gl.attachShader(shaderProgram, fragmentShader)
gl.linkProgram(shaderProgram)
gl.useProgram(shaderProgram)

// Data ////////////////////////////////////////////////////////////////////////

const vertexPositions = new Float32Array([
    -1., -1., 1, 0, 0,
    +1., -1., 0, 1, 0,
    +1., +1., 0, 0, 1,
    -1., +1., 1, 1, 1,
])

// Create the position buffer
const positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
gl.bufferData(gl.ARRAY_BUFFER, vertexPositions, gl.STATIC_DRAW)

const faceIndices = new Uint16Array([
    0, 1, 2, // first triangle
    0, 2, 3, // second triangle
])

// Create the index buffer
const indexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, faceIndices, gl.STATIC_DRAW)

// Attribute Mapping ///////////////////////////////////////////////////////////

// Map the contents of the buffer to the vertex shader
const vertexAttribute = gl.getAttribLocation(shaderProgram, 'a_pos')
gl.enableVertexAttribArray(vertexAttribute)
gl.vertexAttribPointer(
    vertexAttribute,
    2,        // numComponents
    gl.FLOAT, // type
    false,    // normalize
    20,       // stride
    0         // offset
)

const colorAttribute = gl.getAttribLocation(shaderProgram, 'a_color')
gl.enableVertexAttribArray(colorAttribute)
gl.vertexAttribPointer(
    colorAttribute,
    3,        // numComponents
    gl.FLOAT, // type
    false,    // normalize
    20,       // stride
    8         // offset
)

// Uniforms ////////////////////////////////////////////////////////////////////

const timeUniform = gl.getUniformLocation(shaderProgram, "u_time")
const cursorUniform = gl.getUniformLocation(shaderProgram, "u_cursor")

// Rendering ///////////////////////////////////////////////////////////////////

function renderLoop(time)
{
    gl.uniform1f(timeUniform, time / 5000)
    gl.uniform2f(cursorUniform, cursor[0], cursor[1])

    // Draw the scene.
    gl.drawElements(
        gl.TRIANGLES,       // primitive type
        faceIndices.length, // vertex count
        gl.UNSIGNED_SHORT,  // type of indices
        0                   // offset
    )
}
setRenderLoop(renderLoop)