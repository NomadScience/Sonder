const turf = require('@turf/turf');
const vis = require('code42day-vis-why');
const rtree = require('rtree');

const { clone } = require('cloneextend');
const Offset = require('polygon-offset');
const offset = new Offset()


/*** Utility functions for preparing boundary and centroid collections ***/

const visPercent = (flatCoords, percent) => {
  const pointCount = flatCoords.length;
  return vis(flatCoords,Math.round(pointCount*percent));
}
// Removes all but the exterior ring and simplifies with Visvalingam at 10%
const simpleFlat = (coords) => [visPercent(coords[0],0.10)];

// Separates a multi-poly into multiple uni-polys, runs union, and returns a new multi-poly
// This is in order to deal with cases in which overlapping multipolys break intersect()
const unifyMultiPoly = (multiPoly) => {
  const polys = multiPoly.geometry.coordinates.map(coords => turf.polygon(coords));
  let newPoly = turf.union(...polys);
  newPoly.properties = clone(multiPoly.properties);
  return newPoly;
}
exports.unifyMultiPoly = unifyMultiPoly;

exports.makeCentroidCollection = (featureCollection) => 
  turf.featureCollection(featureCollection.features.map(feature => 
    Object.assign(turf.centroid(feature),{ properties: { label: feature.properties.label } })
  ));

// These will take geoJSON regions, make a single giant poly out of them, and simplify
// Format: [{ collection: featureCollection, properties: { label: "San Francisco" } }]
exports.makeBoundaryCollection = (featureCollectionData) => {
  boundaryCollection = [];

  featureCollectionData.forEach((featureCollectionDatum, index) => {
    const featureCollection = featureCollectionDatum.collection;
    let feature = turf.union(...featureCollection.features);
    const type = feature.geometry.type;
    // Assume either MultiPolygon or Polygon and map accordingly
    feature.geometry.coordinates = (type === 'MultiPolygon') ?
      feature.geometry.coordinates.map(coords => simpleFlat(coords)) : 
      simpleFlat(feature.geometry.coordinates);

    // Apply given properties, if they exist
    feature.properties = featureCollectionDatum.properties || feature.properties;
    // Apply the index, just as in makeIndexedHoods:
    feature.properties.index = index;
    boundaryCollection.push(feature);
    console.log("Finished one.");
  });
  return turf.featureCollection(boundaryCollection);
}

/*** Utility functions for finding and indexing adjacent neighborhoods ***/

// Removes all but the exterior ring, bloats, and returns coords simplified to
//  the original pointCount
const simpleBloat = (coords) => {
  const outerRing = coords[0];
  const pointCount = outerRing.length;
  return [vis(offset.data([outerRing]).margin(0.0003)[0],pointCount)];
}

// Bloats and vis-simplifies to same polycount as source, using only outer rings
const bloatAndSimplify = (feature) => {
  // Deep clone the input to keep the function pure
  feature =  clone(feature);
  const coords = feature.geometry.coordinates;
  const type = feature.geometry.type;
  // Bloat each sub-poly individually if a multipoly
  feature.geometry.coordinates = (type === 'MultiPolygon') ?
    feature.geometry.coordinates.map(coords => simpleBloat(coords)) :
    simpleBloat(feature.geometry.coordinates);
  return (type === 'MultiPolygon') ? unifyMultiPoly(feature) : feature;
}
exports.bloatAndSimplify = bloatAndSimplify;

// Note: bloating is broken and false negatives never happen
exports.findAdjacentHoods = (currentHood, hoodFeatures) => {
  // Grows each poly first, to avoid false negatives:
  const bloatedHood = bloatAndSimplify(currentHood);
  var adjacentHoods = [];
  for (feature of hoodFeatures) {
    if (turf.intersect(bloatedHood, feature)) {
      adjacentHoods.push(feature);
    }
  }
  return adjacentHoods;
}

const growBBox = (bbox, d = 0.0000001) => [bbox[0]-d,bbox[1]-d,bbox[2]+d,bbox[3]+d];

exports.makeIndexedCollectionFast = (hoodCollection, pure) => {
  const start = Date.now();
  if (pure) { hoodCollection = clone(hoodCollection); }
  const hoods = hoodCollection.features;
  const hoodTotal = hoods.length;
  console.log('Initializing adjacent neighborhoods properties');
  const tree = rtree(10);
  tree.geoJSON(hoodCollection);

  hoods.forEach((hood, index) => { 
    hood.properties.index = index;
    hood.properties.adjacents = [];
  });
  let counter = 0;
  for (let centerIndex = 0; centerIndex < hoodTotal; centerIndex++) {
    const centerHood = hoods[centerIndex];
    let centerBBox = growBBox( turf.bbox(centerHood) ); // avoid false negs
    centerBBox= [centerBBox.slice(0,2), centerBBox.slice(2)];
    let candidates = tree.bbox(centerBBox);
    // candidates = Array.from(new Set(candidates).values()); // kill duplicates
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
      const candidateHood = candidates[candidateIndex];
      const adjacentIndex = candidateHood.properties.index;
      if (adjacentIndex === centerIndex) continue;
      if (centerHood.properties.adjacents.indexOf(adjacentIndex) !== -1) continue;
      if (turf.intersect(centerHood, candidateHood)) {
        counter++;
        centerHood.properties.adjacents.push(adjacentIndex);
        candidateHood.properties.adjacents.push(centerIndex);
      }
    }
    console.log("Finished "+centerIndex+' of '+hoodTotal+': "' + centerHood.properties.label+'"');
    console.log("Adjacent indices: " + centerHood.properties.adjacents);
  }
  console.log('Elapsed: '+(Date.now()-start)/1000+' seconds');
  console.log('Intersect called '+counter+' times.');
  return hoodCollection;
}

exports.makeIndexedCollection = (hoodCollection, pure) => {
  const start = Date.now();
  if (pure) { hoodCollection = clone(hoodCollection); }
  const hoods = hoodCollection.features;
  const hoodTotal = hoodCollection.features.length;
  console.log('Initializing adjacent neighborhoods properties');
  // Initialize adjacent properties, add index to make it a little less brittle
  hoods.forEach((hood, index) => { 
    hood.properties.index = index;
    hood.properties.adjacents = [];
  });
  let counter = 0;
  for (let centerIndex = 0; centerIndex < hoodTotal; centerIndex++) {
    const centerHood = hoods[centerIndex];
    for (let adjacentIndex = centerIndex+1; adjacentIndex < hoodTotal; adjacentIndex++) {
      const adjacentHood = hoods[adjacentIndex];
      if (centerHood.properties.adjacents.indexOf(adjacentIndex) !== -1) continue;
      if (turf.intersect(centerHood, adjacentHood)) {
        counter++;
        centerHood.properties.adjacents.push(adjacentIndex);
        adjacentHood.properties.adjacents.push(centerIndex);     
      }
    }
    console.log("Finished "+centerIndex+' of '+hoodTotal+': "' + centerHood.properties.label+'"');
    console.log("Adjacent indices: " + centerHood.properties.adjacents);
  }
  console.log('Elapsed: '+(Date.now()-start)/1000+' seconds');
  console.log('Intersect called '+counter+' times.');
  return hoodCollection;
}