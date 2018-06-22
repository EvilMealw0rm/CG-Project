// animated Vertex Shader

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_invView;

uniform vec3 u_lightPos;

uniform float u_texture_transform;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;

varying vec2 v_texCoord;

void main() {
	vec4 eyePosition = u_modelView * vec4(a_position,1);

  v_normalVec = u_normalMatrix * a_normal;

  v_eyeVec = -eyePosition.xyz;
	v_lightVec = u_lightPos - eyePosition.xyz;

  //animate the texture
	//vec3 new_texCoord = u_texture_transform*vec3(a_texCoord,1.0);
  v_texCoord = vec2(a_texCoord.x, a_texCoord.y + u_texture_transform);

	//v_texCoord = a_texCoord;

	gl_Position = u_projection * eyePosition;
}
