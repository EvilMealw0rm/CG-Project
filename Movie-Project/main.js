//the OpenGL context
var gl = null;

var canvasWidth = 1600;
var canvasHeight = 900;
var aspectRatio = canvasWidth / canvasHeight;

// camera values
var cameraPos = vec3.fromValues(0, 0, 3);
var cameraFront = vec3.fromValues(0, 0, -1);
var cameraUp = vec3.fromValues(0, 1, 0);
var cameraRight = vec3.fromValues(0, 0, 0);
var pitch = 0;
var yaw = -90;
var sensitivity = 0.05;

var yawNeutral = vec3.clone(cameraFront);
var lookatVec = vec3.fromValues(0, 0, 0);

// rotation for the sun
var rotateLight;

var deltaTime = 0;
var prevTime = 0;

// timestamps
var sceneOne = 10000;
var sceneTwo = 20000;
var movieEnd = 30000;

var doorOpeningTime = 4000;
var boatRotationTime = 3000;
var turnToJumpTime = 3000;
var jumpUpTime = turnToJumpTime + 1000;
var fallDownTime = jumpUpTime + 2000;
var boatSinkingTime = 4000;

// animation
var autoPilot = true;
var animationPos = vec3.fromValues(0, 0, 0);
var animationLookAt = vec3.fromValues(0, 0, 0);

var animationRunning = true;

// constant upvector
const upvector = vec3.fromValues(0, 1, 0);

// rendering context
var context;

// particles
const particleLife = 1000;
const maxParticles = 5000;
var particles = [];
var particleNodes = [];
var waterParticleNode;

// framebuffer variables
var renderTargetFramebuffer;
var framebufferWidth = 512;
var framebufferHeight = 512;

// camera and projection settings
var animatedAngle = 0;
var legRotationAngle = 0;
var fieldOfViewInRadians = convertDegreeToRadians(30);
var nearClipPlane = 0.01;
var farClipPlane = 500;

// size of skybox
var skyBoxRadius = 250;

// POI
var startPoint = vec3.fromValues(2, 0, -20);
var checkPoint1 = vec3.fromValues(1, 0, 36);
var checkPoint2 = vec3.fromValues(20, 0, 95);

var cameraStartpoint = vec3.fromValues(-18, 12, 5);
var cameraCheckpoint1 = vec3.fromValues(-20, 5, 25);
var cameraCheckpoint2 = vec3.fromValues(55, 10, 85);
var cameraCheckpoint3 = vec3.fromValues(0, 0, 0);

var rotationCheck1toCheck2 = 180 / Math.PI * vec3.angle(
  [1, 0, 1],
  [checkPoint2[0], 0 , checkPoint2[2]]);

// robot variables
var robotMoving = false;
var robotMovement = vec3.clone(startPoint);
var legUp = true;
var robotRotationX = 0;
var robotRotationY = 0;
var roboJumpPoint0 = checkPoint2;
var roboJumpPoint1 = vec3.add(vec3.create(), roboJumpPoint0, vec3.fromValues(Math.sin(rotationCheck1toCheck2) * 3, 3, Math.sin(rotationCheck1toCheck2) * -3));
var roboJumpPoint2 = vec3.sub(vec3.create(), roboJumpPoint1, vec3.fromValues(Math.sin(rotationCheck1toCheck2) * -3, 10, Math.sin(rotationCheck1toCheck2) * 3));
var robotTransformationNode;
var headTransformationNode;
var leftLegTransformationNode;
var rightLegtTransformationNode;

// boat variables
var boatMovement = vec3.fromValues(1, -1.5, 37);
var boatTransformatioNode;
var boatRotationY = 0;
var boatWiggle = 0;
var wiggle = true;
var wiggleMax = 10;

// waterfall variables
var waterfallAnimation = 0;
var waterfallPos = vec3.fromValues(20, 3, 100);

//door vaiables
var door;
var doorRotationY = 0;

//textures
var floorTexture;

//scenegraph nodes
var root = null;

/**
* load the shaders, textures and models using a utility function
*/
loadResources({
  vs: 'shader/texture.vs.glsl',
  fs: 'shader/texture.fs.glsl',
  vs_animated_texture: 'shader/animated_texture.vs.glsl',
  vs_env: 'shader/envmap.vs.glsl',
  fs_env: 'shader/envmap.fs.glsl',
  vs_phong: 'shader/phong.vs.glsl',
  fs_phong: 'shader/phong.fs.glsl',
  vs_light: 'shader/light.vs.glsl',
  fs_light: 'shader/light.fs.glsl',
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
  brick_texture: 'models/brickwall_texture.jpg',
  roof_texture: 'models/roof_texture.png',
  door_texture: 'models/door_texture.jpg',
  floor_texture: 'models/floor_texture.jpg',
  roboter_texture: 'models/metal.jpg',
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

/**
* Creates the scenegraph
*/
function createSceneGraph(gl,resources){
  const root = new ShaderSGNode(createProgram(gl, resources.vs_phong, resources.fs_phong));

  {
    skyboxTransformNode = new TransformationSGNode(mat4.create());
    var skybox = new ShaderSGNode(createProgram(gl, resources.vs_env, resources.fs_env), [
      skyboxTransformNode,
        new EnvironmentSGNode(envcubetexture, 4, false,
          new RenderSGNode(makeSphere(skyBoxRadius)))
    ]);
    root.append(skybox);
  }

  const grass = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs));
  root.append(grass);
    let floor = new AdvancedTextureSGNode(resources.floortexture,
                new RenderSGNode(makeFloor())
              );

  grass.append(new TransformationSGNode(glm.transform({
    translate: [0,-1.5,0],
    rotateX: -90,
    scale: [5,3,3]
  }), [floor]));

  let water = new AdvancedTextureSGNode(resources.water_texture,
              new RenderSGNode(makeFloor()))
  grass.append(new TransformationSGNode(glm.transform({
    translate: [0,-1.5,80],
    rotateX: -90,
    scale: [5,5,7]
  }), [water]));

  let light = new LightNode();
  light.ambient = [0,0,0,1];
  light.diffuse = [1,1,1,1];
  light.specular = [1,1,1,1];
  light.position = [0,3,2];
  light.append(createLightSphere(0.2, resources))

  rotateLight = new TransformationSGNode(mat4.create());
  let translateLight = new TransformationSGNode(glm.translate(0,10,80));

  rotateLight.append(translateLight);
  translateLight.append(light);
  root.append(rotateLight);

  boatTransformatioNode = new TransformationSGNode(glm.transform({
    translate: [boatMovement[0], boatMovement[1], boatMovement[2]],
    scale: [0.3,0.3,0.3]
    }), new RenderSGNode(resources.boat));
  let boat = new AdvancedTextureSGNode(resources.boat_texture, boatTransformatioNode);
  grass.append(boat);

  let animatedTexture = new ShaderSGNode(createProgram(gl, resources.vs_animated_texture, resources.fs));
  root.append(animatedTexture);

  let waterfall = new AnimatedTextureSGNode(resources.water_texture,
                  new TransformationSGNode(glm.transform({
                    translate: [waterfallPos[0], waterfallPos[1], waterfallPos[2]],
                    scale: [1,1,0.5]
                  }), new RenderSGNode(makeFloor())));
  animatedTexture.append(waterfall);

  createHouse(root, grass, resources);

  waterParticleNode = new TextureSGNode(resources.water_particle);
  let waterfallShaderNode =new ShaderSGNode(createProgram(gl, resources.vs_particle, resources.fs_particle));
  root.append(waterfallShaderNode);
  waterfallShaderNode.append(new TransformationSGNode(glm.transform({
    translate: [waterfallPos[0] - 10, waterfallPos[1] - 4.5, waterfallPos[2]],
    scale: 2.5
    }), waterParticleNode));

  let robotTextureNode = new AdvancedTextureSGNode(resources.roboter_texture);
  grass.append(robotTextureNode);

  let stone = new MaterialSGNode(new TransformationSGNode(glm.transform({translate: [5,-1,3], scale:2}),
    new RenderSGNode(makeSphere(0.4,4,4,))))
  //ruby
  stone.ambient = [0.1745,	0.01175,	0.01175,	1];
  stone.diffuse = [0.61424,	0.04136,	0.04136, 1];
  stone.specular = [0.727811,	0.626959,	0.626959, 1];
  stone.shininess = 0.6;
  root.append(stone);

  createRobot(robotTextureNode, resources);
  return root;
}

function createLightSphere(radius, resources) {
  return new ShaderSGNode(createProgram(gl, resources.vs_light, resources.fs_light), [
    new RenderSGNode(makeSphere(radius,10,10))
  ]);
}

/**
* Initializes the cubemap
*/
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
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //set correct image for each side of the cube map
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_x);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_x);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_y);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_y);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_pos_z);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.env_neg_z);
  //generate mipmaps
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  //unbind the texture again
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

/**
* Creates the robot
*/
function createRobot(rootNode, resources) {
  cubeNode = new RenderSGNode(makeCube(2,2,2));

  pyramidNode = new RenderSGNode(makePyramid());

  //transformations of whole body
  bodyNode =  new TransformationSGNode(glm.transform({
    translate: [0.3,0.8,0]
  }), pyramidNode);

  robotTransformationNode = new TransformationSGNode(mat4.create(),[bodyNode]);
  rootNode.append(robotTransformationNode);

  //head
  sphereNode = new RenderSGNode(makeSphere(.2,10,10));

  headTransformationNode = (new TransformationSGNode(glm.transform({
    translate: [0.3, 2.2, 0],
    scale: [2, 2, 2]
  }),sphereNode));

  robotTransformationNode.append(headTransformationNode);

  //left leg
  leftLegTransformationNode = new TransformationSGNode(glm.transform({
    translate: [0.5,-0.5,0],
    scale: [0.1,1,0.1]
  }),cubeNode);
  robotTransformationNode.append(leftLegTransformationNode, cubeNode);

  //right leg
  rightLegtTransformationNode = new TransformationSGNode(glm.transform({
    translate: [0,-0.5,0],
    scale: [0.1,1,0.1]
  }),cubeNode);
  robotTransformationNode.append(rightLegtTransformationNode);

  // right arm
  rightArmTransformationNode = new TransformationSGNode(glm.transform({
    translate: [1,1.5,0],
    scale: [0.6,0.1,0.1]
  }),cubeNode);
  robotTransformationNode.append(rightArmTransformationNode);

  //left arm
  leftArmTransformationNode = new TransformationSGNode(glm.transform({
    translate: [-0.4,1.5,0],
    scale: [0.6,0.1,0.1]
  }),cubeNode);
  robotTransformationNode.append(leftArmTransformationNode);
}

/**
* Creates the house
*/
function createHouse(phongroot, rootNode, resources){
  let house =new AdvancedTextureSGNode(resources.brick_texture);
  rootNode.append(house);

  let backwall =  new TransformationSGNode(glm.transform({translate: [0,5,-30]}),
    new RenderSGNode(makeRect(10,10)));
  house.append(backwall)

  let leftwall = new TransformationSGNode(glm.transform({translate: [-10,5,-20], rotateY: 90}),
    	new RenderSGNode(makeRect(10,10)));
  house.append(leftwall);

  let rightwall = new TransformationSGNode(glm.transform({translate: [10,5,-20], rotateY: 90}),
    new RenderSGNode(makeRect(10,10)));
  house.append(rightwall);

  let roof = new AdvancedTextureSGNode(resources.roof_texture,
    new TransformationSGNode(glm.transform({translate: [0,25,-20]}),
    new RenderSGNode(makePyramid(10,10,10))));
  rootNode.append(roof);

  let frontwall1 = new TransformationSGNode(glm.transform({translate: [7,5,-10]}),
    new RenderSGNode(makeRect(3,10)));
  house.append(frontwall1);

  let frontwall2 = new TransformationSGNode(glm.transform({translate: [-3,11,-10]}),
    new RenderSGNode(makeRect(7,4)));
  house.append(frontwall2);

  let frontwall3 = new TransformationSGNode(glm.transform({translate: [-5,1,-10]}),
    new RenderSGNode(makeRect(5,3)));
  house.append(frontwall3);

  let frontwall4 = new TransformationSGNode(glm.transform({translate: [-8.5,5.5,-10]}),
    new RenderSGNode(makeRect(1.5,1.5)));
  house.append(frontwall4);

  let frontwall5 = new TransformationSGNode(glm.transform({translate: [-1.5,5.5,-10]}),
    new RenderSGNode(makeRect(1.5,1.5)));
  house.append(frontwall5);

  door =  new TransformationSGNode({translate: [4,-1.5,-10]},
    new AdvancedTextureSGNode(resources.door_texture,
    new RenderSGNode(makeAdvancedRectangle(4,4,8.5))));
  house .append(door);

  let glass = new AlphaNode(new TransformationSGNode(glm.transform({translate: [-5,5.5,-10]}),
    new RenderSGNode(makeRect(2,1.5))))

  glass.ambient = [0.2, 0.2, 0.2, 1];
  glass.diffuse = [0.8, 0.8, 0.8, 1];
  glass.specular = [0.1, 0.1, 0.1, 1];
  glass.shininess = 0.3;

  phongroot.append(glass);

  let houseFloor = new AdvancedTextureSGNode(resources.floor_texture,
    new TransformationSGNode(glm.transform({translate: [0,-1.4,-20],  rotateX: -90}),
    new RenderSGNode(makeRect(10,10))))
  house.append(houseFloor);
}

/**
 * render one frame
 */
function render(timeInMilliseconds) {

  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(root.program);

  // Waterfall updates
  createWaterfall(timeInMilliseconds);

  // Do the animations
  setAnimationParameters(timeInMilliseconds);

  // Remember to open the door
  moveDoor();

  // Remember to move the robot
  moveRobot();

  // Remember to move the boat
  moveBoat();

  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, aspectRatio, nearClipPlane, farClipPlane);

  lookatVec = vec3.add(vec3.create(), cameraPos, cameraFront);
  let lookAtMatrix = mat4.lookAt(mat4.create(), cameraPos, lookatVec, upvector);

  context.viewMatrix = lookAtMatrix;

  context.timeInMilliseconds = timeInMilliseconds;

  //get inverse view matrix to allow to compute viewing direction in world space for environment mapping
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

  root.render(context);
  //request another render call as soon as possible
  requestAnimationFrame(render);
}

/**
* Animation magic happens in this function
* Moving objects and animate cameraflight
*/
function setAnimationParameters(timeInMilliseconds) {

  // rotate like a flat earth sun (but in reality the earth is a geoid)
  rotateLight.matrix = glm.transform({rotateY: timeInMilliseconds * 0.025});


  if (!animationRunning) {
    displayText("Movie ended");
    autoPilot = false;
    return;
  }

  // Robot movement
  if (timeInMilliseconds < doorOpeningTime) {
    //door movement
    doorRotationY = calculateRotation(timeInMilliseconds, doorRotationY, 120, 350, 0, doorOpeningTime);
  } else if (timeInMilliseconds >= doorOpeningTime && timeInMilliseconds < sceneOne) {
    // roboter walks to boat
    robotMoving = true;
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, startPoint, checkPoint1, doorOpeningTime, sceneOne);
  } else if (timeInMilliseconds >= sceneOne && timeInMilliseconds < sceneTwo - sceneOne + boatRotationTime) {
    // roboter and boat turn to waterfall
    robotMoving = false;
    boatRotationY = calculateRotation(timeInMilliseconds, boatRotationY, 0, rotationCheck1toCheck2, sceneOne, sceneOne + boatRotationTime);
    robotRotationY = calculateRotation(timeInMilliseconds, robotRotationY, 0, rotationCheck1toCheck2, sceneOne, sceneOne + boatRotationTime);
  } else if (timeInMilliseconds >= sceneOne + boatRotationTime && timeInMilliseconds < sceneTwo) {
    // boat and roboter move to waterfall
    robotMoving = false;
    boatMovement = move3DVector(timeInMilliseconds, boatMovement,
      [checkPoint1[0], checkPoint1[1] - 1.25, checkPoint1[2]],
      [checkPoint2[0], checkPoint2[1] - 1.25, checkPoint2[2]],
      sceneOne + boatRotationTime, sceneTwo);
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, checkPoint1,
      checkPoint2, sceneOne + boatRotationTime, sceneTwo);
  } else if (timeInMilliseconds >= sceneTwo && timeInMilliseconds < sceneTwo + turnToJumpTime) {
    // roboter turns to jump
    displayText("Special effect: Particles")
    robotRotationY = calculateRotation(timeInMilliseconds, robotRotationY, rotationCheck1toCheck2, rotationCheck1toCheck2 + 90, sceneTwo, sceneTwo + turnToJumpTime);
  } else if (timeInMilliseconds >= sceneTwo + turnToJumpTime && timeInMilliseconds < sceneTwo + jumpUpTime) {
    // roboter jumps up
    displayText("Special effect: Particles")
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, roboJumpPoint0, roboJumpPoint1, sceneTwo + turnToJumpTime, sceneTwo + jumpUpTime);
  } else if (timeInMilliseconds >= sceneTwo + jumpUpTime && timeInMilliseconds < sceneTwo + fallDownTime) {
    // roboter jumps down
    displayText("Special effect: Particles")
    robotMovement = move3DVector(timeInMilliseconds, robotMovement, roboJumpPoint1, roboJumpPoint2, sceneTwo + jumpUpTime, sceneTwo + fallDownTime);
  } else if (timeInMilliseconds >= sceneTwo + fallDownTime && timeInMilliseconds < movieEnd) {
    // boat sinks under water
    displayText("Special effect: Particles")
    boatMovement = move3DVector(timeInMilliseconds, boatMovement,
      [checkPoint2[0], checkPoint2[1] - 1.25, checkPoint2[2]],
      [checkPoint2[0], checkPoint2[1] - 4.25, checkPoint2[2]],
      sceneTwo + fallDownTime, movieEnd);
  } else if (timeInMilliseconds >= movieEnd) {
    // movie over
    animationRunning = false;
  }

  // Camera flight
  if (timeInMilliseconds < doorOpeningTime) {
    // wait for door to open
    animationLookAt = vec3.clone(startPoint);
    animationPos = vec3.clone(cameraStartpoint);
  } else if (timeInMilliseconds >= doorOpeningTime && timeInMilliseconds < sceneOne) {
    // follow roboter to boat
    animationLookAt = move3DVector(timeInMilliseconds, animationLookAt, startPoint, checkPoint1, doorOpeningTime, sceneOne);
    animationPos = move3DVector(timeInMilliseconds, animationPos, cameraStartpoint, cameraCheckpoint1, doorOpeningTime, sceneOne);
  } else if (timeInMilliseconds >= sceneOne && timeInMilliseconds < sceneTwo - sceneOne + boatRotationTime) {
    // wait for boat and roboter to move
    animationLookAt = vec3.clone(checkPoint1);
    animationPos = vec3.clone(cameraCheckpoint1);
  } else if (timeInMilliseconds >= sceneOne + turnToJumpTime && timeInMilliseconds < sceneTwo) {
    // fly to final position
    animationLookAt = move3DVector(timeInMilliseconds, animationLookAt, checkPoint1, checkPoint2, sceneOne + turnToJumpTime, sceneTwo);
    animationPos = move3DVector(timeInMilliseconds, animationPos, cameraCheckpoint1, cameraCheckpoint2, sceneOne + turnToJumpTime, sceneTwo);
  } else if (timeInMilliseconds >= sceneTwo + 5000 && timeInMilliseconds < movieEnd) {
    // have a nice cold pint and wait for all of this to blow over ;)
  }

  // set cameraposition if autoPilot is active
  if (autoPilot) {
    setCameraPosAndLookAt(animationPos, animationLookAt);
  }

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

/**
* Increases a value from start to end beginning at starttime and ending at endtime
*/
function calculateRotation(currentTime, rotationParameter, start, end, starttime, endtime) {
  rotationParameter = start + (currentTime - starttime) * ((end - start) / (endtime - starttime));
  return rotationParameter;
}

/**
* Advanced rectangle to have the turning point at the edge of the rectangle
*/
function makeAdvancedRectangle(length, width, height, offset) {
    width = width || 1;
    height = height || 1;
    length = length || 1;
    offset = offset || 0;
    var position = [0, 0, 0, length, 0, 0, width + offset, height, 0, offset, height, 0];
    var normal = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    var texture = [0, 0 /**/ , 1, 0 /**/ , 1, 1 /**/ , 0, 1];
    var index = [0, 1, 2, 2, 3, 0];
    return {
        position: position,
        normal: normal,
        texture: texture,
        index: index
    };
}

/**
* Opens the door if rotation value has changed
*/
function moveDoor(){
  door.matrix = glm.transform({
      rotateY: doorRotationY,
      translate: [4,-1.5,-10]
  })

}

/**
* Moves the robot and simulates walking
*/
function moveRobot() {
  //update transformation of robot for walking animation
  robotTransformationNode.matrix = glm.transform({
    rotateY: robotRotationY,
    rotateX: robotRotationX,
    translate: [robotMovement[0],robotMovement[1],robotMovement[2]]});
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

/**
* Moves a boat and adds a wiggle to simulate waves
*/
function moveBoat() {
  if (boatWiggle >= wiggleMax || boatWiggle <= -wiggleMax) {
    wiggle = !wiggle;
  }
  if (wiggle) {
    boatWiggle += 0.1;
  } else {
    boatWiggle -= 0.1;
  }
  boatTransformatioNode.matrix = glm.transform({rotateZ: boatWiggle, rotateY: boatRotationY, translate: [boatMovement[0], boatMovement[1], boatMovement[2]], scale: [0.3, 0.3, 0.3]});
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

function makeFloor() {
  var floor = makeRect(10, 10);
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

/**
* a scene graph node for setting environment mapping parameters
*/
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


class AlphaNode extends MaterialSGNode{
  constructor(children){
    super(children);
  }

  render(context){
    const gl = context.gl,
      shader = context.shader;
    gl.uniform1f(gl.getUniformLocation(shader, 'u_alpha'),0.6);
    gl.uniform1i(gl.getUniformLocation(shader, 'u_enableBlending'), 1);
    super.render(context);
    gl.uniform1i(gl.getUniformLocation(shader, 'u_enableBlending'), 0);
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

/**
* A scenegraph node for setting texture parameters
*/
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

/**
* A scene graph node for setting texture animation parameter
*/
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
* Creates the waterfall with particles
*/
function createWaterfall(timeInMilliseconds) {
  waterfallAnimation += 0.01;
  createParticles(timeInMilliseconds);
}

/**
* Creates and updates the particles
*/
function createParticles(timeInMilliseconds) {
  if (particleNodes.length < maxParticles) {
    // create the particle
    // TODO: adjust parameters accordingly to the final "waterfall"
    let particle = new ParticleNode(makeSphere(0.02, 50, 50), timeInMilliseconds, [Math.random() * 8, Math.random() / 3, 0], [Math.random() / 2, Math.random(), Math.random() / 2], 0.0005);
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


/**
* Control user input
*/
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
    if (mouse.leftButtonDown && !autoPilot) {
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

    //console.log(event.code + " key pressed");

    // reacto to the user input, only move camera when autoPilot is false
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

/**
* Creates the waterfall with particles
*/
function updateCameraVectors() {
  // calc new front vec
  cameraFront[0] = Math.cos(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  cameraFront[1] = Math.sin(glm.deg2rad(pitch));
  cameraFront[2] = Math.sin(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
  vec3.normalize(cameraFront, cameraFront);
  // recalculate right-vec
  recalculateRightVec();
}

/**
* Resets the camera to origin
*/
function resetCamera() {
  setCameraPosAndLookAt(vec3.clone(cameraStartpoint), vec3.clone(startPoint));
}

/**
* Reaction if the camera was moved with the mouse
*/
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

/**
* Recalculates the right vector to be able to strafe accordingly
*/
function recalculateRightVec() {
  vec3.normalize(cameraRight, vec3.cross(vec3.create(), cameraFront, upvector));
}

/**
* Moves the camera forwards
*/
function moveForward(velocity) {
  vec3.add(cameraPos, cameraPos, cameraFront);
}

/**
* Moves the camera backwards
*/
function moveBackward(velocity) {
  vec3.sub(cameraPos, cameraPos, cameraFront);
}

/**
* Strafe left with the camera
*/
function strafeLeft(velocity) {
  vec3.sub(cameraPos, cameraPos, cameraRight);
}

/**
* Strafe right with the camera
*/
function strafeRight(velocity) {
  vec3.add(cameraPos, cameraPos, cameraRight);
}

/**
* Sets Camera to a position
*/
function setCameraPos(toPos) {
  cameraPos = vec3.clone(toPos);
  updateCameraVectors();
}

/**
* Set the camera to toPos and look at lookAt
* Rightvec, yaw and pitch are updated accordingly
*/
function setCameraPosAndLookAt(toPos, lookAt) {
  setCameraPos(toPos);
  vec3.sub(cameraFront, lookAt, toPos);
  recalculateRightVec();
  recalculateYawAndPitch();
  updateLookAtVector(lookAt);
}

/**
* Calculates the yaw and pitch of the current orientation of the camera
* Looking direction wouldn't be correct withouth this function if the autoPilot
* was disabled
*/
function recalculateYawAndPitch() {
  var yawAngle = vec3.angle(vec3.fromValues(cameraFront[0], 0, cameraFront[2]), yawNeutral) * 180 / Math.PI;
  var pitchAngle = vec3.angle(vec3.fromValues(cameraFront[0], cameraFront[1], 0), upvector) * 180 / Math.PI;
  if(cameraFront[0] < 0) {
    yawAngle *= -1;
  }
  yaw = yawAngle - 90;
  pitch = 90 - pitchAngle;
}

/**
* Update the lookat vector
*/
function updateLookAtVector(toLookAt) {
  lookatVec = vec3.clone(toLookAt);
}
