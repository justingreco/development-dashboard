var config = {
		search: {
		url: 'http://maps.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query',
		field: 'ADDRESS'
	},
	fields: {
		devplans: [
			{name: "plan_number", alias: "Plan #", type: "text"},
			{name: "plan_name", alias: "Plan Name", type: "text", header: "yes", title: true},
			{name: "plan_type", alias: "Plan Type", type: "text", title: true, summary: true},
			{name: "submitted", alias: "Submitted", type: "date"},
			{name: "owner", alias: "Owner", type: "text", title: true},
			{name: "engineer", alias: "Engineer", type: "text", title: true},
			{name: "acreage", alias: "Acres", type:"text"}
		],
		permits: [
			{name: "permit_num", alias: "Permit #", type: "text"},
			{name: "proposed_work", alias: "Proposed Work", type: "text", title: true},
			{name: "authorized_work", alias: "Authorized Work", type: "text", title: true},
			{name: "permitted_work_type", alias: "Permitted Work", type: "text", title: true, summary: true},
			{name: "development_plan", alias: "Development", type: "text", title: true},
			{name: "address", alias: "Address", type: "text", header: "yes", title: true},
			{name: "issue_date", alias: "Issued", type:"date"},
			{name: "completion_date", alias: "Completed", type: "text"},
			{name: "owner", alias: "Owner", type: "text", title: true},
			{name: "contractor", alias: "Contractor", type: "text", title: true},
			{name: "cost", alias: "Cost", type:"currency"}
		]
	}
}

var map, markers, heatLayer, bufferLayer, address;

function setHeaders (table, props) {
	var row = $("thead>tr", table).empty();
	// $.each(props, function (key, value) {
	// 	row.append('<th>' + key.split("_").join(" ") + '</th>');
	// });
	$(config.fields[$("option:selected", "#dataSelect").val()]).each(function (i, f) {
		row.append('<th>' + f.alias + '</th>');
	});
}

function checkValueFormat (c, f) {
	var value = c.properties[f.name];
	if (f.type === "date") {
		value = moment(c.properties[f.name], 'YYYYMMDD').format('l');
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
		cats = [];
	chartData = [];
	setHeaders(table, data[0].properties);

	$(data).each(function (i, c) {
		var row = $('<tr data-lat="'+data[i].geometry.coordinates[1]+'" data-lon="'+data[i].geometry.coordinates[0]+'"></tr>').appendTo(body);
		// $.each(c.properties, function (key, value) {
		// 	$('<td>' + value + '</td>').appendTo(row);
		// });
		$(config.fields[$("option:selected", "#dataSelect").val()]).each(function (i, f) {
			$('<td>' + checkValueFormat(c, f) + '</td>').appendTo(row);
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
		row.click(function () {
			map.setView([$(this).data('lat'), $(this).data('lon')], 18);
		});
	});
	if($('#tableToggle .active>input').prop('id') === 'chartRadio') {
		buildChart(chartData);
	}
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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
	$.ajax({
		url: "http://python-greconcsu.rhcloud.com/ws/"+doc+"/near",
		data: {
			lat: lat,
			lon: lon,
			dist: dist,
			from: parseInt(fromDt),
			to: parseInt(toDt)
		},
		dataType: "json",
		success: function (data) {
			markers.clearLayers();
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
				}
			}));
		}
	});
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
	map = L.map('map').setView([35.7769, -78.6436],12);
	L.tileLayer('https://{s}.tiles.mapbox.com/v3/examples.map-vyofok3q/{z}/{x}/{y}.png',{attribution: 'Map data OpenStreetMap contributors'}).addTo(map);
	markers = new L.MarkerClusterGroup().addTo(map);
    heatLayer = L.heatLayer([], {radius: 25});
    L.control.layers({}, {"Cluster": markers, "Heat Map": heatLayer}).addTo(map);

    bufferLayer = L.featureGroup().addTo(map);
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
    	$("#table").toggle();
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