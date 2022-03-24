<template>
  <div ref="statsRef"></div>
  <div ref="threeRef"></div>
</template>

<script lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import {
  Scene,
  PerspectiveCamera,
  Vector2,
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
  // 射线追踪
  Raycaster,
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

    // 帧率
    const initStats = () => {
      const stats = new Stats();

      stats.showPanel(0);
      if (statsRef.value) {
        statsRef.value.appendChild(stats.dom);
      }

      return stats;
    };

    const Options = function() {
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
      instance.scene = scene;
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
      instance.camera = camera;
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

          vertices.forEach(function(v) {
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

          // 通过摄像机和鼠标位置更新射线
          instance.raycaster.setFromCamera(instance.mouse, instance.camera);

          // 算出射线 与当场景相交的对象有那些
          const intersects = instance.raycaster.intersectObjects(
            instance.scene.children,
            true
          );
          // const find = intersects.find(
          //   (item) => item.object.material && item.object.material.length === 2
          // );

          // 恢复上一次清空的
          if (instance.lastPick) {
            instance.lastPick.object.material[0].color.set("#2defff");
            instance.lastPick.object.material[1].color.set("#3480C4");
          }
          instance.lastPick = null;
          instance.lastPick = intersects.find(
            (item) => item.object.material && item.object.material.length === 2
          );
          if (instance.lastPick) {
            instance.lastPick.object.material[0].color.set(0xff0000);
            instance.lastPick.object.material[1].color.set(0xff0000);
          }
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
      // 人物
      scene.add(instance.person);
      // 水晶荒漠
      scene.add(instance.gltf);
      // 地图
      const proviceMap = new GunagDongMap(instance.jsonData);
      proviceMap.setPosition(6, 50, 6);
      instance.proviceMap = proviceMap.instance;
      scene.add(instance.proviceMap);

      instance.snowlyController.onChange((value) => {
        // 清除
        scene.remove(instance.points);
        renderSnowPoint();
        instance.points = renderSnowPoint();

        scene.add(instance.points);
      });

      // gltfLoader.setDRACOLoader(dracoLoader);

      let mixer = null;

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      });

      const setRaycaster = () => {
        instance.raycaster = new Raycaster();
        instance.mouse = new Vector2();
        const onMouseMove = (event) => {
          // console.log("event", event);
          // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
          instance.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          instance.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener("mousemove", onMouseMove, false);
      };
      setRaycaster();

      rendererSecee();
    };

    onMounted(() => {
      const gltfLoader = new GLTFLoader();
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

              resolve();
            },
            function(xhr) {
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

              instance.gltf = gltf.scene;

              resolve();
            },
            function(xhr) {
              console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            }
          );
        });

      const loadMap = () =>
        new Promise((resolve) => {
          loader.load("/src/assets/map/guangdong.json", (data) => {
            let jsonData = JSON.parse(data);
            console.log("instance", (instance.jsonData = jsonData));
            // instance.map = ; // 解析并绘制地图'

            resolve();
          });
        });

      Promise.all([loadPersonResource(), loadBuildResource(), loadMap()]).then(
        (res) => {
          init();
        }
      );
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
