/*
 * @Autor: CPB
 * @Date: 2022-03-22 20:39:33
 * @LastEditors: CPB
 * @Description:https://zhuanlan.zhihu.com/p/109555689
 */
import * as THREE from "three";

let loader = new THREE.FileLoader();
export default class GunagDdongMap {
  constructor() {
    loader.load(
      "/src/assets/map/guangdong.json",
      (data) => {
        let jsonData = JSON.parse(data);
        this.instance = this.initMap(jsonData); // 解析并绘制地图
      },
      (value) => {
        console.log("process", value);
      },
      (err) => {
        console.log("err", err);
      }
    );
  }

  initMap(chinaJson) {
    // 建一个空对象存放对象
    this.map = new THREE.Object3D();

    let _this = this;

    // 墨卡托投影转换
    const projection = d3
      .geoMercator()
      .center([104.0, 37.5])
      .scale(80)
      .translate([0, 0]);

    chinaJson.features.forEach((elem) => {
      // 定一个省份3D对象
      const province = new THREE.Object3D();
     
      // 每个的 坐标 数组
      const coordinates = elem.geometry.coordinates;
      // 循环坐标数组
      coordinates.forEach((multiPolygon) => {
        multiPolygon.forEach((polygon) => {
          const shape = new THREE.Shape();
          const lineMaterial = new THREE.LineBasicMaterial({ color: "white" });
          const lineGeometry = new THREE.Geometry();

          for (let i = 0; i < polygon.length; i++) {
            const [x, y] = projection(polygon[i]);
            if (i === 0) {
              shape.moveTo(x, -y);
            }
            shape.lineTo(x, -y);
            lineGeometry.vertices.push(new THREE.Vector3(x, -y, 4.01));
          }

          const extrudeSettings = {
            depth: 4,
            bevelEnabled: false,
          };

          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const material = new THREE.MeshBasicMaterial({
            color: "#02A1E2",
            transparent: true,
            opacity: 0.6,
          });
          const material1 = new THREE.MeshBasicMaterial({
            color: "#3480C4",
            transparent: true,
            opacity: 0.5,
          });
          const mesh = new THREE.Mesh(geometry, [material, material1]);
          const line = new THREE.Line(lineGeometry, lineMaterial);
          province.add(mesh);
          province.add(line);
        });
      });
      
      // 将geo的属性放到省份模型中
      province.properties = elem.properties;
      if (elem.properties.contorid) {
        const [x, y] = projection(elem.properties.contorid);
        province.properties._centroid = [x, y];
      }
      
      _this.map.add(province);

      return _this.map 
    });
  }
}
