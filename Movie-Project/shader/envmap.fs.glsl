
precision mediump float;

varying vec3 v_normalVec;
varying vec3 v_cameraRayVec;

uniform bool u_useReflection;

uniform samplerCube u_texCube;

void main() {
  vec3 normalVec = normalize(v_normalVec);
	vec3 cameraRayVec = normalize(v_cameraRayVec);

  vec3 texCoords;
  if(u_useReflection)
      // compute reflected camera ray
  		texCoords  = reflect(cameraRayVec, normalVec);
  else
  		texCoords = cameraRayVec;

  gl_FragColor = textureCube(u_texCube, texCoords);
}
