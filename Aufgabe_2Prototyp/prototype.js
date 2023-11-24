////////////////////////////////////////////////////////////////////////////////
// START OF BOILERPLATE CODE ///////////////////////////////////////////////////

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

function onMouseDrag(callback)
{
    canvas.addEventListener('pointerdown', () =>
    {
        const stopDrag = () =>
        {
            canvas.removeEventListener("pointermove", callback)
            canvas.removeEventListener("pointerup", stopDrag)
            canvas.removeEventListener("pointerleave", stopDrag)
        }

        canvas.addEventListener('pointermove', callback)
        canvas.addEventListener("pointerup", stopDrag, { once: true })
        canvas.addEventListener("pointerleave", stopDrag, { once: true })
    })
}

function onMouseWheel(callback)
{
    canvas.addEventListener('wheel', callback)
}

function onClickKey(callback)
{
    document.addEventListener('keypress', callback)
}

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

import glance from './js/glance.js'

// BOILERPLATE END
////////////////////////////////////////////////////////////////////////////////

const {
    vec3,
    mat3,
    mat4,
} = glance


// =============================================================================
// Shader Code
// =============================================================================


const worldVertexShader = `#version 300 es
    precision highp float;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat3 u_normalMatrix;

    in vec3 a_pos;
    in vec3 a_normal;
    in vec2 a_texCoord;

    out vec3 f_worldPos;
    out vec3 f_normal;
    out vec2 f_texCoord;

    void main() {
        f_worldPos = vec3(u_modelMatrix * vec4(a_pos, 1.0));
        f_normal = u_normalMatrix * a_normal;
        f_texCoord = a_texCoord;
        gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_pos, 1.0);
    }
`


const worldFragmentShader = `#version 300 es
    precision mediump float;

    uniform float u_ambient;
    uniform float u_specular;
    uniform float u_shininess;
    uniform vec3 u_lightPos;
    uniform vec3 u_lightColor;
    uniform vec3 u_viewPos;
    uniform sampler2D u_texAmbient;
    uniform sampler2D u_texDiffuse;
    uniform sampler2D u_texSpecular;

    in vec3 f_worldPos;
    in vec3 f_normal;
    in vec2 f_texCoord;

    out vec4 FragColor;

    void main() {

        // texture
        vec3 texAmbient = texture(u_texAmbient, f_texCoord).rgb;
        vec3 texDiffuse = texture(u_texDiffuse, f_texCoord).rgb;
        vec3 texSpecular = texture(u_texSpecular, f_texCoord).rgb;

        // ambient
        vec3 ambient = max(vec3(u_ambient), texAmbient) * texDiffuse;

        // diffuse
        vec3 normal = normalize(f_normal);
        vec3 lightDir = normalize(u_lightPos - f_worldPos);
        float diffuseIntensity = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diffuseIntensity * u_lightColor * texDiffuse;

        // specular
        vec3 viewDir = normalize(u_viewPos - f_worldPos);
        vec3 halfWay = normalize(lightDir + viewDir);
        float specularIntensity = pow(max(dot(normal, halfWay), 0.0), u_shininess);
        vec3 specular = (u_specular * specularIntensity) * texSpecular * u_lightColor;

        // color
        FragColor = vec4(ambient + diffuse + specular, 1.0);
    }
`


const skyVertexShader = `#version 300 es
    precision highp float;

    uniform mat3 u_viewRotationMatrix;
    uniform mat4 u_projectionMatrix;

    in vec3 a_pos;

    out vec3 f_texCoord;

    void main() {
        // Use the local position of the vertex as texture coordinate.
        f_texCoord = a_pos;

        // By setting Z == W, we ensure that the vertex is projected onto the
        // far plane, which is exactly what we want for the background.
        vec4 ndcPos = u_projectionMatrix * inverse(mat4(u_viewRotationMatrix)) * vec4(a_pos, 1.0);
        gl_Position = ndcPos.xyww;
    }
`


const skyFragmentShader = `#version 300 es
    precision mediump float;

    uniform samplerCube u_skybox;

    in vec3 f_texCoord;

    out vec4 FragColor;

    void main() {
        // The fragment color is simply the color of the skybox at the given
        // texture coordinate (local coordinate) of the fragment on the cube.
        FragColor = texture(u_skybox, f_texCoord);
    }
`


// =============================================================================
// Data
// =============================================================================


const projectionMatrix = mat4.perspective(Math.PI / 4, 1, 0.1, 14)


// The world - Platform
const worldShader = glance.buildShaderProgram(gl, "world-shader", worldVertexShader, worldFragmentShader, {
    u_ambient: 0.1,
    u_specular: 0.6,
    u_shininess: 64,
    u_lightPos: [0, 0, 5],
    u_lightColor: [1, 1, 1],
    u_projectionMatrix: projectionMatrix,
    u_texAmbient: 0,
    u_texDiffuse: 1,
    u_texSpecular: 2,
})

const worldIBO = glance.createIndexBuffer(gl, glance.createCubeIndices())

const worldABO = glance.createAttributeBuffer(gl, "world-abo", glance.createCubeAttributes({
    size: [2.5, 0.2, 2.5]
}), {
    a_pos: { size: 3, type: gl.FLOAT },
    a_normal: { size: 3, type: gl.FLOAT },
    a_texCoord: { size: 2, type: gl.FLOAT },
})

const worldVAO = glance.createVAO(
    gl,
    "world-vao",
    worldIBO,
    glance.buildAttributeMap(worldShader, worldABO, ["a_pos", "a_normal", "a_texCoord"])
)
const worldTextureAmbient = glance.loadTexture(gl, "img/plywood_ao.jpg")
const worldTextureDiffuse = glance.loadTexture(gl, "img/plywood_diff.jpg")
const worldTextureSpecular = glance.loadTexture(gl, "img/plywood_diff.jpg")



// The world - Cube
const worldCubeIBO = glance.createIndexBuffer(gl, glance.createCubeIndices())

const worldCubeABO = glance.createAttributeBuffer(gl, "world-cube-abo", glance.createCubeAttributes({
    size: [1.0, 1.0, 1.0]
}), {
    a_pos: { size: 3, type: gl.FLOAT },
    a_normal: { size: 3, type: gl.FLOAT },
    a_texCoord: { size: 2, type: gl.FLOAT },
})

const worldCubeVAO = glance.createVAO(
    gl,
    "world-cube-vao",
    worldCubeIBO,
    glance.buildAttributeMap(worldShader, worldCubeABO, ["a_pos", "a_normal", "a_texCoord"])
)
const worldCubeTextureAmbient = glance.loadTexture(gl, "img/metal_plate_ambient.jpg")
const worldCubeTextureDiffuse = glance.loadTexture(gl, "img/metal_plate_diff.jpg")
const worldCubeTextureSpecular = glance.loadTexture(gl, "img/metal_plate_spec.jpg")

// The world - CubeAxle
const worldCubeAxleIBO = glance.createIndexBuffer(gl, glance.createCylinderIndices(32, 64))

const worldCubeAxleABO = glance.createAttributeBuffer(gl, "world-cubeaxle-abo", glance.createCylinderAttributes(0.04, 0.4, 32, 64),
{
    a_pos: { size: 3, type: gl.FLOAT },
    a_normal: { size: 3, type: gl.FLOAT },
    a_texCoord: { size: 2, type: gl.FLOAT },
})

const worldCubeAxleVAO = glance.createVAO(
    gl,
    "world-cubeaxle-vao",
    worldCubeAxleIBO,
    glance.buildAttributeMap(worldShader, worldCubeAxleABO, ["a_pos", "a_normal", "a_texCoord"])
)


// The world - Gear
const {attributes: gearAttr, indices: gearIdx} = await glance.loadObj("./obj/untitled.obj")

const worldGearIBO = glance.createIndexBuffer(gl, gearIdx)

const worldGearABO = glance.createAttributeBuffer(gl, "world-gear-abo", gearAttr, {
    a_pos: { size: 3, type: gl.FLOAT },
    a_texCoord: { size: 2, type: gl.FLOAT },
    a_normal: { size: 3, type: gl.FLOAT },
})

const worldGearVAO = glance.createVAO(
    gl,
    "world-gear-vao",
    worldGearIBO,
    glance.buildAttributeMap(worldShader, worldGearABO, ["a_pos", "a_normal", "a_texCoord"])
)
const worldGearTextureAmbient = glance.loadTexture(gl, "img/rust_coarse_ambient.jpg")
const worldGearTextureDiffuse = glance.loadTexture(gl, "img/rust_coarse_diff.jpg")
const worldGearTextureSpecular = glance.loadTexture(gl, "img/rust_coarse_diff.jpg")



// The skybox
const skyShader = glance.buildShaderProgram(gl, "sky-shader", skyVertexShader, skyFragmentShader, {
    u_projectionMatrix: projectionMatrix,
    u_skybox: 0,
})

const skyIBO = glance.createIndexBuffer(gl, glance.createSkyBoxIndices())

const skyABO = glance.createAttributeBuffer(gl, "sky-abo", glance.createSkyBoxAttributes(), {
    a_pos: { size: 3, type: gl.FLOAT },
})

const skyVAO = glance.createVAO(gl, "sky-vao", skyIBO, glance.buildAttributeMap(skyShader, skyABO, ["a_pos"]))

const [skyCubemap, skyCubeMapLoaded] = glance.loadCubemap(gl, "sky-texture", [
    "img/boilerroomRight.jpg",
    "img/boilerroomLeft.jpg",
    "img/boilerroomTop.jpg",
    "img/boilerroomBottom.jpg",
    "img/boilerroomFront.jpg",
    "img/boilerroomBack.jpg",
])


// =============================================================================
// Draw Calls
// =============================================================================


// Scene State
let viewDist = 4.5
let viewPan = 0
let pickUpGear = false
let gearPlaceRight = false
let gearPlaceLeft = false

const worldDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.fromTranslation([0, -0.75, 0]),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.fromTranslation([0, -0.75, 0])))),
        u_viewMatrix: () => mat4.invert(mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromRotation(viewPan, [0, 1, 0])),mat4.fromRotation(-(Math.PI/10), [1, 0, 0])), mat4.fromTranslation([0, 0, viewDist]))),
        u_viewPos: () => vec3.transformMat4(vec3.zero(), mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromRotation(viewPan, [0, 1, 0])),mat4.fromRotation(-(Math.PI/10), [1, 0, 0])), mat4.fromTranslation([0, 0, viewDist]))),
    },
    [
        // texture bindings
        [0, worldTextureAmbient],
        [1, worldTextureDiffuse],
        [2, worldTextureSpecular],
    ]
)

const worldCubeDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldCubeVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromRotation(Math.PI/4, [0, 1, 0])), mat4.fromTranslation([0, -0.15, 0])),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromRotation(Math.PI/4, [0, 1, 0])), mat4.fromTranslation([0, -0.15, 0])))))
    },
    [
        // texture bindings
        [0, worldCubeTextureAmbient],
        [1, worldCubeTextureDiffuse],
        [2, worldCubeTextureSpecular],
    ]
)

const worldCubeAxleRightDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldCubeAxleVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.multiply(mat4.identity(), mat4.fromTranslation([0.4, 0.4, 0])),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.identity(), mat4.fromTranslation([0.4, 0.4, 0])))))
    },
    [
        // texture bindings
        [0, worldCubeTextureAmbient],
        [1, worldCubeTextureDiffuse],
        [2, worldCubeTextureSpecular],
    ]
)

const worldCubeAxleLeftDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldCubeAxleVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.multiply(mat4.identity(), mat4.fromTranslation([-0.4, 0.4, 0])),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.identity(), mat4.fromTranslation([-0.4, 0.4, 0])))))
    },
    [
        // texture bindings
        [0, worldCubeTextureAmbient],
        [1, worldCubeTextureDiffuse],
        [2, worldCubeTextureSpecular],
    ]
)



//////////////////////// Gear Draw Calls ///////////////////////////////////

const worldGearTableDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldGearVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([1, -0.6, 1])), mat4.fromScaling([0.1, 0.1, 0.1])),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([1, -0.6, 1])), mat4.fromScaling([0.1, 0.1, 0.1])))))
    },
    [
        // texture bindings
        [0, worldGearTextureAmbient],
        [1, worldGearTextureDiffuse],
        [2, worldGearTextureSpecular],
    ]
)

const worldGearMouseDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldGearVAO,
    {
        // uniform update callbacks
        u_modelMatrix: () => mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([cursor[0], 0.8, 0])), mat4.fromScaling([0.1, 0.1, 0.1])),
        u_normalMatrix: () => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([cursor[0], 0.8, 0])), mat4.fromScaling([0.1, 0.1, 0.1])))))
    },
    [
        // texture bindings
        [0, worldGearTextureAmbient],
        [1, worldGearTextureDiffuse],
        [2, worldGearTextureSpecular],
    ]
)

const worldGearCubeLeftDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldGearVAO,
    {
        // uniform update callbacks
        u_modelMatrix: (time) => mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([-0.4, 0.45, 0])), mat4.fromRotation(time/1000, [0,1,0])), mat4.fromScaling([0.1, 0.1, 0.1])),
        u_normalMatrix: (time) => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([-0.4, 0.45, 0])), mat4.fromRotation(time/1000, [0,1,0])), mat4.fromScaling([0.1, 0.1, 0.1])))))
    },
    [
        // texture bindings
        [0, worldGearTextureAmbient],
        [1, worldGearTextureDiffuse],
        [2, worldGearTextureSpecular],
    ]
)

const worldGearCubeRightDrawCall = glance.createDrawCall(
    gl,
    worldShader,
    worldGearVAO,
    {
        // uniform update callbacks
        u_modelMatrix: (time) => mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([0.4, 0.45, 0])), mat4.fromRotation(time/1000, [0,1,0])), mat4.fromScaling([0.1, 0.1, 0.1])),
        u_normalMatrix: (time) => mat3.fromMat4(mat4.transpose(mat4.invert(mat4.multiply(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromTranslation([0.4, 0.45, 0])), mat4.fromRotation(time/1000, [0,1,0])), mat4.fromScaling([0.1, 0.1, 0.1])))))
    },
    [
        // texture bindings
        [0, worldGearTextureAmbient],
        [1, worldGearTextureDiffuse],
        [2, worldGearTextureSpecular],
    ]
)

///////////////////////////////////////////////////////////




const skyDrawCall = glance.createDrawCall(
    gl,
    skyShader,
    skyVAO,
    {
        // uniform update callbacks
        u_viewRotationMatrix: () => mat3.fromMat4(mat4.multiply(mat4.multiply(mat4.identity(), mat4.fromRotation(viewPan, [0, 1, 0])),mat4.fromRotation(-(Math.PI/10), [1, 0, 0]))),
    },
    [
        // texture bindings
        [0, skyCubemap],
    ],
    () => skyCubeMapLoaded.isComplete()
)


// =============================================================================
// System Integration
// =============================================================================

setRenderLoop((time) =>
{
    // One-time WebGL setup
    // gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    glance.performDrawCall(gl, worldDrawCall, time)
    glance.performDrawCall(gl, worldCubeDrawCall, time)
    glance.performDrawCall(gl, worldCubeAxleLeftDrawCall, time)
    glance.performDrawCall(gl, worldCubeAxleRightDrawCall, time)
    if (pickUpGear) {
        glance.performDrawCall(gl, worldGearMouseDrawCall, time)
    }
    else {
        if (gearPlaceRight) {
            glance.performDrawCall(gl, worldGearCubeRightDrawCall, time)
        }
        else if (gearPlaceLeft) {
            glance.performDrawCall(gl, worldGearCubeLeftDrawCall, time)
        }
        else {
            glance.performDrawCall(gl, worldGearTableDrawCall, time)
        }
    }
    glance.performDrawCall(gl, skyDrawCall, time)
})

onMouseDrag((e) =>
{
    viewPan += e.movementX * -.01
})

onMouseWheel((e) =>
{
    viewDist = Math.max(3.0, Math.min(10, viewDist * (1 + Math.sign(e.deltaY) * 0.2)))
})

onClickKey((e) =>
{
    if (e.key === "1" && !gearPlaceLeft && !gearPlaceRight) {
        pickUpGear = !pickUpGear
    }
    if (e.key === "Enter" && pickUpGear) {
        if (cursor[0] >= 0) {
            pickUpGear = false
            gearPlaceRight = true
        } 
        else if (cursor[0] < 0) {
            pickUpGear = false
            gearPlaceLeft = true
        }
    }
    if (e.key === "0") {
        pickUpGear = false
        gearPlaceRight = false
        gearPlaceLeft = false
    }
})