/**
 * a phong shader implementation
 * Created by Samuel Gratzl on 29.02.2016.
 */
precision mediump float;

/**
 * definition of a material structure containing common properties
 */
struct Material {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
	vec4 emission;
	float shininess;
};

/**
 * definition of the light properties related to material properties
 */
struct Light {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
};

uniform Material u_material;

uniform Light u_light;

//varying vectors for light computation
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec3 v_light2Vec;

//alpha parameters
uniform float u_alpha;
uniform bool u_enableBlending;

vec4 calculateSimplePointLight(Light light, Material material, vec3 lightVec,
																vec3 normalVec, vec3 eyeVec) {
	lightVec = normalize(lightVec);
	normalVec = normalize(normalVec);
	eyeVec = normalize(eyeVec);

	//compute diffuse term
	float diffuse = max(dot(normalVec, lightVec), 0.0);

	//compute specular term
	vec3 reflectVec = reflect(-lightVec, normalVec);
	float spec = pow( max( dot(reflectVec, eyeVec), 0.0), material.shininess);

	//use term an light to compute the components
	vec4 c_amb  = clamp(light.ambient*material.ambient, 0.0, 1.0);
	vec4 c_diff = clamp(diffuse*light.diffuse*material.diffuse, 0.0, 1.0);
	vec4 c_spec = clamp(spec*light.specular*material.specular, 0.0, 1.0);
	vec4 c_em   = material.emission;

	return c_amb + c_diff + c_spec + c_em;
}

void main() {
	vec4 color = calculateSimplePointLight(u_light, u_material, v_lightVec,
																						v_normalVec, v_eyeVec);
	if(u_enableBlending){
		gl_FragColor = color*u_alpha ;
	}
	else
		gl_FragColor = color;

}
