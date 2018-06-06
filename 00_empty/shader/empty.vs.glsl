/**
 * empty basic vertex shader
 */
 // the position of the point
 attribute vec3 a_position;

 //the color of the point
 //attribute vec3 a_color;

 //varying vec3 v_color;

 uniform mat4 u_modelView;
 uniform mat4 u_projection;
 uniform mat3 u_normalMatrix;


//like a C program main is the main function
void main() {
  vec4 eyePosition = u_modelView * vec4(a_position,1);
  gl_Position = u_projection * eyePosition;

  //just copy the input color to the output varying color
//  v_color = a_color;
}
