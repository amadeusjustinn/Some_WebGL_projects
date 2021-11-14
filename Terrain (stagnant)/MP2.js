/**
 * @file MP2.js - A simple WebGL rendering engine
 */

let angle = 0;

/** @global The WebGL context */
let gl;

/** @global The HTML5 canvas to draw on */
let canvas;

/** @global The GLSL shader program */
let shaderProgram;

/** @global An object holding the geometry for your 3D terrain */
let myTerrain;

/** @global The Model matrix */
let modelViewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
let projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
let normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
let kAmbient = [227 / 255, 191 / 255, 76 / 255];
/** @global Diffuse material color/intensity for Phong reflection */
let kDiffuse = [227 / 255, 191 / 255, 76 / 255];
/** @global Specular material color/intensity for Phong reflection */
let kSpecular = [1.0, 1.0, 1.0];
/** @global Shininess exponent for Phong reflection */
let shininess = 2;

// Light parameters
/** @global Light position in VIEW coordinates */
let lightPosition = [0, 2, 2];
/** @global Ambient light color/intensity for Phong reflection */
let ambientLightColor = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
let diffuseLightColor = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
let specularLightColor = [1, 1, 1];

/** @global Edge color for black wireframe */
let kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for white wireframe */
let kEdgeWhite = [0.7, 0.7, 0.7];

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


//-----------------------------------------------------------------------------
// Setup functions (run once)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
    // Set up the canvas with a WebGL context.
    canvas = document.getElementById("glCanvas");
    gl = createGLContext(canvas);

    // Compile and link the shader program.
    setupShaders();

    // Let the Terrain object set up its own buffers.
    myTerrain = new Terrain(50, -1, 1, -1, 1);
    myTerrain.setupBuffers(shaderProgram);

    // Set the background color to sky blue (you can change this if you like).
    gl.clearColor(0.82, 0.93, 0.99, 1.0);

    gl.enable(gl.DEPTH_TEST);
    requestAnimationFrame(animate);
}


/**
 * Creates a WebGL 2.0 context.
 * @param {element} canvas The HTML5 canvas to attach the context to.
 * @return {Object} The WebGL 2.0 context.
 */
function createGLContext(canvas) {
    let context = null;
    context = canvas.getContext("webgl2");
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}


/**
 * Loads a shader from the HTML document and compiles it.
 * @param {string} id ID string of the shader script to load.
 */
function loadShaderFromDOM(id) {
    let shaderScript = document.getElementById(id);

    // Return null if we don't find an element with the specified id
    if (!shaderScript) {
        return null;
    }

    let shaderSource = shaderScript.text;

    let shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}


/**
 * Sets up the vertex and fragment shaders.
 */
function setupShaders() {
    // Compile the shaders' source code.
    let vertexShader = loadShaderFromDOM("shader-vs");
    let fragmentShader = loadShaderFromDOM("shader-fs");

    // Link the shaders together into a program.
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    // We only need the one shader program for this rendering, so we can just
    // bind it as the current program here.
    gl.useProgram(shaderProgram);

    // Query the index of each attribute and uniform in the shader program.
    shaderProgram.locations = {};
    shaderProgram.locations.vertexPosition =
        gl.getAttribLocation(shaderProgram, "vertexPosition");
    shaderProgram.locations.vertexNormal =
        gl.getAttribLocation(shaderProgram, "vertexNormal");

    shaderProgram.locations.modelViewMatrix =
        gl.getUniformLocation(shaderProgram, "modelViewMatrix");
    shaderProgram.locations.projectionMatrix =
        gl.getUniformLocation(shaderProgram, "projectionMatrix");
    shaderProgram.locations.normalMatrix =
        gl.getUniformLocation(shaderProgram, "normalMatrix");

    shaderProgram.locations.kAmbient =
        gl.getUniformLocation(shaderProgram, "kAmbient");
    shaderProgram.locations.kDiffuse =
        gl.getUniformLocation(shaderProgram, "kDiffuse");
    shaderProgram.locations.kSpecular =
        gl.getUniformLocation(shaderProgram, "kSpecular");
    shaderProgram.locations.shininess =
        gl.getUniformLocation(shaderProgram, "shininess");

    shaderProgram.locations.lightPosition =
        gl.getUniformLocation(shaderProgram, "lightPosition");
    shaderProgram.locations.ambientLightColor =
        gl.getUniformLocation(shaderProgram, "ambientLightColor");
    shaderProgram.locations.diffuseLightColor =
        gl.getUniformLocation(shaderProgram, "diffuseLightColor");
    shaderProgram.locations.specularLightColor =
        gl.getUniformLocation(shaderProgram, "specularLightColor");

    shaderProgram.locations.maxZ = gl.getUniformLocation(shaderProgram, "maxZ");
    shaderProgram.locations.minZ = gl.getUniformLocation(shaderProgram, "minZ");
}

/**
 * Draws the terrain to the screen.
 */
function draw() {
    // Transform the clip coordinates so the render fills the canvas dimensions.
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the color buffer and the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Generate the projection matrix using perspective projection.
    let zoom = document.getElementById("zoom");
    const near = 0.1;
    const far = 200.0;
    glMatrix.mat4.perspective(projectionMatrix, degToRad(-zoom.value),
        gl.viewportWidth / gl.viewportHeight,
        near, far);

    // Generate the view matrix using lookat.
    const lookAtPt = glMatrix.vec3.fromValues(0.0, 1.25, -1.5);
    const eyePt = glMatrix.vec3.fromValues(0.0, -3, 2.5);
    const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
    glMatrix.mat4.lookAt(modelViewMatrix, eyePt, lookAtPt, up);

    // Handle translation of terrain
    let xValue = document.getElementById("x_value"), yValue = document.getElementById("y_value");
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix,
        glMatrix.vec3.fromValues(xValue.value, yValue.value, 0));

    // Handle direction of rotation of terrain from checkbox statuses
    let clockwise = document.getElementById("clockwise"), rotateSlider = document.getElementById("rotateSlider");
    clockwise.disabled = true;
    rotateSlider.disabled = true;
    if (document.getElementById("rotate").checked) {
        clockwise.disabled = false;
        if (clockwise.checked) angle -= 0.1;
        else angle += 0.1;
    } else {
        rotateSlider.disabled = false;
        angle = rotateSlider.value;
    }
    glMatrix.mat4.rotateZ(modelViewMatrix, modelViewMatrix, degToRad(angle));

    setMatrixUniforms();
    setLightUniforms(ambientLightColor, diffuseLightColor, specularLightColor,
        lightPosition);

    // Send highest and lowest z coordinates of vertices to vertex shader as uniform variables
    gl.uniform1f(shaderProgram.locations.maxZ, myTerrain.getMaxElevation());
    gl.uniform1f(shaderProgram.locations.minZ, myTerrain.getMinElevation());


    // Draw the triangles, the wireframe, or both, based on the render selection.
    if (document.getElementById("polygon").checked) {
        setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
        myTerrain.drawTriangles();
    }
    else if (document.getElementById("wirepoly").checked) {
        setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 1);
        myTerrain.drawTriangles();
        gl.disable(gl.POLYGON_OFFSET_FILL);
        setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
        myTerrain.drawEdges();
    }
    else if (document.getElementById("wireframe").checked) {
        setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
        myTerrain.drawEdges();
    }
}


/**
 * Sends the three matrix uniforms to the shader program.
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.locations.modelViewMatrix, false,
        modelViewMatrix);
    gl.uniformMatrix4fv(shaderProgram.locations.projectionMatrix, false,
        projectionMatrix);

    // We want to transform the normals by the inverse-transpose of the
    // Model/View matrix
    glMatrix.mat3.fromMat4(normalMatrix, modelViewMatrix);
    glMatrix.mat3.transpose(normalMatrix, normalMatrix);
    glMatrix.mat3.invert(normalMatrix, normalMatrix);

    gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false,
        normalMatrix);
}


/**
 * Sends material properties to the shader program.
 * @param {Float32Array} a Ambient material color.
 * @param {Float32Array} d Diffuse material color.
 * @param {Float32Array} s Specular material color.
 * @param {Float32} alpha shininess coefficient
 */
function setMaterialUniforms(a, d, s, alpha) {
    gl.uniform3fv(shaderProgram.locations.kAmbient, a);
    gl.uniform3fv(shaderProgram.locations.kDiffuse, d);
    gl.uniform3fv(shaderProgram.locations.kSpecular, s);
    gl.uniform1f(shaderProgram.locations.shininess, alpha);
}


/**
 * Sends light information to the shader program.
 * @param {Float32Array} a Ambient light color/intensity.
 * @param {Float32Array} d Diffuse light color/intensity.
 * @param {Float32Array} s Specular light color/intensity.
 * @param {Float32Array} loc The light position, in view coordinates.
 */
function setLightUniforms(a, d, s, loc) {
    gl.uniform3fv(shaderProgram.locations.ambientLightColor, a);
    gl.uniform3fv(shaderProgram.locations.diffuseLightColor, d);
    gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
    gl.uniform3fv(shaderProgram.locations.lightPosition, loc);
}

/**
 * Animates...allows user to change the geometry view between
 * wireframe, polgon, or both.
 */
function animate(currentTime) {
    // Draw the frame.
    draw();
    // Animate the next frame.
    requestAnimationFrame(animate);
}
