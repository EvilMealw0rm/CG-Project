precision mediump float;

//Passed in from the vertex shader
varying vec2 v_texCoord;

//The texture
uniform sampler2D u_tex;

void main(){
  gl_FragColor = texture2D(u_tex, v_texCoord);
}
