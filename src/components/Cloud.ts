/*
 * @Autor: CPB
 * @Date: 2022-03-21 19:27:12
 * @LastEditors: CPB
 * @Description: 云
 */

import * as THREE from "three";
const texture = new THREE.TextureLoader().load("/src/assets/resource/clound.png"); //加载云朵素材
const cloudGeo = new THREE.PlaneBufferGeometry(56.4, 30.0); //创建平面几何体
const cloudMaterial = new THREE.MeshLambertMaterial({
  //图像作为纹理贴图，生成材质
  map: texture,
  transparent: true,
});
export default class Cloud {
  constructor() {
    const cloud = new THREE.Mesh(cloudGeo, cloudMaterial); //生成云朵物体
    cloud.material.opacity = 0.6;
    this.instance = cloud;
  }

  setPosition(x, y, z) {
    this.instance.position.set(x, y, z);
  }

  setRotation(x, y, z) {
    this.instance.rotation.x = x;
    this.instance.rotation.y = y;
    this.instance.rotation.z = z;
  }

  animate() {
    this.instance.rotation.z -= 0.003; //云朵的运动是不断绕着z轴旋转
  }
}
