/**
 * @module glance/geo
 * @desc The geo module provides functions to load or create geometry.
 * @license MIT
 * @version 0.2
 */
export
{
    createCubeIndices, createCubeAttributes, createCylinderAttributes, createCylinderIndices,
    createSkyBoxAttributes, createSkyBoxIndices, createSphereAttributes, createSphereIndices, createTorusKnotAttributes, createTorusKnotIndices,
    // createFullscreenQuad,
    loadObj,
}
import { throwError, } from "./dev.js"
import { vec3, } from "./math.js"
// =============================================================================
// Module functions
// =============================================================================
// /** Creates a Box around the origin with the given options.
//  * @param size The size of the box, either as a single number or an array of three. Default: 1.0.
//  * @param uvScale The scale of the UV texture coordinates, either as a single number or an array of two. Default: 1.0.
//  * @returns The box entity.
//  */
function createCubeAttributes(
    { 
        size = 1.0,
        uvScale = 1.0,
    }
)
{
    if (typeof uvScale === "number") {
        uvScale = [uvScale, uvScale]
    }
    if (typeof size === "number") {
        size = [size, size, size]
    }
    const halfWidth = size[0] / 2.0;
    const halfHeight = size[1] / 2.0;
    const halfDepth = size[2] / 2.0;
    // Create an array of positions for the cube.
    const positions = [
        // Front face
        -halfWidth, -halfHeight, halfDepth,
        halfWidth, -halfHeight, halfDepth,
        halfWidth, halfHeight, halfDepth,
        -halfWidth, halfHeight, halfDepth,
        // Back face
        halfWidth, -halfHeight, -halfDepth,
        -halfWidth, -halfHeight, -halfDepth,
        -halfWidth, halfHeight, -halfDepth,
        halfWidth, halfHeight, -halfDepth,
        // Top face
        -halfWidth, halfHeight, halfDepth,
        halfWidth, halfHeight, halfDepth,
        halfWidth, halfHeight, -halfDepth,
        -halfWidth, halfHeight, -halfDepth,
        // Bottom face
        -halfWidth, -halfHeight, -halfDepth,
        halfWidth, -halfHeight, -halfDepth,
        halfWidth, -halfHeight, halfDepth,
        -halfWidth, -halfHeight, halfDepth,
        // Right face
        halfWidth, -halfHeight, halfDepth,
        halfWidth, -halfHeight, -halfDepth,
        halfWidth, halfHeight, -halfDepth,
        halfWidth, halfHeight, halfDepth,
        // Left face
        -halfWidth, -halfHeight, -halfDepth,
        -halfWidth, -halfHeight, halfDepth,
        -halfWidth, halfHeight, halfDepth,
        -halfWidth, halfHeight, -halfDepth,
    ]
    // The normals never change.
    const normals = [
        repeat([0, 0, 1], 4),   // front
        repeat([0, 0, -1], 4),  // back
        repeat([0, 1, 0], 4),   // top
        repeat([0, -1, 0], 4),  // bottom
        repeat([1, 0, 0], 4),   // right
        repeat([-1, 0, 0], 4),  // left
    ].flat()
    // .. neither do the UVs.
    const texCoords = repeat([
        0, uvScale[1],          // top left
        uvScale[0], uvScale[1], // top right
        uvScale[0], 0,          // bottom right
        0, 0,                   // bottom left
    ], 6)
    // Create the interleaved vertex array.
    const interleaved = [positions]
    const quantities = [3]
    let stride = 3
    let normalOffset = 3
    let texCoordOffset = 3
    interleaved.push(normals)
    quantities.push(3)
    stride += 3
    texCoordOffset += 3
    interleaved.push(texCoords)
    quantities.push(2)
    stride += 2
    stride *= Float32Array.BYTES_PER_ELEMENT
    normalOffset *= Float32Array.BYTES_PER_ELEMENT
    texCoordOffset *= Float32Array.BYTES_PER_ELEMENT
    return interleaveArrays(interleaved, quantities)
}

/**
 * Creates indices for a platform.
 */
function createCubeIndices()
{
    return [
        0, 1, 2, 0, 2, 3,       // front
        4, 5, 6, 4, 6, 7,       // back
        8, 9, 10, 8, 10, 11,    // top
        12, 13, 14, 12, 14, 15, // bottom
        16, 17, 18, 16, 18, 19, // right
        20, 21, 22, 20, 22, 23,
    ]
}


/**
 * Creates a cylinder around the origin with the given options.
 * @param radius The radius of the cylinder.
 * @param height The height of the cylinder.
 * @param radialSegments Number of bands around the cylinder.
 * @param heightSegments Number of vertical steps along the height.
 * @returns An array of interleaved vertex data.
 */
function createCylinderAttributes(radius, height, radialSegments, heightSegments) {
    const positions = [];
    const normals = [];
    const texCoords = [];

    // Create verts for the top
    for (let x = 0; x <= radialSegments; x++) {
        const theta = (x / radialSegments) * Math.PI * 2;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const u = x / radialSegments;

        const xPos = radius * sinTheta;
        const yPos = (0.5 * height)-0.002;
        const zPos = radius * cosTheta;

        const normal = [0, 1, 0];

        positions.push(xPos, yPos, zPos);
        normals.push(...normal);
        texCoords.push(u, 0);
    }

    // Create verts for the bottom
    for (let x = 0; x <= radialSegments; x++) {
        const theta = (x / radialSegments) * Math.PI * 2;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const u = x / radialSegments;

        const xPos = radius * sinTheta;
        const yPos = -0.5 * height;
        const zPos = radius * cosTheta;

        const normal = [0, -1, 0];

        positions.push(xPos, yPos, zPos);
        normals.push(...normal);
        texCoords.push(u, 1);
    }

    // Create verts for the mantel
    for (let y = 1; y < heightSegments; y++) {
        for (let x = 0; x <= radialSegments; x++) {
            const theta = (x / radialSegments) * Math.PI * 2;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            const u = x / radialSegments;
            const v = y / heightSegments;

            const xPos = radius * sinTheta;
            const yPos = (v - 0.5) * height;
            const zPos = radius * cosTheta;

            const normal = [sinTheta, 0, cosTheta];

            positions.push(xPos, yPos, zPos);
            normals.push(...normal);
            texCoords.push(u, v);
        }
    }

    const interleaved = [positions];
    const quantities = [3];
    interleaved.push(normals);
    quantities.push(3);
    interleaved.push(texCoords);
    quantities.push(2);

    return interleaveArrays(interleaved, quantities);
}

/**
 * Creates Indices for a cylinder.
 * @param radialSegments Number of bands around the cylinder.
 * @param heightSegments Number of vertical steps along the height.
 * @returns The indices of the cylinder
 */
function createCylinderIndices(radialSegments, heightSegments) {
    const buffer = [];
    for (let x = 0; x < radialSegments; x++) {
        buffer.push(x, x + 1, radialSegments);
    }
    const baseIndex = radialSegments + 1;
    for (let x = 0; x < radialSegments; x++) {
        buffer.push(baseIndex + x, baseIndex + x + 1, baseIndex + radialSegments);
    }
    for (let y = 1; y < heightSegments; y++) {
        for (let x = 0; x < radialSegments; x++) {
            const first = baseIndex + (y - 1) * (radialSegments + 1) + x;
            const second = first + radialSegments + 1;

            buffer.push(first, first + 1, second);
            buffer.push(second, first + 1, second + 1);
        }
    }

    return buffer;
}


/**
 * Creates a skybox of unit size around the origin with shared vertices.
 */
function createSkyBoxAttributes()
{
    return [
        -1, -1, -1,
        +1, -1, -1,
        +1, +1, -1,
        -1, +1, -1,
        -1, -1, +1,
        +1, -1, +1,
        +1, +1, +1,
        -1, +1, +1, // 7
    ]
}
/**
 * Creates indices for a skybox.
 */
function createSkyBoxIndices()
{
    return [
        4, 5, 6, 4, 6, 7,
        1, 0, 3, 1, 3, 2,
        7, 6, 2, 7, 2, 3,
        0, 1, 5, 0, 5, 4,
        5, 1, 2, 5, 2, 6,
        0, 4, 7, 0, 7, 3, // left
    ]
}
/** Creates a sphere around the origin with the given options.
 * @param radius The radius of the sphere.
 * @param latitudeBands The number of bands around the sphere from top to bottom.
 * @param longitudeBands The number of bands around the sphere from left to right.
 * @param options Options to control which vertex attributes to create.
 * @returns An array of interleaved vertex data.
 */
function createSphereAttributes(radius, latitudeBands, longitudeBands, options = {})
{
    // Create values for all arrays of the sphere.
    // They are easier to create and then discard if unused.
    const positions = []
    const normals = []
    const texCoords = []
    for (let lat = 0; lat <= latitudeBands; lat++) {
        const theta = lat * Math.PI / latitudeBands
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        for (let lon = 0; lon <= longitudeBands; lon++) {
            const phi = lon * 2 * Math.PI / longitudeBands
            const x = Math.cos(phi) * sinTheta
            const y = cosTheta
            const z = Math.sin(phi) * sinTheta
            const u = 1. - (lon / longitudeBands)
            const v = lat / latitudeBands
            positions.push(radius * x, radius * y, radius * z)
            normals.push(x, y, z)
            texCoords.push(u, v)
        }
    }
    // Create the interleaved vertex array.
    const interleaved = [positions]
    const quantities = [3]
    if (options.normals ?? true) {
        interleaved.push(normals)
        quantities.push(3)
    }
    if (options.uvs ?? true) {
        interleaved.push(texCoords)
        quantities.push(2)
    }
    return interleaveArrays(interleaved, quantities)
}
/**
 * Create indices for a sphere with the given options.
 * @param latitudeBands The number of bands around the sphere from top to bottom.
 * @param longitudeBands The number of bands around the sphere from left to right.
 * @returns The indices of the sphere.
 */
function createSphereIndices(latitudeBands, longitudeBands)
{
    const buffer = []
    for (let lat = 0; lat < latitudeBands; lat++) {
        for (let lon = 0; lon < longitudeBands; lon++) {
            const first = lat * (longitudeBands + 1) + lon
            const second = first + longitudeBands + 1
            buffer.push(first, first + 1, second)
            buffer.push(second, first + 1, second + 1)
        }
    }
    return buffer
}
// TODO: enable/disable attributes for torus knot
function createTorusKnotAttributes(radius = 1, tube = 0.4, tubularSegments = 64, radialSegments = 8, p = 2, q = 3)
{
    // Ensure segments are integers.
    tubularSegments = Math.floor(tubularSegments)
    radialSegments = Math.floor(radialSegments)
    // buffers
    const buffer = []
    // This function calculates the current position on the torus curve.
    const calculatePositionOnCurve = (u, p, q, radius, position) =>
    {
        const cu = Math.cos(u)
        const su = Math.sin(u)
        const quOverP = q / p * u
        const cs = Math.cos(quOverP)
        position[0] = radius * (2 + cs) * 0.5 * cu
        position[1] = radius * (2 + cs) * su * 0.5
        position[2] = radius * Math.sin(quOverP) * 0.5
    }
    // helper variables
    const vertex = vec3.zero()
    const P1 = vec3.zero()
    let B = vec3.zero()
    let T = vec3.zero()
    let N = vec3.zero()
    // generate vertices, normals and uvs
    for (let i = 0; i <= tubularSegments; ++i) {
        // the radian "u" is used to calculate the position on the torus curve of the current tubular segment
        const u = i / tubularSegments * p * Math.PI * 2
        // now we calculate two points. P1 is our current position on the curve, P2 is a little farther ahead.
        // these points are used to create a special "coordinate space", which is necessary to calculate the correct vertex positions
        calculatePositionOnCurve(u, p, q, radius, P1)
        calculatePositionOnCurve(u + 0.01, p, q, radius, N)
        // calculate orthonormal basis
        vec3.subtract(vec3.copy(T, N), P1)
        vec3.cross(vec3.copy(B, T), N)
        vec3.cross(vec3.copy(N, B), T)
        // normalize B and N. T can be ignored, we don't use it
        vec3.normalize(B)
        vec3.normalize(N)
        for (let j = 0; j <= radialSegments; ++j) {
            // now calculate the vertices. they are nothing more than an extrusion of the torus curve.
            // because we extrude a shape in the xy-plane, there is no need to calculate a z-value.
            const v = j / radialSegments * Math.PI * 2
            const cx = -tube * Math.cos(v)
            const cy = tube * Math.sin(v)
            // now calculate the final vertex position.
            // first we orient the extrusion with our basis vectors, then we add it to the current position on the curve
            vertex[0] = P1[0] + (cx * N[0] + cy * B[0])
            vertex[1] = P1[1] + (cx * N[1] + cy * B[1])
            vertex[2] = P1[2] + (cx * N[2] + cy * B[2])
            buffer.push(vertex[0], vertex[1], vertex[2])
            // normal (P1 is always the center/origin of the extrusion, thus we can use it to calculate the normal)
            vec3.subtract(vertex, P1)
            vec3.normalize(vertex)
            buffer.push(vertex[0], vertex[1], vertex[2])
            // uv
            buffer.push(i / tubularSegments)
            buffer.push(j / radialSegments)
        }
    }
    return buffer
}
function createTorusKnotIndices(tubularSegments = 64, radialSegments = 8)
{
    const indices = []
    for (let tubeIdx = 1; tubeIdx <= tubularSegments; tubeIdx++) {
        for (let radIdx = 1; radIdx <= radialSegments; radIdx++) {
            const a = (radialSegments + 1) * (tubeIdx - 1) + (radIdx - 1)
            const b = (radialSegments + 1) * tubeIdx + (radIdx - 1)
            const c = (radialSegments + 1) * tubeIdx + radIdx
            const d = (radialSegments + 1) * (tubeIdx - 1) + radIdx
            indices.push(a, b, d, b, c, d)
        }
    }
    return indices
}
// /** Creates a fullscreen quad with the given options.
//  * @param gl The WebGL context.
//  * @param name The name of the fullscreen entity.
//  * @param shader The shader program to use for rendering.
//  * @param uniforms Uniform values of this entity to override the shader's defaults. Default: empty.
//  * @param positionAttribute The name of the position attribute. Default: "aPosition".
//  * @param texCoordAttribute The name of the texture coordinate attribute. Default: "aTexCoord".
//  * @returns The fullscreen entity.
//  */
// function createFullscreenQuad(
//     { gl, name, shaders,
//         uniforms = {},
//         positionAttribute = "aPosition",
//         texCoordAttribute = "aTexCoord",
//         // TODO: UV options and an option to produce a screen quad of a different size (a UI panel, for example)
//     }: {
//         gl: WebGL2,
//         name: string,
//         shaders: Shader | Shader[],
//         uniforms?: {
//             [name: string]: UniformValue,
//         },
//         positionAttribute?: string,
//         texCoordAttribute?: string,
//     }
// ): Entity
// {
//     // Position and texture coordinates for a quad that fills the entire screen
//     // in Normalized Device Coordinates.
//     const vertices = [
//         // 3x positions + 2x texCoords
//         -1, 1, 0, 0, 1,
//         -1, -1, 0, 0, 0,
//         1, -1, 0, 1, 0,
//         1, 1, 0, 1, 1,
//     ]
//     // From experience, we know that the fullscreen quad requires vertex positions
//     // and texture coordinates, so we always create buffers for them.
//     const vertexBuffers: { [attribute: string]: AttributeBuffer } = {}
//     const data: Float32Array = new Float32Array(vertices)
//     vertexBuffers[positionAttribute] = createAttributeBuffer({
//         gl,
//         data,
//         numComponents: 3,
//         stride: 5 * Float32Array.BYTES_PER_ELEMENT,
//     })
//     vertexBuffers[texCoordAttribute] = createAttributeBuffer({
//         gl,
//         data,
//         numComponents: 2,
//         stride: 5 * Float32Array.BYTES_PER_ELEMENT,
//         offset: 3 * Float32Array.BYTES_PER_ELEMENT,
//     })
//     // Create the index buffer.
//     const indices: number[] = [
//         0, 1, 2,
//         0, 2, 3
//     ]
//     const indexBuffer: IndexBuffer = createIndexBuffer({ gl, indices })
//     // Create the fullscreen quad entity.
//     return createEntity({ gl, name, vertexBuffers, indexBuffer, shaders, uniforms })
// }
// /** Loads an obj file and returns an entity. */
async function loadObj(
    { gl, path, shaders,
        uniforms = {},
        name = undefined,
        positionAttribute = "aPosition",
        normalAttribute = undefined,
        texCoordAttribute = undefined,
    })
{
    // Load the OBJ file
    const obj = await parseObj(path)
    let positions = []
    let indices = []
    let normals = []
    let texCoords = []
    { // Expand the compressed OBJ geometry
        let index = 0
        const knownIndices = new Map()
        for (const multiIndex of obj.multiIndices) {
            const key = multiIndex.join(",")
            if (key in knownIndices) {
                // Re-use existing vertices
                indices.push(knownIndices.get(key))
            }
            else {
                // Create a new vertex
                const positionIndex = multiIndex[0] * 3
                positions.push(...obj.positions.slice(positionIndex, positionIndex + 3))
                const uvIndex = multiIndex[1] * 2
                texCoords.push(...obj.texCoords.slice(uvIndex, uvIndex + 2))
                const normalIndex = multiIndex[2] * 3
                normals.push(...obj.normals.slice(normalIndex, normalIndex + 3))
                indices.push(index)
                knownIndices.set(key, index)
                index++
            }
        }
    }
    // Define the name
    if (!name) {
        name = obj.name
    }
    logInfo(() => `Loaded OBJ '${name}' with ${positions.length / 3} vertices.`)
    // Create the interleaved vertex array.
    const interleaved = [positions]
    const quantities = [3]
    let stride = 3
    let normalOffset = 3
    let texCoordOffset = 3
    if (normalAttribute) {
        interleaved.push(normals)
        quantities.push(3)
        stride += 3
        texCoordOffset += 3
    }
    if (texCoordAttribute) {
        interleaved.push(texCoords)
        quantities.push(2)
        stride += 2
    }
    stride *= Float32Array.BYTES_PER_ELEMENT
    normalOffset *= Float32Array.BYTES_PER_ELEMENT
    texCoordOffset *= Float32Array.BYTES_PER_ELEMENT
    const vertexArray = interleaveArrays(interleaved, quantities)
    const data = new Float32Array(vertexArray)
    // TODO: the block above and below appear a lot - factor them out?
    // Create the vertex buffers.
    const vertexBuffers = {}
    vertexBuffers[positionAttribute] = createAttributeBuffer({
        gl, data,
        numComponents: 3,
        stride,
        offset: 0,
    })
    if (normalAttribute) {
        vertexBuffers[normalAttribute] = createAttributeBuffer({
            gl, data,
            numComponents: 3,
            stride,
            offset: normalOffset,
            glBuffer: vertexBuffers[positionAttribute].glBuffer,
        })
    }
    if (texCoordAttribute) {
        vertexBuffers[texCoordAttribute] = createAttributeBuffer({
            gl, data,
            numComponents: 2,
            stride,
            offset: texCoordOffset,
            glBuffer: vertexBuffers[positionAttribute].glBuffer,
        })
    }
    // Create the index buffer.
    const indexBuffer = createIndexBuffer({ gl, indices })
    // Create the entity
    return createEntity({
        gl,
        name,
        vertexBuffers,
        indexBuffer,
        shaders,
        uniforms,
    })
}
// // =============================================================================
// // Private Types
// // =============================================================================
// /** Information loaded from an OBJ file.
//  * For now, we only support OBJ files with a single object as exported by Blender,
//  * with UVs and normals and triangulated faces.
//  */
// type ObjData = {
//     /** Name of the object */
//     name: string
//     /** 3D vertex positions */
//     positions: number[]
//     /** Face indices */
//     multiIndices: [number, number, number][]
//     /** 3D vertex normals */
//     normals: number[]
//     /** 2D texture coordinates */
//     texCoords: number[]
// }
// // =============================================================================
// // Private Functions
// // =============================================================================
/** Creates a new array with the given pattern repeated the given number of times. */
function repeat(pattern, times)
{
    return Array.from({ length: times }, () => pattern).flat()
}
/** Interleave the given arrays, taking a number of elements (quantity) from each array in turn.
 * @param arrays An array of arrays to interleave.
 * @param quantities Either an array of quantities to take from each array,
 * or a single quantity to take from each array. Defaults to 1.
 * @returns A new array with the interleaved values.
 */
function interleaveArrays(arrays, quantities = 1)
{
    // Ensure that all arrays are the same size.
    if (arrays.length === 0) {
        return []
    }
    // If there is only one array, return it.
    if (arrays.length === 1) {
        return arrays[0]
    }
    // Ensure that quantities is an array of the correct size.
    if (!Array.isArray(quantities)) {
        quantities = repeat([quantities], arrays.length)
    }
    else if (quantities.length !== arrays.length) {
        throwError(() => `'quantities' must be either a number or an array with the same length as 'arrays'.\n` +
            `    'quantities' length: ${quantities.length}\n` +
            `    'arrays' length: ${arrays.length}`)
    }
    // Ensure that the every quantity is valid.
    const bandCount = arrays[0].length / quantities[0]
    for (let i = 0; i < arrays.length; i++) {
        const quantity = quantities[i]
        if (quantity < 1) {
            throwError(() => `'quantity' must be greater than 0, but the value at index ${i} is ${quantity}`)
        }
        if (quantity % 1 !== 0) {
            throwError(() => `'quantity' must be an integer, but the value at index ${i} is ${quantity}`)
        }
        if (arrays[i].length % quantity !== 0) {
            throwError(() => `The length of the corresponding array must be a multiple of 'quantity'\n` +
                `    but the quantity at index ${i} is ${quantity}\n` +
                `    whereas the length of the corresponding array is ${arrays[i].length}`)
        }
        if (arrays[i].length / quantity !== bandCount) {
            throwError(() => `All arrays must have the same number of quantities,\n` +
                `    but array ${i} of size ${arrays[i].length} contains ${arrays[i].length / quantity} times ${quantity} quantities,\n` +
                `    whereas the first array conttains ${arrays[0].length / quantity} times ${quantities[0]} quantities.`)
        }
    }
    // Interleave the arrays.
    const interleaved = []
    for (let band = 0; band < bandCount; band++) {
        for (let arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
            const array = arrays[arrayIndex]
            const quantity = quantities[arrayIndex]
            interleaved.push(...array.slice(band * quantity, (band + 1) * quantity))
        }
    }
    return interleaved
}
// /** Load and parse an OBJ file into a `CompressedObjGeometry` format.
//  * @param path The path to the OBJ file.
//  * @returns A promise that resolves to the parsed OBJ data.
//  */
async function parseObj(path)
{
    // Load the OBJ file
    const response = await fetch(path)
    const text = await response.text()
    // Ignore comments, materials, groups, and smooth shading
    const ignoredLines= new Set(["#", "mtllib", "g", "usemtl", "s", ""])
    // Parse the OBJ contents
    let name = undefined
    const positions= []
    const multiIndices = []
    const normals = []
    const uvs = []
    const lines = text.split("\n")
    for (const [index, line] of lines.entries()) {
        const tokens = line.split(" ")
        const type = tokens[0]
        if (ignoredLines.has(type)) {
            continue
        }
        else if (type === "o") {
            if (name === undefined) {
                name = tokens[1]
            }
            else {
                throwError(() => `Multiple object names defined in OBJ file (on line ${index})`)
            }
        }
        else if (type === "v") {
            positions.push(
                parseFloat(tokens[1]),
                parseFloat(tokens[2]),
                parseFloat(tokens[3]),
            )
        }
        else if (type === "vn") {
            normals.push(
                parseFloat(tokens[1]),
                parseFloat(tokens[2]),
                parseFloat(tokens[3]),
            )
        }
        else if (type === "vt") {
            uvs.push(
                parseFloat(tokens[1]),
                parseFloat(tokens[2]),
            )
        }
        else if (type === "f") {
            // Face indices contain the vertex ID, UV ID, and normal ID
            for (let i = 1; i <= 3; i++) {
                const face = tokens[i].split("/")
                multiIndices.push([
                    parseInt(face[0]) - 1,
                    parseInt(face[1]) - 1,
                    parseInt(face[2]) - 1,
                ])
            }
        }
        else if (type === "s") {
            // Ignore smooth shading
            continue
        }
        else {
            logWarning(() => `Unexpected OBJ token: '${type}' on line ${index}`)
        }
    }
    if (name === undefined) {
        throwError(() => "No object name defined in OBJ file")
    }
    return {
        name,
        positions,
        multiIndices,
        normals,
        texCoords: uvs,
    }
}
