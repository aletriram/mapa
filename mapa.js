var load = (function () {
	function _load (tag) {
		return function (url) {
			return new Promise(function (resolve, reject) {
				var element = document.createElement(tag);
				var parent = 'body';
				var attr = 'src';

				element.onload = function () { resolve(url); };
				element.onerror = function () { reject(url); };

				if (tag == 'script') {
					element.async = true;
				} else if (tag == 'link') {
					element.type = 'text/css';
					element.rel = 'stylesheet';
					attr = 'href';
					parent = 'head';
				} else {
					// TODO default behavior
				}

				element[attr] = url;
				document[parent].appendChild(element);
			});
		};
	}

	return {
		css: _load('link'),
		js: _load('script'),
		img: _load('img')
	}
})();

(function (win) {

	'use strict';

	var _mapas = {};
	var self = null;
	var _api = { done: false, loaded: false, loading: false, ready: [] };


	function Mapa() {

		self = this;
	}

	Mapa.prototype.center = function (id, options) {

		if (!id) return null;
		var mapa = _mapas[id].mapa;
		if (!mapa) return null;
		if (!options) return mapa.getCenter();
		if (!options.lat || !options.lng) return mapa.getCenter();
		else {
			var latlng = new L.LatLng (options.lat, options.lng)
			if (options.flyTo) mapa.flyTo(latlng, options.zoom || self.zoom(id));
			else mapa.setView(latlng, options.zoom || self.zoom(id));
		}
	}


	Mapa.prototype.clear = function (id) {

		if (!id) return alert('Tiene que indicar un identificador');
		if (!_api.loaded) _api.ready.push(function () { self.clear(id); });
		if (!_mapas[id]) return null;

		var mapa = _mapas[id];

		for (var linea in mapa.lineas) mapa.lineas[linea].setMap(null);
		delete mapa.lineas;

		for (var marca in mapa.marcas) mapa.marcas[marca].setMap(null);
		delete mapa.marcas;
	}


	function create (options) {

		var map = {};
		var mapa;

		options._contenedor = $('#' + options.id);
		if (options.width) options._contenedor.css({ width: options.width });
		if (options.height) options._contenedor.css({ height: options.height });

		map.zoom = options.zoom;
		map.center = new L.LatLng(options.lat || 37.338928, options.lng || -5.838965);
		map.mapOptions = {
			attributionControl: options.attributionControl || false,
			zoomSnap: options.zoomSnap || 0.5,
			scrollWheelZoom: options.scrollWheel || false
		};

		// mapa = new google.maps.Map (options._contenedor [0], map);
		const layer = 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png';
		map.mapa = L.map(options.id, map.mapOptions).setView(map.center, map.zoom);
		L.tileLayer(layer, {}).addTo(map.mapa);

		var featureGroup = L.featureGroup().addTo(map.mapa);

		map.grupo = featureGroup;
		map.options = options;
		_mapas[options.id] = map;
		// TODO eventosMapa (map, options);
	}


	function defaultOptions() {

		return {
			click: null,
			_contenedor: null,
			height: 0,
			// iconoMarca: '/lib/mapa/localizador.png',	// TODO objeto marca
			scrollWheel: false,
			lat: 0,
			lng: 0,
			width: 0,
			zoom: 5
		};
	}


	Mapa.prototype._apiLoaded = function () {

		_api.loaded = true;
		if (_api.done) apiReady ();
	}


	function apiReady () {

		var l = _api.ready.length;

		for (var i = 0; i < l; i++) { _api.ready[i](); }
	};


	function loadApi(options) {

		if (_api.loaded) return create(options);

		// <link rel="stylesheet" href="/lib/leaflet/leaflet.css"/>
		// <script src="/lib/leaflet/leaflet.js"></script>

		if (!_api.loading) {
			_api.loading = true;
			_api.ready.push(function () { create(options); });

			Promise.all([
				load.js('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.js'),
				load.css('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.css'),
			]).then(function() {
				// console.log('Map lo aded!');
				_api.done = true;
				self._apiLoaded();
			});
		} else _api.ready.push(function () { create(options) });

		// if (!_api.loading) {
		// 	_api.loading = true;
		// 	_api.ready.push(function () { create(options); });

		// 	$.ajax(load).done(function () {
		// 		_api.done = true;
		// 		if (_api.loaded) apiReady();
		// 	}).fail(function () { alert('No se ha podido inifmapacializar la api de maps'); });

		// } else _api.ready.push(function () { create(options) });
	}


	Mapa.prototype.marca = function (id, opciones) {

		if (!_api.loaded) _api.ready.push(function () { self.marca(id, opciones); });
		var mapa = _mapas[id];

		if (!mapa) return null;
		if (!opciones) return alert('Tiene que indicar unas opciones de marca');

		if (!mapa.marcas) mapa.marcas = {};
		if (opciones.id && mapa.marcas[opciones.id]) {
			var marca = mapa.marcas[opciones.id];
			if (opciones.lat && opciones.lng) marca.setLatLng(new L.LatLng (opciones.lat, opciones.lng));
			if (!opciones.opacity && opciones.visible === false) marca.setOpacity(0);
			if (!opciones.opacity && opciones.visible === true) marca.setOpacity(1);
			if (opciones.opacity) marca.setOpacity(opciones.opacity);
			return marca;
		}

		if (!opciones.lat && !opciones.lng) return marca;

		var marcaOpt = {};

		var id = opciones.id || ' _m' + self._index++;
		if (opciones.icon) marcaOpt.icon = L.icon(opciones.icon);
		marcaOpt.draggable = opciones.draggable || false;

		let marker = L.marker(new L.LatLng (opciones.lat, opciones.lng), marcaOpt);

		if (opciones.html) {
			var html = getPopup(elem, popup);
			marker.bindPopup(html);
			marker.on('click', () => {
				marker.openPopup();
			});
		}
		if (opciones.onclick) marker.on('click', () => { opciones.onclick() });

		marker.addTo(mapa.grupo);

		mapa.marcas[id] = marker;
		// TODO dragend if (opciones.dragend) google.maps.event.addListener(mapa.marcas[id], 'dragend', opciones.dragend);

		return mapa.marcas[id];
	}


	Mapa.prototype.mapa = function (id, opciones) {

		if (!id) return alert('Tiene que indicar un identificador');
		if (!opciones) opciones = {};
		opciones.id = id;
		var options = $.extend(true, defaultOptions(), opciones);

		loadApi(options);
	}


	Mapa.prototype.zoom = function (id, options) {

		if (!_api.loaded) _api.ready.push(function () { self.zoom(id, options); });
		if (!_mapas[id]) return null;
		if (!options) return _mapas[id].mapa.getZoom();
		if (!options.zoom) return _mapas[id].mapa.getZoom();
		_mapas[id].mapa.setZoom(options.zoom || 11);
	}


	Mapa.prototype.buscar = function (id, options) {

		if (!_mapas[id]) return null;

		var buscar = [];
		if (options.codigoPostal) buscar.push('postalcode=' + options.codigoPostal);
		if (options.direccion) buscar.push('street=' + options.direccion + options.direccion2 ? ' ' + options.direccion2 : '');
		if (options.localidad) buscar.push('city=' + options.localidad);
		if (options.pais) buscar.push('country=' + options.pais);
		buscar.push('format=json');

		var promise = new Promise(function (resolve, reject) {
			$.get('https://nominatim.openstreetmap.org/search?' + buscar.join('&')).then(function (data) {
				if (data && data.length) {
					var punto = data[0];
					var latlng = new L.LatLng(punto.lat, punto.lon);

					if (options.centrar) {
						self.center(id, { lat: punto.lat, lng: punto.lon, flyTo: true });
					}

					if (!options.marca) return resolve();
					else {
						var marker = self.marca(id, { id: options.marca })
						marker.setLatLng(latlng);
					}
				} else {
					reject('No se han encontrado resultados. Revisa la dirección.');
				}
			}, function () {
				reject('Error buscando. El servicio no funciona');
			});
		});
		return promise;
	};


	win.Mapa = new Mapa();

	/////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////



	// Mapa.prototype.click = function (id, options) {

	// 	if (!options.marca) return;
	// 	if (!_api.loaded) _api.ready.push(function () { self.click(id, options); });
	// 	if (!_mapas[id]) return null;

	// 	var marca = self.marca(id, { id: options.marca });
	// 	if (!marca) return;
	// 	if (marca.info) marca.info();
	// 	return marca;
	// }


	// Mapa.prototype.opciones = function (id, opciones) {

	// 	if (!_api.loaded) _api.ready.push(function () { self.opciones(id, opciones); });
	// 	var mapa = _mapas[id];

	// 	mapa.setOptions(opciones);
	// }


	// Mapa.prototype.sinCapas = function (id) {

	// 	if (!_api.loaded) _api.ready.push(function () { self.sinCapas(id); });
	// 	var mapa = _mapas[id];
	// 	if (!mapa) return null;
	// 	mapa.overlayMapTypes.clear();
	// }



	// function eventosMapa(mapa, options) {

	// 	if (options.click)
	// 		google.maps.event.addListener(mapa,
	// 			'click',
	// 			function (event) {
	// 				options.click.call(mapa, event.latLng.lat(), event.latLng.lng());
	// 			}
	// 		);

	// 	if (options.minZoom)
	// 		google.maps.event.addListener(mapa,
	// 			'zoom_changed',
	// 			function () {
	// 				if (mapa.getZoom() < options.minZoom)
	// 					mapa.setZoom(options.minZoom);
	// 			}
	// 		);
	// }

	// Mapa.prototype.removeListeners = function (id, listeners) {

	// 	if (!_api.loaded) _api.ready.push(function () { self.removeListeners(id, opciones); });
	// 	var mapa = _mapas[id];
	// 	if (!mapa) return null;

	// 	for (var i = listeners.length - 1; i >= 0; i--) google.maps.event.clearListeners(mapa, listeners[i]);
	// }


	// Mapa.prototype.linea = function (id, opciones) {

	// 	if (!_api.loaded) _api.ready.push(function () { self.linea(id, opciones); });
	// 	var mapa = _mapas[id];

	// 	if (!mapa) return null;
	// 	if (!opciones) return alert('Tiene que indicar unas opciones de línea');
	// 	if (opciones.delete) return lineaDelete(mapa, opciones.id);
	// 	if (!opciones.puntos) return alert('Tiene que indicar un array de puntos');

	// 	var linea = {};
	// 	var id = opciones.id || ' _l' + self._index++;
	// 	var l = opciones.puntos.length;

	// 	if (!mapa.lineas) mapa.lineas = {};

	// 	linea.path = [];
	// 	for (var i = 0; i < l; i++) linea.path.push(new google.maps.LatLng(opciones.puntos[i][0], opciones.puntos[i][1]));

	// 	linea.strokeColor = opciones.color || '#0000ff';
	// 	linea.strokeWeight = opciones.ancho || 3;
	// 	linea.editable = opciones.editable || false;
	// 	if (opciones.zIndex) linea.zIndex = opciones.zIndex;

	// 	mapa.lineas[opciones.id] = new google.maps.Polyline(linea);
	// 	if (opciones.onclick) google.maps.event.addListener(mapa.lineas[opciones.id], 'click', opciones.onclick);
	// 	mapa.lineas[opciones.id].setMap(mapa);

	// 	// else if (linea.info) google.maps.event.addListener (polilinea, 'click', function (event) {
	// 	// 	var info = new google.maps.InfoWindow ({position: event.latLng, content: linea.info});
	// 	// 	info.open (mapa);
	// }


	// function lineaDelete(mapa, id) {

	// 	if (mapa.lineas && mapa.lineas[id]) {
	// 		mapa.lineas[id].setMap(null);
	// 		mapa.lineas[id] = null;
	// 	}
	// 	return true;
	// }




}(window));
