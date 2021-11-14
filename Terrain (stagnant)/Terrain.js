/**
 * @file Terrain.js - A simple 3D terrain model for WebGL
 */

class Terrain {
	/**
	 * Initializes the members of the Terrain object.
	 * @param {number} div Number of triangles along the x-axis and y-axis.
	 * @param {number} minX Minimum X coordinate value.
	 * @param {number} maxX Maximum X coordinate value.
	 * @param {number} minY Minimum Y coordinate value.
	 * @param {number} maxY Maximum Y coordinate value.
	 */
	constructor(div, minX, maxX, minY, maxY) {
		this.div = div;
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;

		// Allocate the vertex array
		this.positionData = [];
		// Allocate the normal array.
		this.normalData = [];
		// Allocate the triangle array.
		this.faceData = [];
		// Allocate an array for edges so we can draw a wireframe.
		this.edgeData = [];
		console.log("Terrain: Allocated buffers");

		this.generateTriangles();
		console.log("Terrain: Generated triangles");

		this.generateLines();
		console.log("Terrain: Generated lines");

		this.shapeTerrain();
		console.log("Terrain: Sculpted terrain");

		this.calculateNormals();
		console.log("Terrain: Generated normals");

		// You can use this function for debugging your buffers:
		// this.printBuffers();
	}


	//-------------------------------------------------------------------------
	// Vertex access and triangle generation - your code goes here!
	/**
	 * Set the x,y,z coords of the ith normal.
	 * @param {Object} v An array of length 3 holding the x,y,z coordinates.
	 * @param {number} i The index of the normal to set.
	 */
	setNormal(v, i) {
		// MP2: Implement this function!
		this.normalData[i * 3] = v[0];
		this.normalData[i * 3 + 1] = v[1];
		this.normalData[i * 3 + 2] = v[2];
	}


	/**
	 * Set the x,y,z coords of the ith vertex.
	 * @param {Object} v An array of length 3 holding the x,y,z coordinates.
	 * @param {number} i The index of the vertex to set.
	 */
	setVertex(v, i) {
		// MP2: Implement this function!
		this.positionData[i * 3] = v[0];
		this.positionData[i * 3 + 1] = v[1];
		this.positionData[i * 3 + 2] = v[2];
	}


	/**
	 * Returns the x,y,z coords of the ith normal.
	 * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
	 * @param {number} i The index of the normal to get.
	 */
	getNormal(v, i) {
		v[0] = this.normalData[i * 3];
		v[1] = this.normalData[i * 3 + 1];
		v[2] = this.normalData[i * 3 + 2];
	}


	/**
	 * Returns the x,y,z coords of the ith vertex.
	 * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
	 * @param {number} i The index of the vertex to get.
	 */
	getVertex(v, i) {
		// MP2: Implement this function!
		v[0] = this.positionData[i * 3];
		v[1] = this.positionData[i * 3 + 1];
		v[2] = this.positionData[i * 3 + 2];
	}


	/**
	 * Returns the max z coordinate in the terrain.
	 * @return {number} The greatest z coordinate
	 */
	getMaxElevation() {
		this.maxElevation = -Infinity;
		for (let i = 0; i < this.numVertices; i++) {
			this.maxElevation = Math.max(this.maxElevation, this.positionData[i * 3 + 2]);
		}
		return this.maxElevation;
	}


	/**
	 * Returns the min z coordinate in the terrain.
	 * @return {number} The smallest z coordinate
	 */
	getMinElevation() {
		this.minElevation = Infinity;
		for (let i = 0; i < this.numVertices; i++) {
			this.minElevation = Math.min(this.minElevation, this.positionData[i * 3 + 2]);
		}
		return this.minElevation;
	}


	/**
	 * Generates a mesh using an indexed face representation.
	 */
	generateTriangles() {
		// MP2: Implement the rest of this function!

		//
		let deltaX = (this.maxX - this.minX) / this.div;
		let deltaY = (this.maxY - this.minY) / this.div;

		for (let i = 0; i <= this.div; i++) {
			for (let j = 0; j <= this.div; j++) {
				// Fill in an array called positionData
				// which contains the x,y,z coordinates of each vertex
				this.positionData.push(this.minX + deltaX * j);
				this.positionData.push(this.minY + deltaY * i);
				this.positionData.push(0);

				// Fill in an array called normalData
				// which contains the x,y,z coordinates of each normal
				this.normalData.push(0);
				this.normalData.push(0);
				this.normalData.push(0);

				if (i < this.div && j < this.div) {
					// Fill in an array called faceData
					// which contains the indices of the vertices at the triangle corners
					let index = (this.div + 1) * i + j;

					this.faceData.push(index);
					this.faceData.push(index + 1);
					this.faceData.push(index + this.div + 1);

					this.faceData.push(index + 1);
					this.faceData.push(index + this.div + 2);
					this.faceData.push(index + this.div + 1);
				}
			}
		}

		// We'll need these to set up the WebGL buffers.
		this.numVertices = this.positionData.length / 3;
		this.numFaces = this.faceData.length / 3;

		this.shapeTerrain();
		this.calculateNormals();
	}


	/**
	 * Implements the faulting method by constructing a Random Fault Plane
	 * and raising and lowering vertices.
	 */
	shapeTerrain() {
		// MP2: Implement this function!
		let cutCount = Math.max(this.div * 2, 50), delta = 0.2, H = Math.random();

		for (let cuts = 0; cuts < cutCount; cuts++) {
			if (cuts == cutCount - 1) console.log("I actually had the nerve to make the final cut");

			// First generate a random point p in the rectangle (minX, minY, 0) × (maxX, maxY, 0).
			let randX = Math.random() * (this.maxX - this.minX) + this.minX;
			let randY = Math.random() * (this.maxY - this.minY) + this.minY;
			let randPoint = glMatrix.vec3.fromValues(randX, randY, 0);

			// Generate a random normal vector n for the plane <x_n, y_n, 0>.
			let randomVector2 = glMatrix.vec2.create();
			glMatrix.vec2.random(randomVector2);
			let randNormal = glMatrix.vec3.fromValues(randomVector2[0], randomVector2[1], 0);

			for (let i = 0; i < this.numVertices; i++) {
				// Given a vertex b, test which side of the plane that vertex falls on
				// by using the dot product test (b - p) • n ≥ 0.
				let currVertex = glMatrix.vec3.create(), randDifference = glMatrix.vec3.create();
				this.getVertex(currVertex, i); // currVertex = b
				glMatrix.vec3.sub(randDifference, currVertex, randPoint); // randDifference = b - p

				// If b is in the negative half-space, lower the z coordinate by some amount ð.
				if (glMatrix.vec3.dot(randDifference, randNormal) < 0) currVertex[2] -= delta;
				// If b is in the positive half-space, raise the z coordinate by some amount ð.
				else currVertex[2] += delta;

				this.setVertex(currVertex, i);
			}

			// For the next pass, use delta = delta / (2^H), where H = [0, 1].
			delta /= (2 ** H);
		}
	}


	/**
	 * Generates per-vertex normals for the mesh.
	 */
	calculateNormals() {
		// MP2: Implement this function!
		for (let i = 0; i < this.numFaces; i++) {
			let normal1 = glMatrix.vec3.create(), normal2 = glMatrix.vec3.create(), normal3 = glMatrix.vec3.create(),
				vertex1 = glMatrix.vec3.create(), vertex2 = glMatrix.vec3.create(), vertex3 = glMatrix.vec3.create(),
				t1 = glMatrix.vec3.create(), t2 = glMatrix.vec3.create(), newNormal = glMatrix.vec3.create(),
				normalArray = [normal1, normal2, normal3], vertexArray = [vertex1, vertex2, vertex3];

			for (let j = 0; j < 3; j++) {
				this.getNormal(normalArray[j], this.faceData[i * 3 + j]);
				this.getVertex(vertexArray[j], this.faceData[i * 3 + j]);
			}

			// Calculate new normal using cross product
			glMatrix.vec3.sub(t1, vertex2, vertex1);
			glMatrix.vec3.sub(t2, vertex3, vertex1);
			glMatrix.vec3.cross(newNormal, t1, t2);

			// Add new and current normal, set final result to faceData
			for (let k = 0; k < 3; k++) {
				glMatrix.vec3.add(normalArray[k], normalArray[k], newNormal);
				this.setNormal(normalArray[k], this.faceData[i * 3 + k]);
			}
		}

		// Normalise all normal vectors
		for (let m = 0; m < this.numVertices; m++) {
			let tobeNormalised = glMatrix.vec3.create();
			this.getNormal(tobeNormalised, m);
			glMatrix.vec3.normalize(tobeNormalised, tobeNormalised);
			this.setNormal(tobeNormalised, m);
		}
	}


	//-------------------------------------------------------------------------
	// Setup code (run once)
	/**
	 * Generates line data from the faces in faceData for wireframe rendering.
	 */
	generateLines() {
		for (let f = 0; f < this.faceData.length / 3; f++) {
			// Calculate index of the face
			let fid = f * 3;
			this.edgeData.push(this.faceData[fid]);
			this.edgeData.push(this.faceData[fid + 1]);

			this.edgeData.push(this.faceData[fid + 1]);
			this.edgeData.push(this.faceData[fid + 2]);

			this.edgeData.push(this.faceData[fid + 2]);
			this.edgeData.push(this.faceData[fid]);
		}
	}


	/**
	 * Sets up the WebGL buffers and vertex array object.
	 * @param {object} shaderProgram The shader program to link the buffers to.
	 */
	setupBuffers(shaderProgram) {
		// Create and bind the vertex array object.
		this.vertexArrayObject = gl.createVertexArray();
		gl.bindVertexArray(this.vertexArrayObject);

		// Create the position buffer and load it with the position data.
		this.vertexPositionormalData = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionormalData);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData),
			gl.STATIC_DRAW);
		this.vertexPositionormalData.itemSize = 3;
		this.vertexPositionormalData.numItems = this.numVertices;
		console.log("Loaded ", this.vertexPositionormalData.numItems, " vertices.");

		// Link the position buffer to the attribute in the shader program.
		gl.vertexAttribPointer(shaderProgram.locations.vertexPosition,
			this.vertexPositionormalData.itemSize, gl.FLOAT,
			false, 0, 0);
		gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);

		// Specify normals to be able to do lighting calculations
		this.vertexNormalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData),
			gl.STATIC_DRAW);
		this.vertexNormalBuffer.itemSize = 3;
		this.vertexNormalBuffer.numItems = this.numVertices;
		console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

		// Link the normal buffer to the attribute in the shader program.
		gl.vertexAttribPointer(shaderProgram.locations.vertexNormal,
			this.vertexNormalBuffer.itemSize, gl.FLOAT,
			false, 0, 0);
		gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);

		// Set up the buffer of indices that tells WebGL which vertices are
		// part of which triangles.
		this.triangleIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceData),
			gl.STATIC_DRAW);
		this.triangleIndexBuffer.itemSize = 1;
		this.triangleIndexBuffer.numItems = this.faceData.length;
		console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");

		// Set up the index buffer for drawing edges.
		this.edgeIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeData),
			gl.STATIC_DRAW);
		this.edgeIndexBuffer.itemSize = 1;
		this.edgeIndexBuffer.numItems = this.edgeData.length;

		// Unbind everything; we want to bind the correct element buffer and
		// VAO when we want to draw stuff
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);
	}


	//-------------------------------------------------------------------------
	// Rendering functions (run every frame in draw())
	/**
	 * Renders the terrain to the screen as triangles.
	 */
	drawTriangles() {
		gl.bindVertexArray(this.vertexArrayObject);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
		gl.drawElements(gl.TRIANGLES, this.triangleIndexBuffer.numItems,
			gl.UNSIGNED_INT, 0);
	}


	/**
	 * Renders the terrain to the screen as edges, wireframe style.
	 */
	drawEdges() {
		gl.bindVertexArray(this.vertexArrayObject);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
		gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems,
			gl.UNSIGNED_INT, 0);
	}


	//-------------------------------------------------------------------------
	// Debugging
	/**
	 * Prints the contents of the buffers to the console for debugging.
	 */
	printBuffers() {
		for (let i = 0; i < this.numVertices; i++) {
			console.log("v ", this.positionData[i * 3], " ",
				this.positionData[i * 3 + 1], " ",
				this.positionData[i * 3 + 2], " ");
		}
		for (let i = 0; i < this.numVertices; i++) {
			console.log("n ", this.normalData[i * 3], " ",
				this.normalData[i * 3 + 1], " ",
				this.normalData[i * 3 + 2], " ");
		}
		for (let i = 0; i < this.numFaces; i++) {
			console.log("f ", this.faceData[i * 3], " ",
				this.faceData[i * 3 + 1], " ",
				this.faceData[i * 3 + 2], " ");
		}
	}

} // class Terrain
