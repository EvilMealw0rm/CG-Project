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
var sensitivity = 0.02;

var deltaTime = 0;
var prevTime = 0;

// timestamps
var sceneOne = 10000;
var sceneTwo = 20000;
var movieEnd = 30000;

// constant upvector
var upvector = vec3.fromValues(0, 1, 0);

//rendering context
var context;

//framebuffer variables
var renderTargetFramebuffer;
var framebufferWidth = 512;
var framebufferHeight = 512;

//camera and projection settings
var animatedAngle = 0;
var legRotationAngle = 0;
var fieldOfViewInRadians = convertDegreeToRadians(30);

// robot variables
var robotMoving = true;
var robotMovement = 0;
var legUp = true;
var robotTransformationNode;
var headTransformationNode;
var leftLegTransformationNode;
var rightLegtTransformationNode;

//textures
var floorTexture;

//scenegraph nodes
var root = null;
var rootnofloor = null;
//load the shader resources using a utility function
loadResources({
  vs: 'shader/texture.vs.glsl',
  fs: 'shader/texture.fs.glsl',
  vs_phong: 'shader/phong.vs.glsl',
  fs_phong: 'shader/phong.fs.glsl',
  vs_single: 'shader/empty.vs.glsl',
  fs_single: 'shader/empty.fs.glsl',
  floortexture: 'models/grasslight.jpg'
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
  //set buffers for cube
  //initCubeBuffer();

  //create scenegraph
  root = createSceneGraph(gl, resources);
  initInteraction(gl.canvas);
}

function createSceneGraph(gl,resources){
const root = new ShaderSGNode(createProgram(gl, resources.vs_phong, resources.fs_phong));
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
  floor.textureunit = 2;
  grass.append(new TransformationSGNode(glm.transform({ translate: [0,-1.5,0], rotateX: -90, scale: 3}), [
    floor
  ]));
  let light = new LightNode();
  light.ambient = [0,0,0,1];
  light.diffuse = [1,1,1,1];
  light.specular = [1,1,1,1];
  light.position = [0,3,2];
  light.append(createLightSphere())
  root.append(light);
  createRobot(root);
  return root;
}


function createRobot(rootNode) {
  cubeNode = new MaterialNode([new RenderSGNode(makeCube(2,2,2))]);
  cubeNode.ambient = [0.24725, 0.1995, 0.0745, 1];
  cubeNode.diffuse = [0.75164, 0.60648, 0.22648, 1];
  cubeNode.specular = [0.628281, 0.555802, 0.366065, 1];
  cubeNode.shininess = 0.4;

  pyramidNode = new MaterialNode([new RenderSGNode(makePyramid())])
  pyramidNode.ambient = [0.24725, 0.1995, 0.0745, 1];
  pyramidNode.diffuse = [0.75164, 0.60648, 0.22648, 1];
  pyramidNode.specular = [0.628281, 0.555802, 0.366065, 1];
  pyramidNode.shininess = 0.4;

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
  headTransformationNode = (new TransformationSGNode(glm.transform({translate: [0.3, 2.2, 0], scale: [2, 2, 2]}),sphereNode))
  robotTransformationNode.append(headTransformationNode);

  //left leg
  leftLegTransformationNode = new TransformationSGNode(glm.transform({translate: [0.5,-0.5,0], scale: [0.1,1,0.1]}),cubeNode)
  robotTransformationNode.append(leftLegTransformationNode, cubeNode);

  //right leg
  rightLegtTransformationNode = new TransformationSGNode(glm.transform({translate: [0,-0.5,0], scale: [0.1,1,0.1]}),cubeNode)
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

  setAnimationParameters(timeInMilliseconds, deltaTime);

  moveRobot();

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);

  let lookatVec = vec3.add(vec3.create(), cameraPos, cameraFront);
  let lookAtMatrix = mat4.lookAt(mat4.create(), cameraPos, lookatVec, cameraUp);

  context.viewMatrix = lookAtMatrix;

  context.timeInMilliseconds = timeInMilliseconds;

  //TASK 0-2 rotate whole scene according to the mouse rotation stored in
  //camera.rotation.x and camera.rotation.y
  //context.sceneMatrix = mat4.create();
  //robotTransformationNode.matrix = glm.rotateY(animatedAngle/2);
  //context.sceneMatrix = mat4.multiply(mat4.create(),
  //                          glm.rotateY(camera.rotation.x),
  //                          glm.rotateX(camera.rotation.y));
  root.render(context);

  //request another render call as soon as possible
  requestAnimationFrame(render);

  //animate based on elapsed time
  animatedAngle = timeInMilliseconds/10;
}

function setAnimationParameters(timeInMilliseconds) {

  var delta = timeInMilliseconds - prevTime;
  prevTime = timeInMilliseconds;

  if (timeInMilliseconds < sceneOne) {
    robotMoving = true;
    robotMovement -= 0.05;
  } else if (timeInMilliseconds >= sceneOne && timeInMilliseconds < sceneTwo) {
    robotMoving = false;
    //robotMovement -= 0,05;
  } else if (timeInMilliseconds >= sceneTwo && timeInMilliseconds < movieEnd) {
    robotMoving = true;
    robotMovement += 0.05;
  } else if (timeInMilliseconds >= movieEnd) {
    robotMoving = false;
  }

}

function moveRobot() {
  if (robotMoving) {
    //update transformation of robot for walking animation
    robotTransformationNode.matrix = glm.transform({translate: [0,0,robotMovement]})

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

    //robotMovement -= 0.05
  }
}

function moveRobotToPos() {

}

/**
 * returns a new rendering context
 * @param gl the gl context
 * @param projectionMatrix optional projection Matrix
 * @returns {ISceneGraphContext}
 */
function createSceneGraphContext(gl, shader) {

  //create a default projection matrix
  projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, aspectRatio, 0.01, 10);
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
  var eye = [0,3,5];
  var center = [0,0,0];
  var up = [0,1,0];
  viewMatrix = mat4.lookAt(mat4.create(), eye, center, up);
  return viewMatrix;
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

function makeFloor() {
  var floor = makeRect(2, 2);
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
        resetCamera();
        break;
      case "KeyW":
      case "ArrowUp":
      case "Numpad8":
        moveForward(velocity);
        break;
      case "KeyA":
      case "ArrowLeft":
      case "Numpad4":
        strafeLeft(velocity);
        break;
      case "KeyS":
      case "ArrowDown":
      case "Numpad2":
        moveBackward(velocity);
        break;
      case "KeyD":
      case "ArrowRight":
      case "Numpad6":
        strafeRight(velocity);
        break;
      default:

    }
  });
}

function updateCameraVectors() {
  // calc new front vec
  cameraFront[0] = Math.cos(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  cameraFront[1] = Math.sin(glm.deg2rad(pitch));
  cameraFront[2] = Math.sin(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  vec3.normalize(cameraFront, cameraFront);
  // recalculate right- and upvector
  vec3.normalize(cameraRight, vec3.cross(vec3.create(), cameraFront, upvector));
  vec3.normalize(cameraUp, vec3.cross(vec3.create(), cameraRight, cameraFront));
}

function resetCamera() {
  setCameraPosAndLookAt(vec3.fromValues(0, -2, -10), vec3.fromValues(0, 0, 0));
  pitch = 0;
  yaw = -90;
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

function setCameraPosAndLookAt(toPos, toLook) {
  cameraPos = toPos;
  cameraUp = vec3.fromValues(0, 1, 0);
  vec3.add(cameraFront, cameraPos, toLook);
}
