//the OpenGL context
var gl = null;

var canvasWidth = 1000;
var canvasHeight = 800;
var aspectRatio = canvasWidth / canvasHeight;

// camera values
var cameraPos = vec3.fromValues(0, 0, 3);
var cameraFront = vec3.fromValues(0, 0, -1);
var cameraUp = vec3.fromValues(0, 1, 0);
var cameraRight = vec3.fromValues(0, 0, 0);
var pitch = 0;
var yaw = -90;
var speed = 0.2;
var sensitivity = 0.05;

var lookatVec = vec3.fromValues(0, 0, 0);

var deltaTime = 0;
var prevTime = 0;

// timestamps
var sceneOne = 10000;
var sceneTwo = 20000;
var movieEnd = 30000;

// animation
var autoPilot = true;
var animationPos = vec3.fromValues(0, 0, 0);
var animationLookAt = vec3.fromValues(0, 0, 0);

var animationRunning = true;

// constant upvector
var upvector = vec3.fromValues(0, 1, 0);

//rendering context
var context;

// particles
const particleLife = 1000;
const maxParticles = 800000;
var particles = [];
var particleNodes = [];
var waterParticleNode;

//framebuffer variables
var renderTargetFramebuffer;
var framebufferWidth = 512;
var framebufferHeight = 512;

//camera and projection settings
var animatedAngle = 0;
var waterfallAnimation = 0;
var legRotationAngle = 0;
var fieldOfViewInRadians = convertDegreeToRadians(30);

// POI
var startPoint = vec3.fromValues(0, 0, 0);
var checkPoint1 = vec3.fromValues(1, 0, 36);
var checkPoint2 = vec3.fromValues(5, 0, 45);

var cameraStartpoint = cameraPos;
var cameraCheckpoint1 = vec3.fromValues(-13, 3, 12);
var cameraCheckpoint2 = vec3.fromValues(-16, 7, 25);
var cameraCheckpoint3 = vec3.fromValues(0, 0, 0);

// robot variables
var robotMoving = true;
var robotMovement = vec3.fromValues(0, 0, 0);
var legUp = true;
var robotTransformationNode;
var headTransformationNode;
var leftLegTransformationNode;
var rightLegtTransformationNode;

// boat variables
var boatMovement = vec3.fromValues(1, -1.5, 37);
var boatTransformatioNode;

//textures
var floorTexture;

//scenegraph nodes
var root = null;
var rootnofloor = null;
//load the shader resources using a utility function
loadResources({
  vs: 'shader/texture.vs.glsl',
  fs: 'shader/texture.fs.glsl',
  vs_animated_texture: 'shader/animated_texture.vs.glsl',
  vs_env: 'shader/envmap.vs.glsl',
  fs_env: 'shader/envmap.fs.glsl',
  vs_phong: 'shader/phong.vs.glsl',
  fs_phong: 'shader/phong.fs.glsl',
  vs_single: 'shader/empty.vs.glsl',
  fs_single: 'shader/empty.fs.glsl',
  vs_particle: 'shader/particle.vs.glsl',
  fs_particle: 'shader/particle.fs.glsl',
  water_particle: 'models/water_particle_light.png',
  env_pos_x: 'models/skybox/right.jpg',
  env_neg_x: 'models/skybox/left.jpg',
  env_pos_y: 'models/skybox/top.jpg',
  env_neg_y: 'models/skybox/bottom.jpg',
  env_pos_z: 'models/skybox/front.jpg',
  env_neg_z: 'models/skybox/back.jpg',
  floortexture: 'models/grasslight.jpg',
  water_texture: 'models/water_texture.jpg',
  boat_texture: 'models/boattex.jpg',
  waterfall_texture: 'models/waterfall_texture.png',
  boat: 'models/OldBoat.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  //render one frame
  render();
});

/**
 * initializes OpenGL context, compile shader, and load buffers
 */
function init(resources) {
  //create a GL context
  gl = createContext(canvasWidth, canvasHeight);

  gl.enable(gl.DEPTH_TEST);

  initCubeMap(resources);

  //create scenegraph
  root = createSceneGraph(gl, resources);
  initInteraction(gl.canvas);
}

function createSceneGraph(gl,resources){
const root = new ShaderSGNode(createProgram(gl, resources.vs_phong, resources.fs_phong));

{
  var skybox = new ShaderSGNode(createProgram(gl, resources.vs_env, resources.fs_env), [
    new EnvironmentSGNode(envcubetexture, 4, false,
      new RenderSGNode(makeSphere(100)))
  ]);
  root.append(skybox);
}

const grass = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs));

function createLightSphere() {
  return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
    new RenderSGNode(makeSphere(.2,10,10))
  ]);
}
root.append(grass);
  let floor = new AdvancedTextureSGNode(resources.floortexture,
              new RenderSGNode(makeFloor())
            );

  grass.append(new TransformationSGNode(glm.transform({ translate: [0,-1.5,0], rotateX: -90, scale: [5,3,3]}), [
    floor
  ]));

  let water = new AdvancedTextureSGNode(resources.water_texture,
              new RenderSGNode(makeFloor()))
  grass.append(new TransformationSGNode(glm.transform({translate: [0,-1.5,80], rotateX: -90, scale: [5,5,7]}),
      [water]));

  let light = new LightNode();
  light.ambient = [0,0,0,1];
  light.diffuse = [1,1,1,1];
  light.specular = [1,1,1,1];
  light.position = [0,3,2];
  light.append(createLightSphere())
  root.append(light);

  boatTransformatioNode = new TransformationSGNode(
    glm.transform({
      translate: [boatMovement[0], boatMovement[1], boatMovement[2]],
      scale: [0.3,0.3,0.3]
      }), new RenderSGNode(resources.boat));
  let boat = new AdvancedTextureSGNode(resources.boat_texture, boatTransformatioNode);
  grass.append(boat);

  let animatedTexture = new ShaderSGNode(createProgram(gl, resources.vs_animated_texture, resources.fs));
  root.append(animatedTexture);

  let waterfall = new AnimatedTextureSGNode(resources.water_texture,
                  new TransformationSGNode(glm.transform({translate: [20, 3,80], scale: [0.3,0.5,0.5]}),
                  new RenderSGNode(makeFloor())));
  animatedTexture.append(waterfall);


   waterParticleNode = new TextureSGNode(resources.water_particle);
   let waterfallShaderNode =new ShaderSGNode(createProgram(gl, resources.vs_particle, resources.fs_particle));
   root.append(waterfallShaderNode);
   waterfallShaderNode.append(new TransformationSGNode(glm.transform({translate: [15, -1,75], scale: 2.5}),
            waterParticleNode));

  createRobot(root, resources);

  return root;
}

function initCubeMap(resources) {
  //create the texture
  envcubetexture = gl.createTexture();
  //define some texture unit we want to work on
  gl.activeTexture(gl.TEXTURE0);
  //bind the texture to the texture unit
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envcubetexture);
  //set sampling parameters
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.MIRRORED_REPEAT); //will be available in WebGL 2
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //set correct image for each side of the cube map
  //gl.pixelStorei(gl.UNPACK_FLIP_Z_WEBGL, true);//flipping required for our skybox, otherwise images don't fit together
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_x);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_x);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_y);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_y);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_z);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_z);
  //generate mipmaps (optional)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  //unbind the texture again
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

//a scene graph node for setting environment mapping parameters
class EnvironmentSGNode extends SGNode {

  constructor(envtexture, textureunit, doReflect , children ) {
      super(children);
      this.envtexture = envtexture;
      this.textureunit = textureunit;
      this.doReflect = doReflect;
  }

  render(context)
  {
    //set additional shader parameters
    let invView3x3 = mat3.fromMat4(mat3.create(), context.invViewMatrix); //reduce to 3x3 matrix since we only process direction vectors (ignore translation)
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_invView'), false, invView3x3);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_texCube'), this.textureunit);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useReflection'), this.doReflect)

    //activate and bind texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.envtexture);

    //render children
    super.render(context);

    //clean up
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}

function createRobot(rootNode, resources) {
  cubeNode = new MaterialNode([new RenderSGNode(makeCube(2,2,2))]);
  cubeNode.ambient = [0.24725, 0.1995, 0.0745, 1];
  cubeNode.diffuse = [0.75164, 0.60648, 0.22648, 1];
  cubeNode.specular = [0.628281, 0.555802, 0.366065, 1];
  cubeNode.shininess = 0.4;

  pyramidNode = new MaterialNode([new RenderSGNode(makePyramid())]);
  //turquoise
  pyramidNode.ambient = [0.1,	0.18725,	0.1745, 1];
  pyramidNode.diffuse = [0.396,	0.74151,	0.69102, 1];
  pyramidNode.specular = [0.297254,	0.30829,	0.306678, 1];
  pyramidNode.shininess = 0.1;

  //transformations of whole body
  bodyNode = new TransformationSGNode(glm.transform({translate: [0.3,0.8,0]}),pyramidNode);
  robotTransformationNode =new TransformationSGNode(mat4.create(),[bodyNode]);
  rootNode.append(robotTransformationNode);

  //head
  sphereNode = new MaterialNode([new RenderSGNode(makeSphere(.2,10,10))]);
  sphereNode.ambient = [0.24725, 0.1995, 0.0745, 1];
  sphereNode.diffuse = [0.75164, 0.60648, 0.22648, 1];
  sphereNode.specular = [0.628281, 0.555802, 0.366065, 1];
  sphereNode.shininess = 0.4;
  headTransformationNode = (new TransformationSGNode(glm.transform({translate: [0.3, 2.2, 0], scale: [2, 2, 2]}),sphereNode));

  robotTransformationNode.append(headTransformationNode);

  //left leg
  leftLegTransformationNode = new TransformationSGNode(glm.transform({translate: [0.5,-0.5,0], scale: [0.1,1,0.1]}),cubeNode);
  robotTransformationNode.append(leftLegTransformationNode, cubeNode);

  //right leg
  rightLegtTransformationNode = new TransformationSGNode(glm.transform({translate: [0,-0.5,0], scale: [0.1,1,0.1]}),cubeNode);
  robotTransformationNode.append(rightLegtTransformationNode);

  // right arm
  rightArmTransformationNode = new TransformationSGNode(glm.transform({translate: [1,1.5,0], scale: [0.6,0.1,0.1]}),cubeNode);
  robotTransformationNode.append(rightArmTransformationNode);

  //left arm
  leftArmTransformationNode = new TransformationSGNode(glm.transform({translate: [-0.4,1.5,0], scale: [0.6,0.1,0.1]}),cubeNode);
  robotTransformationNode.append(leftArmTransformationNode);

}

/**
 * render one frame
 */
function render(timeInMilliseconds) {

  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(root.program);

  deltaTime = timeInMilliseconds - prevTime;
  prevTime = timeInMilliseconds;

  createParticles(timeInMilliseconds);

  setAnimationParameters(timeInMilliseconds, deltaTime);

  moveRobot();

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);

  lookatVec = vec3.add(vec3.create(), cameraPos, cameraFront);
  let lookAtMatrix = mat4.lookAt(mat4.create(), cameraPos, lookatVec, upvector);

  context.viewMatrix = lookAtMatrix;

  context.timeInMilliseconds = timeInMilliseconds;

  //get inverse view matrix to allow to compute viewing direction in world space for environment mapping
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

  root.render(context);

  waterfallAnimation += 0.01;
  //request another render call as soon as possible
  requestAnimationFrame(render);

  //animate based on elapsed time
  animatedAngle = timeInMilliseconds/10;
}

function setAnimationParameters(timeInMilliseconds, deltaTime) {
  if (!animationRunning) {
    return;
  }

  // errorhandling for 1st call where deltaTime = NaN
  if (isNaN(deltaTime)) {
    deltaTime = 0.001;
  }

  var timeInSeconds = timeInMilliseconds / 1000;
  var stepSize = 0;

  // Robot movement
  if (timeInMilliseconds < sceneOne) {
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, startPoint, checkPoint1, 0, sceneOne);
  } else if (timeInMilliseconds >= sceneOne && timeInMilliseconds < sceneTwo) {
    robotMoving = false;
    boatMoving = true;
    boatMovement = move3DVector(timeInMilliseconds, boatMovement, checkPoint1, checkPoint2, sceneOne, sceneTwo);
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, checkPoint1, checkPoint2, sceneOne, sceneTwo);
  } else if (timeInMilliseconds >= sceneTwo && timeInMilliseconds < movieEnd) {
    // robotMoving = true;
  } else if (timeInMilliseconds >= movieEnd) {
    robotMoving = false;
  }

  // Camera flight
  if (timeInMilliseconds < sceneOne) {
    animationLookAt = move3DVector(timeInMilliseconds, animationLookAt, startPoint, checkPoint1, 0, sceneOne);
    animationPos = move3DVector(timeInMilliseconds, animationPos, cameraStartpoint, cameraCheckpoint1, 0, sceneOne);
  } else if (timeInMilliseconds >= sceneOne && timeInMilliseconds < sceneTwo) {
    animationLookAt = move3DVector(timeInMilliseconds, animationLookAt, checkPoint1, checkPoint2, sceneOne, sceneTwo);
    animationPos = move3DVector(timeInMilliseconds, animationPos, cameraCheckpoint1, cameraCheckpoint2, sceneOne, sceneTwo);
  } else if (timeInMilliseconds >= sceneTwo + 5000 && timeInMilliseconds < movieEnd) {

  }
  if (autoPilot) {
    setCameraPosAndLookAt(animationPos, animationLookAt);
  }
  console.log(robotMovement);

}

/**
* Moves a vector from start to end beginning at starttime and ending at endtime
*/
function move3DVector(currentTime, vectorToMove, start, end, starttime, endtime) {
  vectorToMove[0] = start[0] + (currentTime - starttime) * ((end[0] - start[0]) / (endtime - starttime));
  vectorToMove[1] = start[1] + (currentTime - starttime) * ((end[1] - start[1]) / (endtime - starttime));
  vectorToMove[2] = start[2] + (currentTime - starttime) * ((end[2] - start[2]) / (endtime - starttime));
  return vectorToMove;
}

function moveRobot() {
  //update transformation of robot for walking animation
  robotTransformationNode.matrix = glm.transform({translate: [robotMovement[0],robotMovement[1],robotMovement[2]]});
  if (robotMoving) {

    //update leg transformation to move left leg
    leftLegTransformationNode.matrix = glm.transform({rotateX: legRotationAngle, translate: [0.5,-0.5,0], scale: [0.1,1,0.1]});

    //update leg transformation to move right leg
    rightLegtTransformationNode.matrix = glm.transform({rotateX:-legRotationAngle, translate: [0,-0.5,0], scale: [0.1,1,0.1]});

    //simulate walking
    if(legRotationAngle == 30)
      legUp = false;
    if(legRotationAngle == -30)
      legUp = true;
    if(legUp)
      legRotationAngle = legRotationAngle + 0.5;
    else
      legRotationAngle = legRotationAngle - 0.5;
  }
}

function moveBoat() {
  boatTransformatioNode.matrix = glm.transform({translate: [boatMovement[0], boatMovement[1], boatMovement[2]]});
}

/**
 * returns a new rendering context
 * @param gl the gl context
 * @param projectionMatrix optional projection Matrix
 * @returns {ISceneGraphContext}
 */
function createSceneGraphContext(gl, shader) {

  //create a default projection matrix
  projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, aspectRatio, 0.01, 150);
  //set projection matrix
  gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_projection'), false, projectionMatrix);

  return {
    gl: gl,
    sceneMatrix: mat4.create(),
    viewMatrix: calculateViewMatrix(),
    projectionMatrix: projectionMatrix,
    shader: shader
  };
}

function calculateViewMatrix() {
  //compute the camera's matrix
  var eye = cameraFront;
  var center = cameraPos;
  var up = [0,1,0];
  viewMatrix = mat4.lookAt(mat4.create(), eye, center, up);
  return viewMatrix;
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

function makeFloor() {
  var floor = makeRect(10, 10);
  //TASK 3: adapt texture coordinates
  floor.texture = [0, 0,   1, 0,   1, 1,   0, 1];
  return floor;
}
class LightNode extends TransformationSGNode {

  constructor(position, children) {
    super(children);
    this.position = position || [0, 0, 0];
    this.ambient = [0, 0, 0, 1];
    this.diffuse = [1, 1, 1, 1];
    this.specular = [1, 1, 1, 1];
    //uniform name
    this.uniform = 'u_light';
  }

  /**
   * computes the absolute light position in world coordinates
   */
  computeLightPosition(context) {
    //transform with the current model view matrix
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const pos = [this.position[0], this.position[1],this.position[2], 1];
    return vec4.transformMat4(vec4.create(), pos, modelViewMatrix);
  }

  setLightUniforms(context) {
    const gl = context.gl,
      shader = context.shader,
      position = this.computeLightPosition(context);

    //TASK 3-5 set uniforms
	  gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.ambient'), this.ambient);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.diffuse'), this.diffuse);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.specular'), this.specular);

    gl.uniform3f(gl.getUniformLocation(shader, this.uniform+'Pos'), position[0], position[1], position[2]);
  }

  render(context) {
    this.setLightUniforms(context);

    //since this a transformation node update the matrix according to my position
    this.matrix = glm.translate(this.position[0], this.position[1], this.position[2]);

    //render children
    super.render(context);
  }
}
class MaterialNode extends SGNode {

  constructor(children) {
    super(children);
    this.ambient = [0.2, 0.2, 0.2, 1.0];
    this.diffuse = [0.8, 0.8, 0.8, 1.0];
    this.specular = [0, 0, 0, 1];
    this.emission = [0, 0, 0, 1];
    this.shininess = 0.0;
    this.uniform = 'u_material';
  }

  setMaterialUniforms(context) {
    const gl = context.gl,
      shader = context.shader;

    //TASK 2-3 set uniforms
    //hint setting a structure element using the dot notation, e.g. u_material.ambient
    //setting a uniform: gl.uniform UNIFORM TYPE (gl.getUniformLocation(shader, UNIFORM NAME), VALUE);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.ambient'), this.ambient);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.diffuse'), this.diffuse);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.specular'), this.specular);
    gl.uniform4fv(gl.getUniformLocation(shader, this.uniform+'.emission'), this.emission);
    gl.uniform1f(gl.getUniformLocation(shader, this.uniform+'.shininess'), this.shininess);
  }

  render(context) {
    this.setMaterialUniforms(context);

    //render children
    super.render(context);
  }
}


//a scene graph node for setting texture parameters
class TextureSGNode extends AdvancedTextureSGNode {
  constructor(image, children) {
        super(image, children);
    }
    render(context) {
        gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableTexturing'), 1);

        super.render(context);

        gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableTexturing'), 0);
    }
}

//a scene graph node for setting texture animation parameter
class AnimatedTextureSGNode extends AdvancedTextureSGNode {
  constructor(image, children) {
        super(image, children);
    }
    render(context) {
      gl.uniform1f(gl.getUniformLocation(context.shader, 'u_texture_transform'),waterfallAnimation);
        super.render(context);

    }
}
/**
* Particle node
*/
class ParticleNode extends RenderSGNode {
  constructor(renderer, originTime, position, direction, speed, children) {
    super(renderer, children);
    this.originTime = originTime;
    this.origin = position;
    this.currentPos = [0, 0, 0];
    this.direction = direction;
    this.speed = speed;
    this.age = 0.0;
  }

  update(time) {
    this.age = time - this.originTime;
    // paricle lives on
    if (this.age < particleLife) {
      // randomly send them in both x & z direction
      if ((Math.random() * 10) <= 5) {
        this.currentPos[0] = this.origin[0] + (this.speed * this.age) * this.direction[0];
        this.currentPos[1] = this.origin[1] + (this.speed * this.age) * this.direction[1];
        this.currentPos[2] = this.origin[2] + (this.speed * this.age) * this.direction[2];
      } else {
        this.currentPos[0] = this.origin[0] - (this.speed * this.age) * this.direction[0];
        this.currentPos[1] = this.origin[1] + (this.speed * this.age) * this.direction[1];
        this.currentPos[2] = this.origin[2] - (this.speed * this.age) * this.direction[2];
      }
    // reset particle
    } else {
      this.originTime = time;
      this.age = 0;
      this.currentPos[0] = this.origin[0];
      this.currentPos[1] = this.origin[1];
      this.currentPos[2] = this.origin[2];
    }
  }
}

/**
* Creates and updates the particles
*/
function createParticles(timeInMilliseconds) {
  if (particleNodes.length < maxParticles) {
    // create the particle
    // TODO: adjust parameters accordingly to the final "waterfall"
    let particle = new ParticleNode(makeSphere(0.01, 20, 50), timeInMilliseconds, [Math.random()*3, Math.random() / 3, 0], [Math.random()/2, Math.random(), Math.random()/2], 0.0005);
    // append the particle into the particle list
    particles.push(particle);
    var dummy = new TransformationSGNode(mat4.create(), particle);
    // append the particle to the scenegraph node and in the list of nodes
    waterParticleNode.append(dummy);
    particleNodes.push(dummy);
    // iterate the particle list and update every particle
    for (var i = 0; i < particles.length; i++) {
      var part = particles[i];
      part.update(timeInMilliseconds);
      particleNodes[i].matrix = glm.translate(part.currentPos[0], part.currentPos[1], part.currentPos[2]);
    }
  }
}


// control user input
function initInteraction(canvas) {
  const mouse = {
    pos: { x : 0, y : 0},
    leftButtonDown: false
  };
  function toPos(event) {
    //convert to local coordinates
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  canvas.addEventListener('mousedown', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = event.button === 0;
  });
  canvas.addEventListener('mousemove', function(event) {
    const pos = toPos(event);
    const delta = { x : mouse.pos.x - pos.x, y: mouse.pos.y - pos.y };
    if (mouse.leftButtonDown) {
      //add the relative movement of the mouse to the rotation variables
  		moveWithMouse(delta.x, delta.y);
    }
    mouse.pos = pos;
  });
  canvas.addEventListener('mouseup', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = false;
  });
  //register globally
  document.addEventListener('keypress', function(event) {
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

    console.log(event.code + " key pressed");

    let velocity = 1;
    switch (event.code) {
      case "KeyR":
        if (autoPilot) return;
        resetCamera();
        break;
      case "KeyW":
      case "ArrowUp":
      case "Numpad8":
        if (autoPilot) return;
        moveForward(velocity);
        break;
      case "KeyA":
      case "ArrowLeft":
      case "Numpad4":
        if (autoPilot) return;
        strafeLeft(velocity);
        break;
      case "KeyS":
      case "ArrowDown":
      case "Numpad2":
        if (autoPilot) return;
        moveBackward(velocity);
        break;
      case "KeyD":
      case "ArrowRight":
      case "Numpad6":
        if (autoPilot) return;
        strafeRight(velocity);
        break;
      case "KeyM":
        autoPilot = !autoPilot;
        updateCameraVectors();
        break;
      default:

    }
  });
}

// A lot of camera functions

function updateCameraVectors() {
  // calc new front vec
  cameraFront[0] = Math.cos(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  cameraFront[1] = Math.sin(glm.deg2rad(pitch));
  cameraFront[2] = Math.sin(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  vec3.normalize(cameraFront, cameraFront);
  // recalculate right-vec
  recalculateRightVec();
}

function resetCamera() {
  pitch = 0;
  yaw = -90;
  setCameraPos(vec3.fromValues(0, 2, 1));
}

function moveWithMouse(deltaX, deltaY) {
  deltaX *= sensitivity;
  deltaY *= sensitivity;

  yaw += deltaX;
  pitch -= deltaY;

  // Makes sure that the screen won't flip if the pitch is out of bounds
  if (pitch > 89) {
    pitch = 89;
  }
  if (pitch < -89) {
    pitch = -89;
  }

  updateCameraVectors();
}

function recalculateRightVec() {
  vec3.normalize(cameraRight, vec3.cross(vec3.create(), cameraFront, upvector));
}

function turnCameraHorizontal(increment, value) {
  yaw += increment * value;
  updateCameraVectors();
}

function turnCameraVertical(increment, value) {
  pitch += increment * value;
  updateCameraVectors();
}

function moveForward(velocity) {
  vec3.add(cameraPos, cameraPos, cameraFront);
}

function moveBackward(velocity) {
  vec3.sub(cameraPos, cameraPos, cameraFront);
}

function strafeLeft(velocity) {
  vec3.sub(cameraPos, cameraPos, cameraRight);
}

function strafeRight(velocity) {
  vec3.add(cameraPos, cameraPos, cameraRight);
}

function setCameraPos(toPos) {
  cameraPos = toPos;
  updateCameraVectors();
}

function setCameraPosAndLookAt(toPos, lookAt) {
  cameraPos = toPos;
  vec3.sub(cameraFront, lookAt, toPos);
  recalculateRightVec();
  recalculateYawAndPitch();
  updateLookAtVector(lookAt);
}

function recalculateYawAndPitch() {
  yaw = (vec3.angle(vec3.fromValues(cameraFront[0], 0, cameraFront[2]), vec3.fromValues(0, 0, -1)) * 180 / Math.PI) - 90;
  pitch = 90 - (vec3.angle(vec3.fromValues(0, cameraFront[1], cameraFront[2]), upvector) * 180 / Math.PI);
}

function updateLookAtVector(toLookAt) {
  lookatVec = toLookAt;
}
