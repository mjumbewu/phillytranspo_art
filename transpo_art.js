var width = 960,
    height = 500;

var projection = d3.geo.mercator()
    .center([-75.16, 39.95])
    .scale(150000);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

var bikeshareG = svg.append("g").attr('id', 'bikeshare');

var mflG = svg.append('g').attr('id', 'mfl');
var bslG = svg.append('g').attr('id', 'bsl');

var bikeshareData, bikeshareIndex = 0;
var mflData, mflIndex = 0;
var bslData, bslIndex = 0;
var currentTime = 0;


function tick() {
  if (currentTime >= 86400) { currentTime = 0; }
  currentTime += 15 * 60;

  if (bikeshareData) {
    if (bikeshareIndex >= bikeshareData.length) { bikeshareIndex = 0; }
    twinkleBikes(bikeshareData[bikeshareIndex]);
    bikeshareIndex++;
  }

  if (mflData) {
    if (mflIndex >= mflData.length) { mflIndex = 0; }
    crawlSubway(mflG, mflData[mflIndex]);
    mflIndex++;
  }

  if (bslData) {
    if (bslIndex >= bslData.length) { bslIndex = 0; }
    crawlSubway(bslG, bslData[bslIndex]);
    bslIndex++;
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
          .attr("r", function(d) {
              return 3;
            })
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



// Stop 1281 is City Hall on the BSL
// Stop 20659 and 31140 is the 15th St. Trolley Station
// Stop 32175 is 15th St on the El.

function initSubway(name, g) {
  // var mflArea = d3.svg.area()
  //   .x0(function(d) { return projection(d.lng) - 1; })
  //   .x1(function(d) { return projection(d.lng) + 1; })
  //   .y0(function(d) { return projection(d.lat) - 1; })
  //   .y1(function(d) { return projection(d.lat) + 1; });

  d3.json(name + "_stops.json", function(error, json) {
    g.selectAll('circle')
        .data(json)
      .enter().append('circle')
        .attr("class", name)
        .attr("transform", function(d) {
            return "translate(" + projection([d.stop_lon,d.stop_lat]) + ")";
          })
        .attr("r", function(d) {
            return 2;
          });
  });

  // each stop will have a thickness corresponding to the frequency of train trips.

  // stopid: {
  //   lat
  //   lng
  //   time
  // }
}

function crawlSubway(g, json) {
  g.selectAll('circle')
    .transition()
      .duration(2000)
      .ease('linear')
      .attr('r', function(d) {
        var stopid = d['stop_id'];
        var newcount = json[stopid] || 10;
        return newcount;
      });
}


function loadDayOfElTrips() {
  $.ajax({
    url: 'mfl.json',
    dataType: 'json',
    success: function(data) {
      mflData = data;
    }
  });
}

function loadDayOfBslTrips() {
  $.ajax({
    url: 'bsl.json',
    dataType: 'json',
    success: function(data) {
      bslData = data;
    }
  });
}
