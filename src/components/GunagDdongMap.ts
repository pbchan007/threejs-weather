/*
 * @Autor: CPB
 * @Date: 2022-03-22 20:39:33
 * @LastEditors: CPB
 * @Description: 
 */

let loader = new THREE.FileLoader();

loader.load('../assets/map/guangdong.json', function (data) {
  let jsonData = JSON.parse(data);
//   _this.initMap(jsonData); // 解析并绘制地图
});


class GunagDdongMap {
    
}