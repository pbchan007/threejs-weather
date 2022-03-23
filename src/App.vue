<template>
  <div ref="statsRef"></div>
  <div ref="threeRef"></div>
</template>

<script lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import {
  Scene,
  PerspectiveCamera,
  Vector3,
  AxesHelper,
  PlaneGeometry,
  // 新版本不支持
  Geometry,
  BufferGeometry,
  BufferAttribute,
  Points,
  MeshBasicMaterial,
  PointsMaterial,
  Mesh,
  BoxGeometry,
  IcosahedronBufferGeometry,
  SphereGeometry,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Color,
  AdditiveBlending,
  LineBasicMaterial,
  Shape,
  Line,
  // 光源
  SpotLight,
  PointLight,
  HemisphereLight,
  AmbientLight,
  RectAreaLight,
  LightShadow,
  PCFSoftShadowMap,
  Object3D,
  CameraHelper,
  WebGLRenderer,
  Clock,
  TextureLoader,
  FileLoader,
} from "three";

import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";

// 控制
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
let loader = new FileLoader();

// import snowTexture from "./assets/logo.png";
import snowTexture from "./assets/resource/snow.png";
import Cloud from "./components/Cloud";
import GunagDongMap from "./components/GunagDongMap";

import Stats from "stats.js";
// 控制组件
import { GUI, debounce } from "dat.gui";
import { throttle } from "lodash-es";

export default {
  name: "three",
  setup() {
    const statsRef = ref();
    const threeRef = ref();
    const GUIOptions = ref();

    const instance = getCurrentInstance();
    console.log("instance", instance);

    const initMap = (chinaJson) => {
      // 建一个空对象存放对象
      instance.map = new Object3D();

      // 墨卡托投影转换
      const projection = d3
        .geoMercator()
        .center([104.0, 37.5])
        .scale(80)
        .translate([0, 0]);

      chinaJson.features.forEach((elem) => {
        // 定一个省份3D对象
        const province = new Object3D();

        // 每个的 坐标 数组
        const coordinates = elem.geometry.coordinates;
        // 循环坐标数组
        coordinates.forEach((multiPolygon) => {
          multiPolygon.forEach((polygon) => {
            const shape = new Shape();
            const lineMaterial = new LineBasicMaterial({
              color: "white",
            });
            const lineGeometry = new Geometry();

            for (let i = 0; i < polygon.length; i++) {
              const [x, y] = projection(polygon[i]);
              if (i === 0) {
                shape.moveTo(x, -y);
              }
              shape.lineTo(x, -y);
              lineGeometry.vertices.push(new Vector3(x, -y, 4.01));
            }

            const extrudeSettings = {
              depth: 4,
              bevelEnabled: false,
            };

            const geometry = new ExtrudeGeometry(shape, extrudeSettings);
            const material = new MeshBasicMaterial({
              color: "#02A1E2",
              transparent: true,
              opacity: 0.6,
            });
            const material1 = new MeshBasicMaterial({
              color: "#3480C4",
              transparent: true,
              opacity: 0.5,
            });
            const mesh = new Mesh(geometry, [material, material1]);
            const line = new Line(lineGeometry, lineMaterial);
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

        instance.map.add(province);

        return instance.map;
      });
    };

    // 帧率
    const initStats = () => {
      const stats = new Stats();

      stats.showPanel(0);
      if (statsRef.value) {
        statsRef.value.appendChild(stats.dom);
      }

      return stats;
    };

    const Options = function () {
      this.radius = 20;
      this.snow = 500;
    };

    // 面板操作控制
    const initGUI = () => {
      var gui = new GUI();
      GUIOptions.value = new Options();

      gui
        .add(GUIOptions.value, "radius", 0, 30)

        .step(1)
        .listen();

      instance.snowlyController = gui
        .add(GUIOptions.value, "snow", 10, 5000)
        .step(100)
        .listen();

      return gui;
    };

    const init = () => {
      const stats = initStats();
      const gui = initGUI();
      const scene = new Scene();

      // 坐标轴
      const axes = new AxesHelper(20);
      scene.add(axes);

      // 这是光源
      const spotLight = new SpotLight(0xffffff);
      spotLight.position.set(-10, 160, -20);
      spotLight.castShadow = true;
      //       spotLight.shadow.mapSize.width = 1024;
      // spotLight.shadow.mapSize.height = 1024;
      // spotLight.shadow.camera.near = 500;
      // spotLight.shadow.camera.far = 4000;
      // spotLight.shadow.camera.fov = 30;

      scene.add(spotLight);

      // crystal 水晶光源
      const crystalLight = new PointLight(0xffffff, 1, 4);

      crystalLight.position.x = -1;
      crystalLight.position.y = 3;
      crystalLight.position.z = -2;
      scene.add(crystalLight);

      // three 对象大部分对象的基类？？
      var target = new Object3D();
      target.position.set(30, 0, 0);
      scene.add(target);

      var helper = new CameraHelper(spotLight.shadow.camera);
      scene.add(helper);

      // 地面
      const paneGeometry = new PlaneGeometry(160, 160);
      const meshBasicMaterial = new MeshStandardMaterial({ color: 0xcccccc });
      const plane = new Mesh(paneGeometry, meshBasicMaterial);
      plane.rotation.x = -0.5 * Math.PI;
      plane.position.y = -1;

      plane.receiveShadow = true;
      scene.add(plane);

      // 正方体模型
      const boxGeometry = new BoxGeometry(12, 12, 12);
      const boxMaterial = new MeshStandardMaterial({
        color: 0xaa44ee,
        wireframe: false,
      });
      const box = new Mesh(boxGeometry, boxMaterial);
      // box.position.x = 6;
      box.position.y = 26;
      // box.position.z = 6;
      box.castShadow = true;
      scene.add(box);

      // 多边形
      const ballFeometry = new IcosahedronBufferGeometry(4, 2);
      const ball = new Mesh(
        ballFeometry,
        new MeshStandardMaterial({
          color: new Color("rgba(106,153,153)"),
          transparent: true,
        })
      );
      ball.position.x = -20;
      ball.position.y = 20;
      ball.position.z = -0;
      ball.castShadow = true; //default is false
      scene.add(ball);

      // 球
      const sphereGeometry = new SphereGeometry(5, 32, 32);
      const sphereMaterial = new MeshStandardMaterial({
        color: 0xff0000,
      });
      const sphere = new Mesh(sphereGeometry, sphereMaterial);
      sphere.castShadow = true; //default is false

      sphere.position.x = 10;
      sphere.position.y = 10;
      sphere.position.z = 10;
      scene.add(sphere);

      const renderer = new WebGLRenderer();

      renderer.setClearColor(new Color(0xeeeeee));
      // fixme  高度减1 才不会出现滚动条
      renderer.setSize(window.innerWidth, window.innerHeight - 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;

      const camera = new PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      camera.position.x = -30;
      camera.position.y = 40;
      camera.position.z = 30;

      // 雪花
      // 雪花贴图
      const renderSnowPoint = () => {
        let texture = new TextureLoader().load(snowTexture);
        let geometry = new Geometry();
        let range = 100;
        let points: any = [];
        let pointsMaterial = new PointsMaterial({
          size: 1,
          transparent: true,
          opacity: 0.8,
          map: texture,
          // 背景融合
          blending: AdditiveBlending,
          // 景深衰弱
          sizeAttenuation: true,
          depthTest: false,
        });
        for (let i = 0; i < GUIOptions.value.snow; i++) {
          let vertice: any = new Vector3(
            Math.random() * range - range / 2,
            Math.random() * range * 1.5,
            Math.random() * range - range / 2
          );
          // 纵向移速
          vertice.velocityY = 0.1 + Math.random() / 3;
          // 横向移速
          vertice.velocityX = (Math.random() - 0.5) / 3;
          // 加入到几何
          geometry.vertices.push(vertice);
        }
        geometry.center();
        points = new Points(geometry, pointsMaterial);
        points.position.y = -30;
        return points;
      };

      instance.points = renderSnowPoint();

      scene.add(instance.points);

      const renderClound = () => {
        instance.clouds = new Array(100).fill("").map((item) => {
          const cloud = new Cloud();

          cloud.setPosition(Math.random() * 30, 70, Math.random() * 50);
          cloud.setRotation(1.16, -0.12, Math.random() * 360);
          scene.add(cloud.instance);
          return cloud;
        });
      };
      instance.renderClound = renderClound;
      renderClound();

      // const proviceMap = new GunagDongMap();
      // setTimeout(() => {
      //   console.log("proviceMap", proviceMap);

      //   scene.add(proviceMap.map);
      // }, 3000);

      // 中央
      // camera.lookAt(new Vector3(0, 0, 0));
      camera.lookAt(scene.position);

      // 控制
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.5, 0);
      controls.update();
      controls.enablePan = false;
      controls.enableDamping = true;

      // 渲染
      threeRef.value.appendChild(renderer.domElement);

      let step = 0;
      const RADIUS = 20;

      const clock = new Clock();

      const rendererSecee = () => {
        requestAnimationFrame(rendererSecee);

        const animate = () => {
          box.rotation.x += 0.01;
          box.rotation.y += 0.01;
          box.rotation.z += 0.01;

          step += 0.03;

          box.position.x = GUIOptions.value.radius * Math.sin(step);
          box.position.z = GUIOptions.value.radius * Math.cos(step);
          instance.person.rotation.y += 0.13;

          // 雪花动画
          let vertices = instance.points.geometry.vertices;

          vertices.forEach(function (v) {
            v.y = v.y - v.velocityY;
            v.x = v.x - v.velocityX;
            if (v.y <= 0) v.y = 60;
            if (v.x <= -20 || v.x >= 20) v.velocityX = v.velocityX * -1;
          });

          // 顶点变动之后需要更新，否则无法实现雨滴特效
          instance.points.geometry.verticesNeedUpdate = true;

          // 云层动画
          instance.clouds.forEach((cloud) => {
            cloud.animate();
          });
        };
        stats.begin();
        animate();

        controls.update();
        controls.enableDamping = true;
        // 镜头动画
        TWEEN && TWEEN.update();
        stats.end();

        var T = clock.getDelta(); //返回时间单位：秒
        // console.log(T);

        renderer.render(scene, camera);
      };

      instance.snowlyController.onChange((value) => {
        // 清除
        scene.remove(instance.points);
        renderSnowPoint();
        instance.points = renderSnowPoint();

        scene.add(instance.points);
      });

      const gltfLoader = new GLTFLoader();
      // gltfLoader.setDRACOLoader(dracoLoader);

      let mixer = null;

      const loadPersonResource = () =>
        new Promise((resolve) => {
          gltfLoader.load(
            "/src/assets/resource/person.glb",
            (person) => {
              console.log(person);
              person.scene.position.x = 16.3;
              person.scene.position.z = 16.6;
              person.scene.position.y = 2.36;
              person.scene.scale.set(20, 20, 20);
              person.scene.castShadow = true;
              instance.person = person.scene;

              scene.add(person.scene);

              resolve();
            },
            function (xhr) {
              console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            }
          );
        });

      const loadBuildResource = () =>
        new Promise((resolve) => {
          gltfLoader.load(
            "/src/assets/resource/crystal-desert.glb",
            (gltf) => {
              console.log(
                gltf.scene.children.filter((item) =>
                  (item?.userData?.name || "").indexOf('"rock."')
                )
              );
              gltf.scene.castShadow = true;
              gltf.scene.scale.set(5, 5, 5);
              scene.add(gltf.scene);

              resolve();
            },
            function (xhr) {
              console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            }
          );
        });

      const loadMap = () =>
        new Promise((resolve) => {
          loader.load("/src/assets/map/guangdong.json", (data) => {
            let jsonData = JSON.parse(data);
            console.log("instance", instance);
            // instance.map = ; // 解析并绘制地图'
            initMap(jsonData);
            scene.add(instance.map);
            resolve();
          });
        });

      Promise.all([loadPersonResource(), loadBuildResource(), loadMap()]).then(
        (res) => {
          rendererSecee();
        }
      );

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      });
    };

    onMounted(() => {
      init();
    });

    return {
      threeRef,
      statsRef,
    };
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0px;
}

html,
body {
  width: 100%;
  height: 100%;
}
</style>
