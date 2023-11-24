/**
 * @module glance/geo
 * @desc The geo module provides functions to load or create geometry.
 * @license MIT
 * @version 0.2
 */
export
{
    createCubeIndices, createCubeAttributes, createCylinderAttributes, createCylinderIndices,
    createSkyBoxAttributes, createSkyBoxIndices, createSphereAttributes, createSphereIndices,
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

/** 
 * Load and parse an OBJ file into a raw `ObjData` object.
 * For now, we only support OBJ files with a single object as exported by Blender,
 * with 3-D positions, 2-D UV coordiantes, normals and triangulated faces.
 * @param text The text contents of the OBJ file.
 * @returns A promise that resolves to the parsed OBJ data.
 */
function parseObj(text) {
   // Ignore comments, materials, groups, and smooth shading
   const ignoredLines = new Set(["#", "mtllib", "g", "usemtl", "s", ""]);
   // Parse the OBJ contents
   let name = undefined;
   const positions = [];
   const splitIndices = [];
   const normals = [];
   const texCoords = [];
   const lines = text.split("\n");
   for (const [index, line] of lines.entries()) {
       const tokens = line.split(" ");
       const type = tokens[0];
       if (ignoredLines.has(type)) {
           continue;
       }
       else if (type === "o") {
           if (name === undefined) {
               name = tokens[1];
           }
           else {
               throwError(() => `Multiple object names defined in OBJ file (on line ${index})`);
           }
       }
       else if (type === "v") {
           positions.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
       }
       else if (type === "vn") {
           normals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
       }
       else if (type === "vt") {
           texCoords.push(parseFloat(tokens[1]), parseFloat(tokens[2]));
       }
       else if (type === "f") {
           for (let i = 1; i <= 3; i++) {
               const face = tokens[i].split("/");
               splitIndices.push([
                   parseInt(face[0]) - 1,
                   parseInt(face[1]) - 1,
                   parseInt(face[2]) - 1, // normal
               ]);
           }
       }
       else {
           logWarning(() => `Unexpected OBJ token: '${type}' on line ${index}`);
       }
   }
   if (name === undefined) {
       throwError(() => "No object name defined in OBJ file");
   }
   return {
       name,
       positions,
       texCoords,
       normals,
       splitIndices,
   };
}
/**
* Takes a raw OBJ data object and creates an attribute, and index buffer from it.
* @param objData OBJ data to expand.
* @returns [Attributes, Indices]
*/
function expandObj(objData) {
   let positions = [];
   let texCoords = [];
   let normals = [];
   let indices = [];
   // Expand the raw OBJ data into arrays of vertex attributes and indices.
   let vertIdx = 0;
   const knownIndices = new Map();
   for (const splitIndex of objData.splitIndices) {
       const vertexKey = splitIndex.join("|");
       // Detect duplicate vertices
       const existingVertex = knownIndices.get(vertexKey);
       if (existingVertex !== undefined) {
           indices.push(existingVertex);
           continue;
       }
       const [posIdx, uvIdx, normIdx] = splitIndex;
       // Create a new vertex
       const positionIndex = posIdx * 3;
       positions.push(...objData.positions.slice(positionIndex, positionIndex + 3));
       const uvIndex = uvIdx * 2;
       texCoords.push(...objData.texCoords.slice(uvIndex, uvIndex + 2));
       const normalIndex = normIdx * 3;
       normals.push(...objData.normals.slice(normalIndex, normalIndex + 3));
       indices.push(vertIdx);
       knownIndices.set(vertexKey, vertIdx);
       vertIdx++;
   }
   // Interleave the vertex attributes.
   const attributes = interleaveArrays([positions, texCoords, normals], [3, 2, 3]);
   return [attributes, indices];
}
/**
* Load an OBJ file and return the vertex attributes and indices.
* The attributes are interleaved as [position(3), texcoord(2), normal(3)].
* @param path Location of the OBJ file.
* @returns [Attributes, Indices]
*/
async function loadObj(path) {
   // Load the OBJ file
   const response = await fetch(path);
   const text = await response.text();
   // Parse the OBJ file
   const objData = parseObj(text);
   // Expand the OBJ data
   const [attributes, indices] = expandObj(objData);
   return {
       name: objData.name,
       attributes,
       indices,
   };
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
