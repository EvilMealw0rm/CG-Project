/**
 * as simple fragment shader to look up coordinates in the particle texture
 */

precision mediump float;

uniform sampler2D u_tex;

varying vec2 v_texCoord;

void main() {

  vec4 textureColor = vec4(0, 0, 0, 1);
  textureColor = texture2D(u_tex, v_texCoord);

  gl_FragColor = textureColor;

}
