		/*
			Y
			|  X
			| /
			|/
		----+----------Z
		   /|
		  /	|	
		 /  |
		 
		*/
	
	// либа глобально отслеживает, что нажато...
	
	var keyboard	= new KeyboardState();
	
	var 
	ratioWH,
	far = 15000,
	controls,
	stats,
	scene, 
	camera,
	renderer,
	projector,
	mouse = {x:0,y:0},
	ray;
	
	
	
	$('body').append('<div class="info" style="position:absolute;right:0;top:0;z-index: 1;background: #FFF;font-size: 25px;"></div>');
	
	var wowControl = function( object , domElement){

		var domElement = domElement || document;
		var PI_2 = Math.PI / 2,
			vector = new THREE.Vector3(),
			center = new THREE.Vector3(),
			normalMatrix = new THREE.Matrix3();
			STATE = {NONE:-1, DOWN:1, ZOOM:2, PAN:3},
			state = STATE.NONE;
		
		
		this.isStrategy =false;    // Для камеры в режиме редактора/стратегия
		
		
		
		this.isMouseDown = false;  
		this.movementSpeed = 1.0;
		this.rotateSpeed   = 0.010;
		this.zoomSpeed     = 10;       
		
		this.onChange = $.noop;    // рендер для перерисовки 
		
		/* === Обработки событий ===  */

		

		
		/* 
		* Инициализация
		*/
		var _this = this;
		this.init = function(){
			$(domElement).off();
			$(domElement).on('mousewheel', this.mousewheel);
			$(domElement).on('mousedown', this.mouseDown);
			$(domElement).on('mouseup', this.mouseUp);
			$(domElement).on('mousemove', this.mouseMove);
			
		}
		
		// Поворот камеры 
		this.rotate = function ( delta ) {
			vector.copy( object.position ).sub( center );
			var theta = Math.atan2( vector.x, vector.z );
			var phi = Math.atan2( Math.sqrt( vector.x * vector.x + vector.z * vector.z ), vector.y );
			theta += delta.x;
			phi += delta.y;
			var EPS = 0.000001;
			/* Math.PI - EPS*/	
			phi = Math.max( EPS, Math.min( PI_2 - EPS , phi ) );
			var radius = vector.length();
			vector.x = radius * Math.sin( phi ) * Math.sin( theta );
			vector.y = radius * Math.cos( phi );
			vector.z = radius * Math.sin( phi ) * Math.cos( theta );
			object.position.copy( center ).add( vector );
			object.lookAt( center );
			
			_this.onChange();

		}
		// Zoom камеры
		this.zoom = function(distance){
			normalMatrix.getNormalMatrix( object.matrix );
			distance.applyMatrix3( normalMatrix );
			distance.multiplyScalar( vector.copy( center ).sub( object.position ).length() * 0.001 );
			object.position.add( distance );
			
			_this.onChange();
		}
		

		this.mousewheel = function(event){
			event.preventDefault();
			event.stopPropagation();
			var delta = 0;
			if ( event.originalEvent.wheelDelta ) { // WebKit / Opera 
				delta = event.originalEvent.wheelDelta / 40;
			} else if ( event.originalEvent.detail ) { // Firefox
				delta = - event.originalEvent.detail / 3;
			}
			delta = delta * _this.zoomSpeed;
			_this.zoom( new THREE.Vector3( 0, 0, delta ) );
		}
		
		// отслеживаем состояния
		this.mouseDown = function(event){
			if ( event.button === 0 ) {
				_this.isMouseDown = true;
				state = STATE.DOWN;
			}else if ( event.button === 1 ) {
				state = STATE.ZOOM;
			}	
		}
		
		this.mouseUp = function(event){
			_this.isMouseDown = false;
			state = STATE.NONE;
		}
		

		/*
			Отслеживаем нажатие клавиш для камеры
		*/
		this.update = function(delta){
			var press = false;
			delta = delta || 10;
			var actualMoveSpeed = delta * this.movementSpeed;
			/*	
				Перемещение камеры стрелками, если режим стратегия/редактор ZX
			*/	
			
			if(this.isStrategy){
				var zero = object.position.y;
				if ( keyboard.pressed("left") ){ 
					press=true; 
					object.translateX( -actualMoveSpeed); 
				}
				if ( keyboard.pressed("right")) { 
					press=true; 
					object.translateX( actualMoveSpeed );   
				}
				if ( keyboard.pressed("up")) { 
					press=true;
					object.translateZ(-actualMoveSpeed); 
					object.position.y=zero;
				}
				if ( keyboard.pressed("down") ){ 
					press=true;
					object.translateZ( actualMoveSpeed);
					object.position.y =zero;
				}
			
			}
			
			$('.info').html('camera.position <br> X:'+
				object.position.x +
				' <br>Y:'+object.position.y+
				' <br>Z:'+object.position.z + 
				' <br>' +
				' camera.rotation  <br>X:' + object.rotation.x + 
				'  <br>Y:'+object.rotation.y +
				'  <br>Z:'+object.rotation.z
				
			);
			
			
			_this.onChange();
		}
		
		
		
		this.mouseMove = function(event){
			event.preventDefault();
			var e = event.originalEvent;
			var movementX = e.movementX || e.webkitMovementX || e.mozMovementX || e.oMovementX || 0;
			var movementY = e.movementY || e.webkitMovementY || e.mozMovementY || e.oMovementY || 0;
				
			mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
			mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;	
			
			// крутим камеру по вектору потихоньку...
			if(_this.isMouseDown && keyboard.pressed("ctrl")){
				_this.rotate( new THREE.Vector3(
					- movementX * _this.rotateSpeed,
					- movementY * _this.rotateSpeed, 0 
				));
				
			}
			
		}
		
		_this.init();
		return _this;
	}


	
	
	

		
	

	
	
	function init(){
		// FPS монитор
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		stats.domElement.style.zIndex = 100;
		$('body').append( stats.domElement );
		
		scene = new THREE.Scene();

		// Для комфортного теста
		scene.add( new THREE.AxisHelper(1800) );
		scene.add( new THREE.GridHelper( 2500, 50 ));

		 scene.add( new THREE.AmbientLight( 0x505050 ) );

                var light = new THREE.SpotLight( 0xffffff, 1.5 );
                light.position.set( 0, 500, 2000 );
                light.castShadow = true;
                scene.add( light );   
		
		
		var width= window.innerWidth ,height=window.innerHeight;
		ratioWH =width/height;
		camera = new THREE.PerspectiveCamera(85,ratioWH,1, far);
		camera.position.set( 500, 250, 5 );
		camera.lookAt( scene.position );

		window.addEventListener( 'resize', onWindowResize, false );
		
		renderer = new THREE.WebGLRenderer();
		renderer.setSize(width , height);
		$(renderer.domElement).css('background-color','#0D0000');
		$('body').append(renderer.domElement);
		
		// Создаем наш контролер камеры
		controls = new wowControl(camera , renderer.domElement);
		controls.isStrategy = true;
		controls.onChange = render;
		
		
		
		var wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x000088, wireframe: false, side:THREE.DoubleSide } ); 
		var floorGeometry = new THREE.PlaneGeometry(1000,1000,10,10);
		var floor = new THREE.Mesh(floorGeometry, wireframeMaterial);
		floor.position.z = -0.01;
		floor.position.y = 25;
		// rotate to lie in x-y plane
		floor.rotation.x = Math.PI / 2;
		scene.add(floor);
		
		
		
		
		
		
		render();
		animate();
	}
	
	function animate(){
		requestAnimationFrame( animate );
		stats.update();
		controls.update();
	}
		
	function onWindowResize() {
		var width= window.innerWidth ,height=window.innerHeight;
		ratioWH =width/height;
		camera.aspect = ratioWH;
		camera.updateProjectionMatrix();
		renderer.setSize(width,height );
		render(); 
	}
	
	function render() {
		renderer.render(scene, camera);
	}
	
/* Запуск */
	init();	
	

