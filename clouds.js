// http://mrdoob.com/lab/javascript/webgl/clouds/
// Thank you!!! <3

var container;
var camera, scene, renderer;
var mesh, geometry, material;

var mouseX = 0, mouseY = 0;
var start_time = Date.now();

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

init();

function init() {

    container = document.getElementById('cloud-header');

    // Bg gradient

    var canvas = document.createElement( 'canvas' );
    canvas.width = 32;
    canvas.height = windowHalfY * 2;

    var context = canvas.getContext( '2d' );

    // context.fillStyle = '#c1dbff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    //

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / (windowHalfY*2), 1, 3000 );
    camera.position.z = 6000;

    scene = new THREE.Scene();

    geometry = new THREE.Geometry();

    var texture = THREE.ImageUtils.loadTexture( 'img/cloud10.png', null, animate );
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    var fog = new THREE.Fog( 0xffffff, -50, 3000 );
    material = new THREE.ShaderMaterial( {

        uniforms: {

            "map": { type: "t", value: texture },
            "fogColor" : { type: "c", value: fog.color },
            "fogNear" : { type: "f", value: fog.near },
            "fogFar" : { type: "f", value: fog.far }

        },
        vertexShader: document.getElementById( 'vs' ).textContent,
        fragmentShader: document.getElementById( 'fs' ).textContent,
        depthWrite: false,
        depthTest: false,
        transparent: true

    } );

    var plane = new THREE.Mesh( new THREE.PlaneGeometry( 64, 64 ) );

    for ( var i = 0; i < 8000; i++ ) {

        plane.position.x = Math.random() * 1000 - 500;
        plane.position.y = - Math.random() * Math.random() * 200 - 15;
        plane.position.z = i;
        plane.rotation.z = Math.random() * Math.PI;
        plane.scale.x = plane.scale.y = Math.random() * Math.random() * 2 + 0.5;

        THREE.GeometryUtils.merge( geometry, plane );

    }

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = - 8000;
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, windowHalfY*2 );
    container.appendChild( renderer.domElement );
    $('canvas').css({'position': 'absolute', 'z-index': -1});
    // container.style.background = 'url(' + canvas.toDataURL() + ')';
    // container.style.backgroundSize = '32px 100%';

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    window.addEventListener( 'resize', onWindowResize, false );

}

function onDocumentMouseMove( event ) {

    mouseX = ( event.clientX - windowHalfX ) * 0.25;
    mouseY = ( event.clientY - windowHalfY ) * 0.15;

}

function onWindowResize( event ) {

    camera.aspect = window.innerWidth / window.innerHeight ;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

    requestAnimationFrame( animate );

    position = ( ( Date.now() - start_time ) * 0.03 ) % 8000;

    camera.position.x += ( mouseX - camera.position.x ) * 0.005;
    camera.position.y += ( - mouseY - camera.position.y ) * 0.005;
    camera.position.z = - position + 8000;

    renderer.render( scene, camera );

}