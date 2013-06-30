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
	var keyboard	= new KeyboardState();
	
	var 
	ratioWH,
	controls,
	stats,
	scene, 
	camera,
	renderer;
	
	// Земля 
	var ground;
	// Вода
	var water;
	// Небо
	
	
	var wowControl = function(object, domElement){
		
		var domElement = domElement || document;
		var PI_2 = Math.PI / 2,
			vector = new THREE.Vector3(),                    // Вектор для камеры 
			center = new THREE.Vector3(),                    // Вектор центролировки для камеры
			normalMatrix = new THREE.Matrix3();              // Матрица нормалей
			STATE = {NONE:-1, DOWN:0, MIDDOWN :1, PAN:2},    // Флаги нажатий мышки 
			INTERSECTED = null,                              // Обьект под курсором 
			INTERSECTED_coordinates ={x: null, y: null},	 // Кординаты плоскости под курсором 	
			projector = new THREE.Projector();               // Прожектор, перис хилтон)
				
			
		this.isFixidY =false;        // Фиксирует позицию Y камеры 
		this.isMouseDown = false;    // флаг указывает что нажата одна из 3х клавиш мышки 
		this.movementSpeed = 10;     // скорость передвижения камеры/сек по пиксилям
		this.rotateSpeed   = 0.010;  // Скорость поворота камеры
		this.zoomSpeed     = 10;  	 // Скорость зума  	
		this.mouse = {x:0,y:0};    	 // Позиция мышки 
		this.state = STATE.NONE;  	 // флаг нажатия мыши  -1 нету, 0 левая , 1 колесик, 2 правая
		this.onChange = $.noop;      // Callback функция для перерисовки рендера 	
		
		var _this = this;
		
		/*
			Иницилизация камеры
		*/
		this.init = function(){
			$(domElement).off('mousewheel mousedown mouseup mousemove');
			$(domElement).on('mousewheel', this.mousewheel);
			$(domElement).on('mousedown', this.mouseDown);
			$(domElement).on('mouseup', this.mouseUp);
			$(domElement).on('mousemove', this.mouseMove);	
		}
		
		// Колесик мышки
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
		
		/* 
			Отслеживаем состояния нажатий мышки
		*/
		this.mouseDown = function(event){
			_this.isMouseDown = true;
			if ( event.button === 0 ) {
				_this.state = STATE.DOWN;
			}else if ( event.button === 1 ) {  	
				_this.state = STATE.MIDDOWN;
			}else if ( event.button === 2) {
				_this.state = STATE.PAN;
			}
		}
		
		this.mouseUp = function(event){
			_this.isMouseDown = false;
			_this.state = STATE.NONE;
		}
		
		// Отслеживаем движение мышки
		this.mouseMove = function(event){
			event.preventDefault();
			var e = event.originalEvent;
			var movementX = e.movementX || e.webkitMovementX || e.mozMovementX || e.oMovementX || 0;
			var movementY = e.movementY || e.webkitMovementY || e.mozMovementY || e.oMovementY || 0;
			
			// Кординаты мышки 
			_this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
			_this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;	
			
			// крутим камеру c Нажатой клавишей мышки 0+ cntl или ценральной нажайто клавиши
			if( (_this.state===STATE.DOWN && keyboard.pressed("ctrl") ) || _this.state===STATE.MIDDOWN){
				// X Y Z
				_this.rotate( new THREE.Vector3(
					- movementX * _this.rotateSpeed,
					- movementY * _this.rotateSpeed, 0 
				));	
			}
		}
		
		/* 
			Поворот камеры
			@param delta.XY  кординаты мышки
		*/
		this.rotate = function ( delta ) {
			vector.copy( object.position ).sub( center );
			var theta = Math.atan2( vector.x, vector.z );
			var phi = Math.atan2( Math.sqrt( vector.x * vector.x + vector.z * vector.z ), vector.y );
			theta += delta.x;
			phi += delta.y;
			var EPS = 0.000001;
			/* Math.PI - EPS // старый ограничитель, */	
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
		
		/* 
			Получаем кординаты мышки на обьекте XZ в виде обьекта {x:0,y:0}
			@todo getIntersected должен вызыватся первым
		*/
		this.getIntersectedCoordinates = function(){
			return INTERSECTED_coordinates;
		}
		
		/* 
			Возврашяет текуший обьект под курсором мышки
			@todo Требует глобальная переменная scene  = new THREE.Scene();
		*/
		this.getIntersected = function(){
			var vector = new THREE.Vector3( _this.mouse.x, _this.mouse.y, 1 );
				projector.unprojectVector( vector, object );
			var ray = new THREE.Raycaster( object.position, vector.sub( object.position ).normalize() );
			var intersects = ray.intersectObjects( scene.children );
				if ( intersects.length > 0 ){
					if ( intersects[0].object != INTERSECTED ){ INTERSECTED = intersects[0].object;	}				
				var vartexPoint = intersects[0].point;    // Vector3 XYZ
				
				INTERSECTED_coordinates.x = Math.floor(vartexPoint.x);
				INTERSECTED_coordinates.y = Math.floor(vartexPoint.z);	
			// если нету не видать обьект. 
			}else{
				INTERSECTED_coordinates = {x:null,y:null};
				INTERSECTED_vertex_coordinates = {x: null, y: null};
				INTERSECTED = null;	
			}
			return INTERSECTED;
		}
		
		/*
			Отслеживаем нажатие клавиш для камеры
			@param delta Кофициент умножитель 
		*/
		this.update = function(delta){
			delta = delta || 10;  	
			var press = false,	
				actualMoveSpeed = delta * this.movementSpeed,
				zero_y = object.position.y;

			if ( keyboard.pressed("left") ){ 
				press=true; 
				object.translateX( -actualMoveSpeed); 
			}
			if ( keyboard.pressed("right")) { 
				press=true; 
				object.translateX( actualMoveSpeed);   
			}
			if ( keyboard.pressed("up")) { 
				press=true;
				object.translateZ(-actualMoveSpeed); 	
			}
			if ( keyboard.pressed("down") ){ 
				press=true;
				object.translateZ( actualMoveSpeed);
			}
				
			// Движение камеры если мы у края экрана
			// @todo Работает но требует дороботки и тестов
			/*if(_this.state==STATE.NONE){
				if(this.mouse.x > 0.95 )
					object.translateX( actualMoveSpeed );
				if(this.mouse.x < -0.95 )
					object.translateX( -actualMoveSpeed );
				if(this.mouse.y > 0.95 )
					object.translateZ( -actualMoveSpeed );
				if(this.mouse.y < -0.95 )
					object.translateZ( actualMoveSpeed );				
			}*/	
			if(this.isFixidY)	object.position.y=zero_y;
			if(press) _this.onChange();		
			return press;
		}
		
		/* Заставить камеру следить за обьектом */
		this.setChaseObject = function(obj){
			object.lookAt( obj.position );
		}
		/* Отозвать слежку */
		this.unsetChaseObject = function(){
			object.lookAt( scene.position );
		}
		
		_this.init();
		return _this;
	}
	// ======== end wowControl ========

	// ======== Хелпер функции ========
	
	/* 
		Поворот по радианам 
	*/
	function degrees2Radians(degrees) {
		return degrees * (Math.PI / 180)
	};
	
	//======== Приложение ========
	/* Иницилизация приложения*/
	function init(){
		// Иницилизируем FPS монитор
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		stats.domElement.style.zIndex = 100;
		$('body').append( stats.domElement );
		
		// Размер окна
		var width   = window.innerWidth,
			height  = window.innerHeight;
			
		ratioWH = width/height;
		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(85,ratioWH,1, 15000);
		camera.position.set( 1870, 1309, 561 );
		camera.lookAt( scene.position );

		// TEST {
		// Для комфортного теста я использую Хелперы
		// Создает красивый вектор направления как в Blender
		scene.add( new THREE.AxisHelper(7500) );
		// Создает плоскость в виде сетки
		scene.add( new THREE.GridHelper(7500, 100 ));
		// } TEST

		renderer = new THREE.WebGLRenderer();
		renderer.setSize(width , height);
		$(renderer.domElement).css('background-color','#0D0000');
		$('body').append(renderer.domElement);
		
		// Создаем наш контролер камеры
		controls = new wowControl(camera , renderer.domElement);
		controls.isFixidY = true;
		// Задаем Callback функцию перерисовки камеры в данном случаии это наша функция рендер.
		controls.onChange = render;

		// Создаем землю 
		// var groundPlane = new THREE.PlaneGeometry(1000,1000,10,10);
		//scene.add(ground);

		$(window).on( 'resize', onWindowResize);
		
		render();
		animate();
	}
	
	// Перерисовка камеры при изменении окта
	function onWindowResize() {
		var width= window.innerWidth ,height=window.innerHeight;
		ratioWH =width/height;
		camera.aspect = ratioWH;
		camera.updateProjectionMatrix();
		renderer.setSize(width,height );
		render(); 
	}
	
	// функция вызывается каждую секунду блогодоря замыканию requestAnimationFrame
	function animate(){
		requestAnimationFrame( animate );
		stats.update();                    // обновляем FPS 
		controls.update();                 // выполняем действия кнопок.
		// Обьект который находится сейчас унас под курсором мышки
		var mouse = controls.mouse;        
	}
		
	// Обновляем  рендер с указаной камерой
	function render() {	
		renderer.render(scene, camera);	
	}
	
	/* Запуск */
	init();	
	

