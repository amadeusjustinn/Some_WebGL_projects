/**
 * @file MP5.js - A simple WebGL rendering engine
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D model */
var sphere1;
/** @global The current number of rendered spheres */
let sphereCount = 3;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Model matrix */
var viewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global An array that stores all randomised R (red) values for the spheres' colours */
let colourR = [];
/** @global An array that stores all randomised G (green) values for the spheres' colours */
let colourG = [];
/** @global An array that stores all randomised B (blue) values for the spheres' colours */
let colourB = [];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

/** @global Ambient light color */
const lAmbient = [0.4, 0.4, 0.4];
/** @global Diffuse light color */
const lDiffuse = [1.0, 1.0, 1.0];
/** @global Specular  light color */
const lSpecular = [1.0, 1.0, 1.0];

/** @global Placeholder for most recent Unix time */
let currTime = Date.now();
/** @global Gravitational acceleration of Earth (at sea level) in meters per second squared */
const g_Earth = -9.80665;

/** @global Dictionary with keyboard keys as keys and their pressed status as values */
let keysPressed = {};
/** @global An array that contains the only keyboard keys that would affect the program */
const possibleKeysPressed = ["r", "=", "-"];

/** @global Current acceleration factor */
let currAccel;
/** @global Current bounce factor */
let currBounce;
/** @global Current drag coefficient*/
let currDrag;

/** @global An array that stores all randomised radii of the spheres */
let scale = [];
/** @global An array that stores all randomised starting XYZ-coordinates of the spheres */
let translate = [];
/** @global An array that stores all randomised initial velocities of the spheres */
let velocity = [];

/** @global Size of one side of the available room that the spheres can exist in */
const boxSize = 2.725;


/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Performs the document.getElementById() function.
 * @param {String} elID String that identifies the element in the HTML document
 * @returns {HTMLElement} The element in question
 */
function gebi(elID) {
    return document.getElementById(elID);
}

//-----------------------------------------------------------------------------
// Setup functions (run once when the webpage loads)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
    // Set up the canvas with a WebGL context.
    canvas = gebi("glCanvas");
    gl = createGLContext(canvas);

    // Compile and link a shader program.
    setupShaders();

    // Set drag coefficient to be a random number between 0 and 1.
    gebi("drag").value = Math.random();

    // Start rendering spheres.
    startCreation();

    document.onkeydown = keyDown;
    document.onkeyup = keyUp;

    // Create the projection matrix with perspective projection.
    const near = 0.1;
    const far = 200.0;
    glMatrix.mat4.perspective(projectionMatrix, degToRad(45),
        gl.viewportWidth / gl.viewportHeight,
        near, far);

    // Set the background color to black (you can change this if you like).
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Start animating.
    requestAnimationFrame(animate);
}

/**
 * Renders spheres and saves data about their size, location,
 * velocity and colour.
 */
function startCreation() {
    // Create a sphere mesh and set up WebGL buffers for it.
    sphere1 = new Sphere(5);
    for (let i = 0; i < sphereCount; i++) {
        // Randomise each sphere's size, starting location, initial velocity and colour.
        scale.push(Math.random());
        translate.push([2 * Math.random() - 1, 2 * Math.random(), -Math.random()]);
        velocity.push([6 * Math.random() - 3, Math.random(), Math.random()]);

        colourR.push(Math.random());
        colourG.push(Math.random());
        colourB.push(Math.random());
    }
    sphere1.setupBuffers(shaderProgram);
    gebi("sphereCount").innerHTML = "There are " + sphereCount + " rendered spheres.";
}

/**
 * Handles events when unpressed keys are pressed.
 * @param {*} event
 */
function keyDown(event) {
    if (possibleKeysPressed.includes(event.key)) event.preventDefault();
    keysPressed[event.key] = true;

    if (keysPressed["r"]) {
        // Reset the data saved.
        sphereCount = 0;
        scale = [];
        translate = [];
        velocity = [];
        colourR = [];
        colourG = [];
        colourB = [];
    }
    // Render 2 more spheres.
    if (keysPressed["="]) sphereCount += 2;
    // Remove 1 of the last 2 spheres rendered.
    if (keysPressed["-"] && sphereCount > 0) sphereCount--;
    if (sphereCount == 1) gebi("sphereCount").innerHTML = "There is 1 rendered sphere.";
    else gebi("sphereCount").innerHTML = "There are " + sphereCount + " rendered spheres.";
    // Render spheres `sphereCount` number of times.
    startCreation();
}

/**
 * Handles events when pressed keys are no longer pressed.
 * @param {*} event
 */
function keyUp(event) {
    keysPressed[event.key] = false;
}


/**
 * Creates a WebGL 2.0 context.
 * @param {element} canvas The HTML5 canvas to attach the context to.
 * @return {Object} The WebGL 2.0 context.
 */
function createGLContext(canvas) {
    var context = null;
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
    var shaderScript = gebi(id);

    // Return null if we don't find an element with the specified id
    if (!shaderScript) {
        return null;
    }

    var shaderSource = shaderScript.text;

    var shader;
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
    vertexShader = loadShaderFromDOM("shader-vs");
    fragmentShader = loadShaderFromDOM("shader-fs");

    // Link the shaders together into a program.
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    // If you have multiple different shader programs, you'll need to move this
    // function to draw() and call it whenever you want to switch programs
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
}

//-----------------------------------------------------------------------------
// Animation functions (run every frame)
/**
 * Draws the current frame and then requests to draw the next frame.
 * @param {number} currentTime The elapsed time in milliseconds since the
 *    webpage loaded.
 */
function animate(currentTime) {
    // Add code here using currentTime if you want to add animations

    // Set up the canvas for this frame
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var modelMatrix = glMatrix.mat4.create();
    var viewMatrix = glMatrix.mat4.create();

    // Create the view matrix using lookat.
    const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
    const eyePt = glMatrix.vec3.fromValues(0.0, 0.0, 10.0);
    const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
    glMatrix.mat4.lookAt(viewMatrix, eyePt, lookAtPt, up);

    // Transform the light position to view coordinates
    var lightPosition = glMatrix.vec3.fromValues(5, 5, -5);
    glMatrix.vec3.transformMat4(lightPosition, lightPosition, viewMatrix);

    setLightUniforms(lAmbient, lDiffuse, lSpecular, lightPosition);

    // Reset the elapsed time as well as the current time.
    let elapsed = (Date.now() - currTime) / 1000;
    currTime = Date.now();

    handlePresentedData();

    // You can draw multiple spheres by changing the modelViewMatrix, calling
    // setMatrixUniforms() again, and calling gl.drawArrays() again for each
    // sphere. You can use the same sphere object and VAO for all of them,
    // since they have the same triangle mesh.
    sphere1.bindVAO();
    let T = glMatrix.mat4.create(), S = glMatrix.mat4.create();
    for (let i = 0; i < sphereCount; i++) {
        // Colour each sphere.
        let colourArr = [colourR[i], colourG[i], colourB[i]];
        setMaterialUniforms(colourArr, colourArr, colourArr, shininess);

        // Update their acceleration, velocity and location.
        handleMotionData(i, elapsed);

        // Set modelMatrix = TS.
        glMatrix.mat4.fromTranslation(T, glMatrix.vec3.fromValues(translate[i][0], translate[i][1], translate[i][2]));
        glMatrix.mat4.fromScaling(S, glMatrix.vec3.fromValues(scale[i], scale[i], scale[i]));
        glMatrix.mat4.multiply(modelMatrix, T, S);

        // Concatenate the model and view matrices.
        // Remember matrix multiplication order is important.
        glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        setMatrixUniforms();

        gl.drawArrays(gl.TRIANGLES, 0, sphere1.numTriangles * 3);
    }
    sphere1.unbindVAO();

    // Use this function as the callback to animate the next frame.
    requestAnimationFrame(animate);
}

/**
 * Deals with the selected and modified HTML elements.
 */
function handlePresentedData() {
    // Handle modification to acceleration.
    if (gebi("controlAccel").checked) {
        gebi("acceleration").disabled = true;
        currAccel = g_Earth;
    } else {
        gebi("freeze").addEventListener("click", () => { gebi("acceleration").value = 0; })
        gebi("acceleration").disabled = false;
        currAccel = gebi("acceleration").value;
    }
    gebi("currAccel").innerHTML = "Current acceleration: " + currAccel + " msˆ-2";

    // Handle modification to bounce factor.
    currBounce = gebi("bounce").value;
    gebi("currBounce").innerHTML = "Current bounce factor: " + currBounce;

    // Handle modification to drag coefficient.
    currDrag = gebi("drag").value;
    gebi("currDrag").innerHTML = "Current drag coefficient: " + currDrag;
}

/**
 * Deals with the change in acceleration, velocity and location
 * after every frame.
 * @param {Number} index Index of the sphere whose data is to be updated
 * @param {Number} elapsed The amount of time (in seconds) since the last update
 */
function handleMotionData(index, elapsed) {
    velocity[index][0] *= Math.pow((1 - currDrag), elapsed);
    // Include gravitational acceleration in the calculation for the y-axis velocity.
    velocity[index][1] = velocity[index][1] * Math.pow((1 - currDrag), elapsed) + currAccel * elapsed;
    velocity[index][2] *= Math.pow((1 - currDrag), elapsed);

    for (let i = 0; i < 3; i++) { // For each of the three dimensions,
        // Deal with translation due to velocity,
        translate[index][i] += velocity[index][i] * elapsed;
        // Prevent spheres from going outside the 'box' and make them in bounce the opposite direction.
        if (translate[index][i] < scale[index] - boxSize) {
            translate[index][i] = scale[index] - boxSize;
            velocity[index][i] *= -currBounce;
        } else if (translate[index][i] > boxSize - scale[index]) {
            translate[index][i] = boxSize - scale[index];
            velocity[index][i] *= -currBounce;
        }
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
