function init_sam(pos, shape) {
  var positions = [];
  var radiiBulge = [];
  var radiiDisk = [];

  var rgb;
  var colors = [];
  var color = new THREE.Color();

  particleCount = 99136;

  for (var p = 0; p < particleCount; p++) {
    var ra = pos['pos-x'][p] - 150.13226;
    var dec = pos['pos-y'][p] - 2.3211206;
    var z_redshift = pos['pos-z'][p];

    var a = 100;

    pX = a * z_redshift * Math.cos(dec) * Math.cos(ra);
    pY = a * z_redshift * Math.cos(dec) * Math.sin(ra);
    pZ = a * z_redshift * Math.sin(dec);
    positions.push(pX, pY, pZ);

    radiiBulge.push(shape['r_bulge'][p] * a / 10);
    radiiDisk.push(shape['r_disk'][p] * a / 10);

    colors.push((255 / 255), (255 / 255), (255 / 255));
  }

  // mat = createCanvasMaterial('#FFFFFF', 256);

  var uniforms = {
    texture: { type: "t", value: createCanvasMaterial('#FFFFFF', 256) }
  }

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    transparent: true,
    alphaTest: 0.5,
    blending: THREE.AdditiveBlending
  }
  );

  var geometryBulge = new THREE.BufferGeometry();
  geometryBulge.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometryBulge.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometryBulge.addAttribute('size', new THREE.Float32BufferAttribute(radiiBulge, 1));
  geometryBulge.computeBoundingSphere();
  bulges = new THREE.Points(geometryBulge, shaderMaterial);
  bulges.name = 'bulges';
  scene.add(bulges);

  var geometryDisk = new THREE.BufferGeometry();
  geometryDisk.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometryDisk.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometryDisk.addAttribute('size', new THREE.Float32BufferAttribute(radiiDisk, 1));
  geometryDisk.computeBoundingSphere();
  disks = new THREE.Points(geometryDisk, shaderMaterial);
  disks.name = 'disks';
  scene.add(disks);
}

function init_scene(dat) {
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 4000;
}