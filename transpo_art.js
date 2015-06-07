var width = window.innerWidth,
    height = window.innerHeight;

var projection = d3.geo.mercator()
    .center([-75.25, 40.03])
    .scale(100000);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

var bikeshareG = svg.append("g").attr('id', 'bikeshare');

var subwayGs = {};
var trolleyGs = {};

var bikeshareData, bikeshareIndex = 0;
var subwayData = {}, subwayIndex = {};
var trolleyData = {}, trolleyIndex = {};
var currentTime = 0;


function tick() {
  if (currentTime >= 86400) { currentTime = 0; }
  currentTime += 15 * 60;

  if (bikeshareData) {
    if (bikeshareIndex >= bikeshareData.length) { bikeshareIndex = 0; }
    twinkleBikes(bikeshareData[bikeshareIndex]);
    bikeshareIndex++;
  }

  var routename;
  for (routename in subwayGs) {
    if (subwayData[routename]) {
      if (subwayIndex[routename] >= subwayData[routename].length) { subwayIndex[routename] = 0; }
      crawlSubway(subwayGs[routename], subwayData[routename][subwayIndex[routename]]);
      subwayIndex[routename]++;
    }
  }

  for (routename in trolleyGs) {
    if (trolleyData[routename]) {
      if (trolleyIndex[routename] >= trolleyData[routename].length) { trolleyIndex[routename] = 0; }
      crawlTrolley(trolleyGs[routename], trolleyData[routename][trolleyIndex[routename]]);
      trolleyIndex[routename]++;
    }
  }
}
setInterval(tick, 2000);


function initializeBaseLayer() {
  // Load the shape of Philadelphia, divided into census tracts.
  d3.json("tracts.topojson", function(error, topology) {
      g.selectAll("path")
          .data(topojson.object(topology, topology.objects.tracts).geometries)
        .enter().append("path")
          .attr("class", "tracts")
    .attr("id", function(d){return d.id;})
    .attr("d", path);
  });
}

/* ========================================================
 * Bike Share
 * ========================================================
 */

function initializeBikeshareStations() {
  // Load an initiali feed of bike share stations.
  d3.json("bikeshare.geojson", function(error, json) {
      bikeshareG.selectAll("circle")
          .data(json.features)
        .enter().append("circle")
          .attr("class", "bikeshare")
          .attr("transform", function(d) {
              return "translate(" + projection(d.geometry.coordinates) + ")";
            })
          .attr("r", 2)
          .style('opacity', 0)
    .attr("d", path);
  });
}


function loadDayOfBikeshare() {
  var allData = {},
      sortedData = [];

  $.ajax({
    url: 'es_logstash-phl-ind-2015.05.28',
    dataType: 'json',
    success: function(data) {
      data.forEach(function (d) {
        var key = d._source['@timestamp'].slice(0, 16);
        if (!allData[key]) { allData[key] = []; }
        allData[key].push(d);
      });

      _.keys(allData).sort().forEach(function(k) {
        sortedData.push(allData[k]);
      });

      bikeshareData = sortedData;
    }
  });
}


function twinkleBikes(json) {
  var mappedJson = {};

  json.forEach(function(d) {
    mappedJson[d._source.properties.kioskId] = d;
  });

  bikeshareG.selectAll('circle')
    .classed('is-twinkling', false)
    .classed('is-twinkling', function(d) {
      var newd = mappedJson[d.properties.kioskId];
      var hasChanged = newd._source.properties.bikesAvailable != d.properties.bikesAvailable;

      d.properties.bikesAvailable = newd._source.properties.bikesAvailable;

      return hasChanged;
    });
}



/* ========================================================
 * Subways (BSL & MFL)
 * ========================================================
 */

// Stop 1281 is City Hall on the BSL
// Stop 20659 and 31140 is the 15th St. Trolley Station
// Stop 32175 is 15th St on the El.

function initRail(name, railGs, railIndex) {
  // var mflArea = d3.svg.area()
  //   .x0(function(d) { return projection(d.lng) - 1; })
  //   .x1(function(d) { return projection(d.lng) + 1; })
  //   .y0(function(d) { return projection(d.lat) - 1; })
  //   .y1(function(d) { return projection(d.lat) + 1; });

  railGs[name] = svg.append('g').attr('id', 'route-' + name);
  railIndex[name] = 0;

  d3.json(name + "_stops.json", function(error, json) {
    railGs[name].selectAll('circle')
        .data(json)
      .enter().append('circle')
        .attr("class", 'route-' + name)
        .attr("transform", function(d) {
            return "translate(" + projection([d.stop_lon,d.stop_lat]) + ")";
          })
        .attr("r", function(d) {
            return 1;
          });
  });

  // each stop will have a thickness corresponding to the frequency of train trips.

  // stopid: {
  //   lat
  //   lng
  //   time
  // }
}


function initSubway(name) {
  initRail(name, subwayGs, subwayIndex);
}

function initTrolley(name) {
  initRail(name, trolleyGs, trolleyIndex);
}


function crawlSubway(g, json) {
  g.selectAll('circle')
    .transition()
      .duration(2000)
      .ease('linear')
      .attr('r', function(d) {
        var stopid = d['stop_id'];
        var newcount = json[stopid] || 2;
        return newcount;
      });
}


function crawlTrolley(g, json) {
  g.selectAll('circle')
    .transition()
      .duration(2000)
      .ease('linear')
      .style('opacity', function(d) {
        var stopid = d['stop_id'];
        var newcount = (json[stopid] || 0) / 10.0;
        return newcount;
      });
}


function loadDayOfSubwayTrips(name) {
  $.ajax({
    url: name.toLowerCase() + '.json',
    dataType: 'json',
    success: function(data) {
      subwayData[name] = data;
    }
  });
}


function loadDayOfTrolleyTrips(name) {
  $.ajax({
    url: name.toLowerCase() + '.json',
    dataType: 'json',
    success: function(data) {
      trolleyData[name] = data;
    }
  });
}


/* ========================================================
 * Buses
 * ========================================================
 */

var paths = {};
function initPaths() {
  $.ajax({
    url: 'shapes.json',
    dataType: 'json',
    success: function(data) {
      for (var routename in data) {
        var shape = data[routename];
        var d = '', elem;

        shape.forEach(function(coord) {
          coord = projection(coord);
          if (d) { d += ' L '; }
          else   { d += 'M '; }
          d += coord[0] + ',' + coord[1];
        });
        // d += ' Z';
        elem = createSvgElem('path', {
          'd': d,
          'id': 'route-' + routename + '-path'
        });

        paths[routename] = {
          route: routename,
          start: projection(shape[0]),
          coords: shape,
          elem: elem
        };

        shootBus(routename);
      }
      console.log('initialized paths');
    }
  });
}

var shooters = {};
var shooterLength = 5;
function shootBus(routename) {
  var root = svg[0][0];

  var shooter = {
    group: document.getElementById(routename + '-group') ||
           createSvgElem('g', {'id': routename + '-group'}, root),
    path: paths[routename],

    // offset each shooter a little
    wiggle: [Math.random() * 10 - 5, Math.random() * 10 - 5],

    getPointAlongPath: function(length) {
      if (!this.path.history) {
        this.path.history = {};
      }

      if (!this.path.history[length]) {
        this.path.history[length] = this.path.elem.getPointAtLength(length);
      }

      return this.path.history[length];
    }
  };

  shooter.positions = [];
  shooter.elems = [];
  for (var i = 0; i < shooterLength; i++) {
    shooter.positions[i] = shooter.path.start;
    shooter.elems[i] = createSvgElem('path', {'class': 'shooter-segment shooter-segment-' + i}, shooter.group);
  }
  shooter.positions[shooterLength] = shooter.path.start;

  // shooter.position = shooter.path.start;
  // shooter.elem = createSvgElem('circle', {
  //   r: '2',
  //   cx: shooter.path.start[0] + shooter.wiggle[0],
  //   cy: shooter.path.start[1] + shooter.wiggle[1]
  // });
  // shooter.group.appendChild(shooter.elem);

  shooter.progress = 0;

  var timeoutid = setInterval(function() {
    var p, i, start, end;

    shooter.progress += 5;
    p = shooter.getPointAlongPath(shooter.progress);

    if (p.x === shooter.positions[shooterLength-1][0] && p.y === shooter.positions[shooterLength-1][1]) {
      clearTimeout(timeoutid);
      shooter.elems.forEach(function(elem) { shooter.group.removeChild(elem); });
      // shooter.group.removeChild(shooter.elem);
      shootBus(routename);
      return;
    }

    for (i = shooterLength; i > 0; i--) {
      shooter.positions[i] = shooter.positions[i - 1];
    }
    shooter.positions[0] = [p.x, p.y];

    for (i = 0; i < shooterLength; i++) {
      start = shooter.positions[i];
      end = shooter.positions[i + 1];
      shooter.elems[i].setAttribute('d', 'M ' + start[0] + ',' + start[1] + ' L ' + end[0] + ',' + end[1]);
    }

    // shooter.elem.setAttribute('cx', p.x + shooter.wiggle[0]);
    // shooter.elem.setAttribute('cy', p.y + shooter.wiggle[1]);
    // shooter.position = [p.x, p.y];
  }, 100);

  return shooter;
}


function createSvgElem(tagname, attrs, parent) {
  var elem = document.createElementNS('http://www.w3.org/2000/svg', tagname);
  for (var key in attrs) {
    elem.setAttribute(key, attrs[key]);
  }

  if (parent) {
    parent.appendChild(elem);
  }

  return elem;
}