var config = {
		search: {
		url: 'http://maps.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query',
		field: 'ADDRESS'
	},
	fields: {
		// devplans: [
		// 	{name: "plan_number", alias: "Plan #", type: "text"},
		// 	{name: "plan_name", alias: "Plan Name", type: "text", header: "yes", title: true},
		// 	{name: "plan_type", alias: "Plan Type", type: "text", title: true, summary: true},
		// 	{name: "submitted", alias: "Submitted", type: "date", order: true},
		// 	{name: "owner", alias: "Owner", type: "text", title: true},
		// 	{name: "engineer", alias: "Engineer", type: "text", title: true},
		// 	{name: "acreage", alias: "Acres", type:"text"},
		// 	{name: "status", alias:"Status", type:"text"}
		// ],
		devplans: [
			{name: "plan_number", alias: "Plan #", type: "text"},
			{name: "plan_name", alias: "Plan Name", type: "text", header: "yes", title: true},
			{name: "plan_type", alias: "Plan Type", type: "text", title: true, summary: true},
			{name: "submitted", alias: "Submitted", type: "date", order: true},
/*			{name: "owner", alias: "Owner", type: "text", title: true},
*/			{name: "engineer", alias: "Engineer", type: "text", title: true},
			{name: "acreage", alias: "Acres", type:"text"},
			{name: "status", alias:"Status", type:"text"}
		],
		permits: [
			{name: "permit_number", alias: "Permit #", type: "text"},
			{name: "proposed_work", alias: "Proposed Work", type: "text", title: true},
			{name: "authorized_work", alias: "Authorized Work", type: "text", title: true},
			// {name: "permitted_work_type", alias: "Permitted Work", type: "text", title: true, summary: true},
			// {name: "development_plan", alias: "Development", type: "text", title: true},
			{name: "address", alias: "Address", type: "text", header: "yes", title: true},
			{name: "issue_date", alias: "Issued", type:"text", order: true},
			// {name: "completion_date", alias: "Completed", type: "date"},
			{name: "owner_name", alias: "Owner", type: "text", title: true},
			{name: "contractor_name", alias: "Contractor", type: "text", title: true},
			{name: "square_feet", alias: "Sq. Footage", type: "text", title: true},
			{name: "cost_of_construction", alias: "Cost", type:"currency"}
		]
	}
}

var map, markers, heatLayer, bufferLayer, address, dataTable, addressField;

function setHeaders (table) {
	var row = $("thead>tr", table).empty();
}

function checkValueFormat (c, f) {
	var value = c.properties[f.name];
	if (f.type === "date") {
		value = moment(c.properties[f.name]).format('l');
	} else if (f.type === "currency") {
		value = "$" + value.toString();
	}
	if (f.title) {
		value = toTitleCase(value);
	}
	return value;
}

function buildChart (data) {
	nv.addGraph(function() {
	  var chart = nv.models.pieChart()
	      .x(function(d) { return d.label })
	      .y(function(d) { return d.value })
	      .showLabels(true)
	      .labelType("percent");

	    d3.select("#chart svg")
	        .datum(data)
	      .transition().duration(1200)
	        .call(chart);

	  return chart;
	});
}
var chartData = [];
function buildTable (data) {
	var table = $("#table"),
		body = $('tbody', table).empty(),
		cats = [],
		columns = [],
		orderIdx = 0;

	$.each(config.fields[$("option:selected", "#dataSelect").val()], function(index, val) {
		var column = {"title": val.alias, "data": "properties." + val.name, "type": val.type};
		if (val.type === "date") {
			column.render = function (data, type, full, meta) {
				var d = "";
				if (data.length > 0) {
					d = moment(data).format('MM/DD/YYYY');
				}
				return d;
			}
		} else if (val.type === "currency") {
			column.render = function (data, type, full, meta) {
				return "$" + data;
			}
		}
		if (val.order) {
			orderIdx = index;
		}
		columns.push(column);
	});



	chartData = [];
	setHeaders(table);
	// if (dataTable) {
	// 	if ( $.fn.dataTable.isDataTable( '#table' ) ) {
	// 	    dataTable.destroy();
	// 	}
	// }
	$('#tablediv').empty().append('<table id="table" class="table table-striped table-condensed table-hover"></table>');
	$( '#table' ).DataTable({"columns": columns, "data": data.features,  "destroy": true, "order": [[orderIdx, 'desc']],
		"createdRow": function (row, data, index) {
			$(row).data("lat", data.geometry.coordinates[1]);
			$(row).data("lng", data.geometry.coordinates[0]);
		}});
	$("#table tr").click(function (){
		map.setView([$(this).data('lat'), $(this).data('lng')], 18);
	});
	$(data.features).each(function (i, c) {
		$(config.fields[$("option:selected", "#dataSelect").val()]).each(function (i, f) {
			if (f.summary) {
				var value = c.properties[f.name];
				if ($.inArray(value, cats) === -1) {
					cats.push(value);
					chartData.push({'label': value, 'value': 1});
				} else {
					var arr = $(chartData).filter(function (i) {
						return this.label === value;
					});
					if (arr.length > 0) {
						arr[0].value += 1;
					}
				}
			}
		});
	});
	if($('#tableToggle .active>input').prop('id') === 'chartRadio') {
		buildChart(chartData);
	}
}

function toTitleCase(str)
{
	if (str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}
}

function buildDevplanUrl (type, number) {
	var arr = number.split("-"),
		year = arr[2],
		num = arr[1],
		zeros = 3 - num.toString().length;
	if (zeros === 2) {
		num = "00"+num.toString();
	} else if (zeros === 1) {
		num = "0"+num.toString();
	}

	var file = arr[0]+"-"+num+"-"+arr[2].substr(2,3)+".pdf";
	type = type.replace("ADMINISTRATIVE ", "");
	console.log(type);
	var typeArr = toTitleCase(type).split(" ");

	type = (typeArr.length === 1) ? typeArr[0] : typeArr[0]+typeArr[1];

	return "http://www.raleighnc.gov/content/PlanDev/Documents/DevServ/DevPlans/Reviews/"+year+"/"+type+"/"+file;
}

function getChartData (doc, lat, lon, dist, field) {
	$.ajax({
		url: "http://python-greconcsu.rhcloud.com/ws/"+doc+"/near",
		data: {
			lat: lat,
			lon: lon,
			dist: dist,
			from: parseInt(fromDt),
			to: parseInt(toDt),
			field: field
		},
		dataType: "json",
		success: function (data) {

	}});
}

var jsonToGeoJson = function (data) {
	var geojson = {"type": "FeatureCollection", "features": []};
	$(data).each(function (i, item) {
		var feat = {"type":"Feature", "properties": {}, "geometry": {
			"type":"Point",
			"coordinates": [item[addressField].longitude, item[addressField].latitude]
		}};
		$(config.fields[$("option:selected", "#dataSelect").val()]).each(function (i, fld) {
			if (fld.name === 'address') {
				feat.properties.address = $.parseJSON(item.address.human_address).address;
			} else {
				if (item[fld.name]) {
					feat.properties[fld.name] = item[fld.name];
				} else {
					feat.properties[fld.name] = '';
				}
			}
		});
		geojson.features.push(feat);
	});
	return geojson;
};

function getDevelopmentData (doc, lat, lon, dist) {
	bufferLayer.clearLayers();
	var circle = L.circle(L.latLng(lat, lon),
		$("#distance option:selected").val(), {
			color: 'red',
			fillOpacity: 0
		}).addTo(bufferLayer),
	 	fromDt =$('#datetimepicker1').data("DateTimePicker").getDate().format('YYYYMMDD'),
	 	toDt = $('#datetimepicker2').data("DateTimePicker").getDate().format('YYYYMMDD');

	map.fitBounds(circle.getBounds());

	var pt = {
	  "type": "Feature",
	  "properties": {},
	  "geometry": {
	    "type": "Point",
	    "coordinates": [lon, lat]
	  }
	};


	//var buffer = turf.buffer(pt, dist, 'meters');
	//bufferLayer = L.geoJson(buffer, {style: {color:'red', fillOpacity: 0}}).addTo(map);
	//map.fitBounds(bufferLayer.getBounds());
	//var jsonconverter = geoJsonConverter();
	//var esriShape = jsonconverter.toEsri(buffer);
	//console.log(esriShape);
	//console.log(JSON.stringify(esriShape.features[0].geometry));
	//var url = 'http://mapstest.raleighnc.gov/arcgis/rest/services/Planning/Development/MapServer/' + ((doc === 'devplans') ? '0' : '1') + '/query' ;
	var url = 'https://data.raleighnc.gov/resource/' + ((doc === 'devplans') ? 'ym9a-r7eh':'hk3n-ieai') + '.json';
	addressField = ((doc === 'devplans') ? 'geocoded_planaddr' :'address');
	var datefield = ((doc === 'devplans') ? 'submitted' : 'issue_date');
	$.ajax({
		url: url,//"http://python-greconcsu.rhcloud.com/ws/"+doc+"/near",
		type: 'GET',
		data: {
			// geometry: JSON.stringify(esriShape.features[0].geometry),
			// geometryType: 'esriGeometryPolygon',
			// where: 'INSERTED >= ' + fromDt + ' AND INSERTED <= ' + toDt,
			// returnGeometry: true,
			// outFields: '*',
			// outSR: 4326,
			// inSR: 4326,
			// f: 'json'
			'$where':'within_circle(' + addressField +','+lat+','+lon+','+dist+") and " + datefield + ">='"+ fromDt + "' and "+ datefield +"<='" + toDt + "'"
			// lat: lat,
			// lon: lon,
			// dist: dist,
			// from: parseInt(fromDt),
			// to: parseInt(toDt)
		},

	headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		dataType: "json",
		success: function (data) {

			console.log(data);
			markers.clearLayers();
			heatLayer.setLatLngs([]);
			//var conv = esriConverter();
			//data = conv.toGeoJson(data);
			//console.log(data);
			data = jsonToGeoJson(data);
			buildTable(data);

			markers.addLayer(L.geoJson(data, {
				onEachFeature: function (feature, layer) {
					var fields = config.fields[doc],
						content = "";
					var headers = $(fields).filter(function (i) {
						return this.header;
					});
					var infos = $(fields).filter(function (i) {
						return !this.header;
					});
					if (headers.length > 0) {
						content += "<h5>"+checkValueFormat(feature, headers[0])+"</h5>";
					}

					if (infos.length > 0) {
						$(infos).each(function(i, info) {
							content += "<span><strong>" + info.alias + ":</strong>  " + checkValueFormat(feature, info) + "</span><br/>";
						});
					}
					if ($("option:selected", "#dataSelect").val() === "devplans") {
						content += "<a href='" + buildDevplanUrl(feature.properties.plan_type, feature.properties.plan_number) + "' target='_blank'>Link</a>";
					}
					layer.bindPopup(content);
					if (heatLayer) {
						heatLayer.addLatLng([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
					}
					if (doc === 'devplans') {
						setIcon(feature, layer);
					}
				}
			}));
		}
	});
}

function setIcon (feature, layer) {
	var url = '';
	switch (feature.properties.plan_type) {
		case 'SITE PLAN':
			url = 'static/img/icons/marker-sp';
		break;
		case 'SUBDIVISION':
			url = 'static/img/icons/marker-s';
		break;
		case 'SPECIAL USE':
			url = 'static/img/icons/marker-su';
		break;
		case 'MASTER PLAN':
			url = 'static/img/icons/marker-mp';
		break;
		case 'GROUP HOUSING':
			url = 'static/img/icons/marker-gh';
		break;
		case 'PLAN APPROVAL':
			url = 'static/img/icons/marker-pa';
		break;
		case 'MINOR SUBDIVISION':
			url = 'static/img/icons/marker-ms';
		break;
		case 'SHOPPING CENTER':
			url = 'static/img/icons/marker-sc';
		break;
		case 'INFILL RECOMBINATION':
			url = 'static/img/icons/marker-ir';
		break;
		case 'ADMINISTRATIVE SITE REVIEW':
			url = 'static/img/icons/marker-sr';
		break;
	}
	var icon = L.icon({iconUrl: url + '.png', iconRetina: url + '-2x.png'});
	layer.setIcon(icon);
}

function searchByAddress (value, dataset) {
	$.ajax({
		url: config.search.url,
		format: 'jsonp',
		data: {
			f: 'json',
			returnGeometry: true,
			where: config.search.field + " = '" + value + "'",
			outSR: 4326
		}
	}).done(function (data) {
		var data = $.parseJSON(data);
		if (data.features.length > 0) {
			address = data.features[0].geometry;
			getDevelopmentData($("option:selected", "#dataSelect").val(), address.y, address.x, $("#distance option:selected").val());
			//getChartData($("option:selected", "#dataSelect").val(), address.y, address.x, $("#distance option:selected").val());
		}
	});
}
var addresses = [];
function setAddressSearch () {
	$("#address").typeahead({
		name: 'addresses',
		remote: {
			//url: config.search.url + '?f=json&where=UPPER(' + config.search.field + ") LIKE UPPER('%QUERY%')&outFields=" + config.search.field + "&returnGeometry=false",
			url: "http://python-greconcsu.rhcloud.com/ws/addresses/like?input=%QUERY&limit=5",
			filter: function (resp) {
				addresses = resp;
				var values = [];
				//$(resp.features).each(function (i, feature) {
				//	values.push(feature.attributes[config.search.field]);
				//});
				$(resp).each(function(i, a) {
					values.push(a.properties.ADDRESS);
				});
				return values;
			}
		}
	}).on('typeahead:selected', function(obj, datum, dataset) {
		//searchByAddress(datum.value, dataset);
		var matches = $(addresses).filter(function (i) {
			return this.properties.ADDRESS === datum.value;
		});
		if (matches.length > 0) {
			address = matches[0].geometry.coordinates;
			getDevelopmentData($("option:selected", "#dataSelect").val(), matches[0].geometry.coordinates[1], matches[0].geometry.coordinates[0], $("#distance option:selected").val());
		}
	});;
}

function setChart() {

}

var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();




$(document).ready(function () {

	map = L.map('map', {drawControl:false, minZoom: 10, fullscreenControl: true}).setView([35.7769, -78.6436],11);
      	L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{maxZoom: 16,
					attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'}).addTo(map);
	//L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom: 16, attribution: 'Esri, DeLorme, NAVTEQ'}).addTo(map);
//map = L.map('map').setView([35.7769, -78.6436],12);
	var lc = L.control.locate().addTo(map);

	map.on("locationfound", function (location){
		lc.stopLocate();
		address = [location.latlng.lng, location.latlng.lat];
		getDevelopmentData($("option:selected", "#dataSelect").val(), location.latlng.lat, location.latlng.lng, $("#distance option:selected").val());
	});

	map.on("click", function (location) {
		address = [location.latlng.lng, location.latlng.lat];
		getDevelopmentData($("option:selected", "#dataSelect").val(), location.latlng.lat, location.latlng.lng, $("#distance option:selected").val());
	});
//	L.tileLayer('https://{s}.tiles.mapbox.com/v3/examples.map-vyofok3q/{z}/{x}/{y}.png',{attribution: 'Map data OpenStreetMap contributors'}).addTo(map);
	markers = new L.MarkerClusterGroup().addTo(map);
    heatLayer = L.heatLayer([], {radius: 25});
    L.control.layers({}, {"Cluster": markers, "Heat Map": heatLayer}).addTo(map);

    bufferLayer = L.featureGroup().addTo(map);
    bufferLayer.on("click", function (location) {
		address = [location.latlng.lng, location.latlng.lat];
		getDevelopmentData($("option:selected", "#dataSelect").val(), location.latlng.lat, location.latlng.lng, $("#distance option:selected").val());
	});
    setAddressSearch();
    setChart();
    //getDevelopmentData($("option:selected", "#dataSelect").val());
    var dt = new Date();
    dt.setFullYear(dt.getFullYear() - 1);
	$('#datetimepicker1').datetimepicker({pickTime: false, defaultDate: dt});
	$('#datetimepicker2').datetimepicker({pickTime: false, defaultDate: new Date()});
	$("#search").click(function () {
		getDevelopmentData($("option:selected", "#dataSelect").val(), address[1], address[0], $("#distance option:selected").val());
	});
    $("#dataSelect").change(function () {
    	//getDevelopmentData($("option:selected", this).val());
    });

    $('input[name="tableToggle"]:radio').change(function() {
    	//$("#tablediv").toggle();
    	$("#chart").toggle();
    	if ($(this).prop("id") === "chartRadio") {
    		buildChart(chartData);
    	}
    });
	// Usage
	$("window").resize(function () {
	    waitForFinalEvent(function(){
	      buildChart(chartData);
	      //...
	    }, 500, "some unique string");
	});


});
