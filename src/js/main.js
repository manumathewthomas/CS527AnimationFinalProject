"use strict";
(function() {

    let clock = new THREE.Clock();
    let camera;
    let controls;
    let scene;
    let renderer;
    let target = new THREE.Vector3();
    let mouse = {
        x: 0,
        y: 0
    };

    let plane;
    let objects = [];
    let transformControls = [];

    let obstacleCubeMesh, obstacleCubeBoundingMesh;
    let obstacleCubeGeometry, obstacleCubeBoundingGeometry;

    let targetMesh, targetBoundingMesh;
    let targetGeometry, targetBoundingGeometry;

    let ambientLight, hemisphereLight, shadowLight;


    let planes = [];
    let v1, v2, v3;

    let gravityVector;
    let upVector;

    let lifeSpan = 200;

    let population = 100;
    let showPopulation = false;
    let matingpool = [];
    let generationCount = 1;

    let count = 0;



    class Plane {
        constructor(genes) {
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.acceleration = new THREE.Vector3(0, 0, 0);
            this.maxSpeed = 0.4;
            this.maxForce = 0.1;
            this.geometry = new THREE.ConeGeometry(3, 5, 32);
            this.axis = new THREE.Vector3(0, 1, 0);
            this.material = new THREE.MeshBasicMaterial({
                color: 0xd9d9d9
            });
            this.mesh = plane.mesh.clone();
            this.mesh.visible = false;
            this.completed = false;
            this.crashed = false;

            if(genes)
              this.genes = genes;
            else
              this.genes = DNA();
            this.fitness = 0;
            this.calculateFitness = function() {
              let distance = this.mesh.position.distanceTo(target);
              this.fitness = (1/distance);
              if(this.completed)
                this.fitness *= 50;
              else
                this.fitness /= 10;

              if(this.crashed)
                this.fitness /= 20;
              else
                this.fitness *= 50;
            
              if(this.mesh.position.y < 30 && this.mesh.position.y > 70)
                this.fitness /= 20;
              else
                this.fitness *= 50;          

            
            }
        }
    }


    let createPlanes = function(n, newgenesCollection) {

        _.times(n, function(i) {
          if(newgenesCollection)
            planes.push(new Plane(newgenesCollection[i]))
       
          else
            planes.push(new Plane());
        });

        _.forEach(planes, function(d) {
            d.mesh.position.set(-200, 10, 0);
            d.mesh.scale.set(.25, .25, .25);
            scene.add(d.mesh);
        });

        showTheFitestPlane();
    }

    let showTheFitestPlane = function() {

         _.forEach(planes, function(d) {
            d.mesh.visible = false;
         });
        let randomPlane = _.sample(planes);
        randomPlane.mesh.visible = true;
    }


    let DNA = function(newGenes) {
      console.log("DNA");
      let genes = [];

      _.times(lifeSpan, function(i){
          genes[i] = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
          genes[i].setLength(0.05);
        });
  
      return genes;
    }

    let evaluateFitness = function() {
      let maxFit = 0;
      _.forEach(planes, function(d) {
        d.calculateFitness();
        if(d.fitness > maxFit) 
          maxFit = d.fitness;
      });

      console.log(maxFit, generationCount);

      _.forEach(planes, function(d) {
        d.fitness /= maxFit;
      });

      matingpool = [];

      _.forEach(planes, function(d) {
          let n = d.fitness * 100;
          _.times(n, function(i) {
              matingpool.push(d);
          });
      });
    }

    let selection = function() {

      let newgenesCollection = [];
      _.forEach(planes, function(d, i) {
          let parentA = _.sample(matingpool);
          let parentB = _.sample(matingpool);
          let childgene = crossover(parentA, parentB);
          childgene = mutation(childgene);
          newgenesCollection.push(childgene);
      });

      clearPlanes();
      createPlanes(population, newgenesCollection);


    
    }

    let crossover = function(parentA, parentB) {
      let newgenes = [];
      let midpoint = _.random(0, lifeSpan);
      _.times(lifeSpan, function(i) {
          if(i > midpoint)
              newgenes[i] = parentA.genes[i];
          else
              newgenes[i] = parentB.genes[i];
      });

      return newgenes;
    }

    let mutation = function(childgene) {
       _.times(lifeSpan, function(i) { 
          if(_.random(0.001, 0.9) < 0.01) {

              childgene[i] = new THREE.Vector3(Math.random(), Math.random()*2-1, Math.random()*2-1);
              childgene[i].setLength(0.05);
          } 
       });

       return childgene;
    }



    let createScene = function() {
        // control.addEventListener( 'change', animate );
        let tableGeometry = new THREE.BoxGeometry(1000, 1, 1000);
        let tableMaterial = new THREE.MeshPhongMaterial({
            color: 0x662506,
            FlatShading: true
        });
        let tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
        tableMesh.position.set(0, -5, 0);
        tableMesh.receiveShadow = true;
        objects.push(tableMesh);
        scene.add(tableMesh);


        // targetGeometry = new THREE.BoxGeometry( 50, 50, 50 );
        // let targetMaterial = new THREE.MeshBasicMaterial( {color: 0xaddd8e} );
        // targetMesh = new THREE.Mesh( targetGeometry, targetMaterial );
        // targetMesh.position.set(0,25,0);
        // scene.add( targetMesh );



        targetBoundingGeometry = new THREE.SphereGeometry(5, 30, 30);
        let targetBoundingMaterial = new THREE.MeshPhongMaterial({
            color: 0xde2d26,
            transparent: true,
            opacity: 0.7,
            FlatShading: true
        });
        targetBoundingMesh = new THREE.Mesh(targetBoundingGeometry, targetBoundingMaterial);

        scene.add(targetBoundingMesh);
        targetBoundingMesh.position.set(150, 50, 0);

        objects.push(targetBoundingMesh);

        let targetControl = new THREE.TransformControls(camera, renderer.domElement);
        targetControl.attach(targetBoundingMesh);
        transformControls.push(targetControl);

        let obstacleCubeControl = new THREE.TransformControls(camera, renderer.domElement);

        obstacleCubeGeometry = new THREE.BoxGeometry(50, 50, 100);
        let obstacleMaterial = new THREE.MeshPhongMaterial({
            color: 0xaddd8e,
            transparent: true,
            opacity: 0.7,
            FlatShading: true
        });
        obstacleCubeMesh = new THREE.Mesh(obstacleCubeGeometry, obstacleMaterial);
        obstacleCubeMesh.position.set(0, 20, 0);
        obstacleCubeMesh.castShadow = true;
        obstacleCubeMesh.receiveShadow = true;
        scene.add(obstacleCubeMesh);

        obstacleCubeBoundingGeometry = new THREE.BoxGeometry(50, 50, 100);
        let material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        obstacleCubeBoundingMesh = new THREE.Mesh(obstacleCubeBoundingGeometry, material);

        obstacleCubeMesh.add(obstacleCubeBoundingMesh);

        objects.push(obstacleCubeBoundingMesh);

        obstacleCubeControl.attach(obstacleCubeMesh);
        transformControls.push(obstacleCubeControl);

        plane = new AirPlane();
        plane.mesh.scale.set(.25, .25, .25);
        plane.mesh.position.y = 100;
        plane.mesh.castShadow = true;



    }

    let init = function() {

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.set(50, 170, -300);


        controls = new THREE.OrbitControls(camera, document.getElementById('contanier'));

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

        // renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

        ambientLight = new THREE.AmbientLight(0xdc8874, .5);
        

        shadowLight = new THREE.DirectionalLight(0xffffff, .9);
        shadowLight.position.set(150, 350, 350);
        shadowLight.castShadow = true;

        shadowLight.shadow.camera.left = -400;
        shadowLight.shadow.camera.right = 400;
        shadowLight.shadow.camera.top = 400;
        shadowLight.shadow.camera.bottom = -400;
        shadowLight.shadow.camera.near = 1;
        shadowLight.shadow.camera.far = 1000;
        shadowLight.shadow.mapSize.width = 2048;
        shadowLight.shadow.mapSize.height = 2048;

        scene.add(ambientLight);
        scene.add(hemisphereLight);
        scene.add(shadowLight);

        gravityVector = new THREE.Vector3(0, -0.00098, 0);
        upVector = new THREE.Vector3(0, 1, 0);


        document.getElementById('contanier').appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);

        /* animate the scene */
        createScene();
        createPlanes(population);

        document.getElementById('generationcount').innerHTML = "Generation - "+generationCount;

        animate();
    }

    let onWindowResize = function() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    let applyForce = function(plane, force) {
        plane.acceleration.add(force);
    }

 
    let obstacle = function(plane) {

        let raycaster = new THREE.Raycaster();
        let steer = new THREE.Vector3();
        raycaster.set(plane.mesh.position.clone(), plane.velocity.clone().normalize());
        let d = raycaster.intersectObjects(objects);


        if (d[0] && d[0].distance < 25) {

            // var from = obstacleCubeBoundingMesh.position;
            // var to = d[0].face.normal;
            // var direction = to.clone().sub(from);
            // var length = 100;
            // var arrowHelper = new THREE.ArrowHelper(direction.normalize(), from, length, 0xff00ff );
            // scene.add( arrowHelper );
            steer = new THREE.Vector3().addVectors(d[0].face.normal, plane.velocity);
            steer.clampLength(steer.length(), plane.maxForce);
            plane.collision = true;
        } else {
            plane.collision = false;
        }
        return steer;
    }

    let checkCollision = function(plane) {
        let raycaster = new THREE.Raycaster();
        let steer = new THREE.Vector3();
        raycaster.set(plane.mesh.position.clone(), plane.velocity.clone().normalize());
        let d = raycaster.intersectObjects(objects);

        if (d[0] && d[0].distance < 5) {
          plane.crashed = true;
        }
    }

    let update = function(plane) {

        let distance = plane.mesh.position.distanceTo(target);
        if(distance < 5)
        {
            plane.completed =true;
            plane.position = target;
        }

        checkCollision(plane);

        applyForce(plane, plane.genes[count]);
        applyForce(plane, gravityVector);

        if(!plane.completed && !plane.crashed) {

          plane.velocity.add(plane.acceleration);
          plane.velocity.clampLength(plane.velocity.length(), plane.maxSpeed);

          plane.mesh.quaternion.setFromUnitVectors(plane.axis, plane.velocity.clone().normalize());
          console.log(plane.mesh.quaternion);

          plane.mesh.position.add(plane.velocity);

          plane.acceleration.set(0, 0, 0);

        }

    }

  
 
    let animate = function() {

        _.forEach(planes, function(d) {
            if(showPopulation)
                d.mesh.visible = true;

            if(!d.crashed)
                d.mesh.children[4].rotation.x += 0.6;

            update(d);
        });
        count++;
        if(count == lifeSpan)
        {
          generationCount++;
          document.getElementById('generationcount').innerHTML = "Generation - "+generationCount;
          evaluateFitness();
          selection();
          count = 0;
        }

        target.set(targetBoundingMesh.position.x, targetBoundingMesh.position.y, targetBoundingMesh.position.z);

        requestAnimationFrame(animate);


        renderer.render(scene, camera);

    }

    let clearPlanes = function() {
      
      _.forEach(planes, function(d) {
                scene.remove(d.mesh);
            });

      planes = [];

    }


    let AirPlane = function() {

      this.mesh = new THREE.Object3D();

      // Create the cabin
      let geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
      let matCockpit = new THREE.MeshPhongMaterial({
        color: 0xf25346,
        shading: THREE.FlatShading
      });
      // we can access a specific vertex of a shape through 
      // the vertices array, and then move its x, y and z property:
      geomCockpit.vertices[4].y -= 10;
      geomCockpit.vertices[4].z += 20;
      geomCockpit.vertices[5].y -= 10;
      geomCockpit.vertices[5].z -= 20;
      geomCockpit.vertices[6].y += 30;
      geomCockpit.vertices[6].z += 20;
      geomCockpit.vertices[7].y += 30;
      geomCockpit.vertices[7].z -= 20;

      let cockpit = new THREE.Mesh(geomCockpit, matCockpit);
      cockpit.castShadow = true;
      cockpit.receiveShadow = true;
      this.mesh.add(cockpit);

      // Create the engine
      let geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
      let matEngine = new THREE.MeshPhongMaterial({
        color: 0xd8d0d1,
        shading: THREE.FlatShading
      });
      let engine = new THREE.Mesh(geomEngine, matEngine);
      engine.position.x = 40;
      engine.castShadow = true;
      engine.receiveShadow = true;
      this.mesh.add(engine);

      // Create the tail
      let geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
      let matTailPlane = new THREE.MeshPhongMaterial({
        color: 0xf25346,
        shading: THREE.FlatShading
      });
      let tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
      tailPlane.position.set(-35, 25, 0);
      tailPlane.castShadow = true;
      tailPlane.receiveShadow = true;
      this.mesh.add(tailPlane);

      // Create the wing
      let geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
      let matSideWing = new THREE.MeshPhongMaterial({
        color: 0xf25346,
        shading: THREE.FlatShading
      });
      let sideWing = new THREE.Mesh(geomSideWing, matSideWing);
      sideWing.castShadow = true;
      sideWing.receiveShadow = true;
      this.mesh.add(sideWing);

      // propeller
      let geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
      let matPropeller = new THREE.MeshPhongMaterial({
        color: 0x59332e,
        shading: THREE.FlatShading
      });
      this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
      this.propeller.name= "propeller";
      this.propeller.castShadow = true;
      this.propeller.receiveShadow = true;

      // blades
      let geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
      let matBlade = new THREE.MeshPhongMaterial({
        color: 0x23190f,
        shading: THREE.FlatShading
      });

      let blade = new THREE.Mesh(geomBlade, matBlade);
      blade.position.set(8, 0, 0);
      blade.castShadow = true;
      blade.receiveShadow = true;
      this.propeller.add(blade);
      this.propeller.position.set(50, 0, 0);
      this.mesh.add(this.propeller);
    };


    let GUIControls = function() {
        this.showPopulation = false;     
        this.displayTransform = false;
        this.displayColliders = false;

    };

    window.onload = function() {
        let control = new GUIControls();
        let gui = new dat.GUI();

        gui.add(control, "showPopulation").onChange(function(checked) {
          if(checked) {
            showPopulation = true;
          } 
          else {
            showPopulation = false;
            showTheFitestPlane();
          }
        });
     
        gui.add(control, "displayTransform").onChange(function(checked) {
            if (checked) {
                _.forEach(transformControls, function(d) {
                    scene.add(d);
                })
            } else {
                _.forEach(transformControls, function(d) {
                    scene.remove(d);
                })
            }
        });
        gui.add(control, "displayColliders").onChange(function(checked) {
            if (checked) {
                _.forEach(objects, function(d) {
                    console.log(d)
                    if (d.parent.parent)
                        d.material.opacity = 0.2;
                });
            } else {
                _.forEach(objects, function(d) {
                    if (d.parent.parent)
                        d.material.opacity = 0;
                });
            }
        });

     

    }




    /* start the application once the DOM is ready */
    document.addEventListener('DOMContentLoaded', init);


})();