// @flow

import R from 'ramda'
import { centroid } from '@turf/turf';

export const removeEmpty = (markers: Array<Object>) => {
  let filteredMarkers = R.filter((item) => {
    return item.latitude && item.longitude
  }, markers)
  return filteredMarkers
}

// This returns an array of tuples in geoJSON format representing the region
// rectangle. ie. [[longitude, latitude]...]
export const getRegionBBox = (region: Object) => {
  const middleLong = region.longitude;
  const middleLat = region.latitude;
  const longDelta = region.longitudeDelta;
  const latDelta = region.latitudeDelta;

  const maxX = middleLong+longDelta;
  const minX = middleLong-longDelta;

  const maxY = middleLat+latDelta;
  const minY = middleLat-latDelta;
  // return region

  // Return rectangle ordered CCW from bottom right corner
  return [[maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]];
}

export const getPrettyBearing = (heading) => {
  const degreeChar = String.fromCharCode(176);
  const primaryCardinality = (heading >= 270 || heading <= 90) ? 'N' : 'S';
  const secondaryCardinality = (heading <= 180) ? 'E' : 'W';
  const angle = (heading <= 90) ? heading :
                   (heading <= 180) ? 180 - heading :
                     (heading <= 270) ? heading - 180 : 360 - heading;
 return primaryCardinality + angle + degreeChar + secondaryCardinality;
};

export const toCoords = (geojson: Array<Array>) => geojson.map((tuple) => ({
    longitude: tuple[0],
    latitude: tuple[1]
  })
);

export const toTuple = (coord: Object) => [coord.longitude, coord.latitude];

export const toTuples = (coords: Array<Object>) => coords.map((coords) => [coords.longitude, coords.latitude])

export var reverseTuples = (coordinates) => {
  return !Array.isArray(coordinates[0]) ?
    [coordinates[1], coordinates[0]] :
    coordinates.map((coordinate) => {
      return [coordinate[1], coordinate[0]];
    })
}

export const calculateRegion = (locations: Array<Object>, options: Object) => {
  const latPadding = options && options.latPadding ? options.latPadding : 0.1
  const longPadding = options && options.longPadding ? options.longPadding : 0.1
  const mapLocations = removeEmpty(locations)
  // Only do calculations if there are locations
  if (mapLocations.length > 0) {
    let allLatitudes = R.map((l) => {
      if (l.latitude && !l.latitude.isNaN) return l.latitude
    }, mapLocations)

    let allLongitudes = R.map((l) => {
      if (l.longitude && !l.longitude.isNaN) return l.longitude
    }, mapLocations)

    let minLat = R.reduce(R.min, Infinity, allLatitudes)
    let maxLat = R.reduce(R.max, -Infinity, allLatitudes)
    let minLong = R.reduce(R.min, Infinity, allLongitudes)
    let maxLong = R.reduce(R.max, -Infinity, allLongitudes)

    let middleLat = (minLat + maxLat) / 2
    let middleLong = (minLong + maxLong) / 2
    let latDelta = (maxLat - minLat) + latPadding
    let longDelta = (maxLong - minLong) + longPadding

    // return markers
    return {
      latitude: middleLat,
      longitude: middleLong,
      latitudeDelta: latDelta,
      longitudeDelta: longDelta
    }
  }
}

export const calculateRegionCenter = (coordinates) => {
  const poly = {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Polygon",
      "coordinates": [coordinates]
    }
  };
  return centroid(poly).geometry.coordinates;
}
/*
  hoodToAnnotations() takes a geoJSON feature containing a Polygon or MultiPolygon 
  and spits out an array of Mapbox annotations.
    Notes:
      1. It only uses the outer-ring of the feature (ie. no holes)
      2. It takes the outer hood feature, not the underlying geometry
      3. It always returns an array. This is so that it can be spread unconditionally (see example)
  
    Example usage:
    --------------
    const addHoodAnnotation = (hoodFeature) => {
      const properties = hoodFeature.properties;
      const settings = {
        strokeColor: '#00FB00',
        fillColor: generateCoolColorFromLabel(properties.label),
        title: properties.label
      });      

      this.setState({
        annotations: [...annotations, 
          ...hoodToAnnotations(hoodFeature, settings)]
        ]
      })
    }
*/
export const hoodToAnnotations = (feature, annotationSettings) => {
  const type = feature.geometry.type;
  if (type === 'MultiPolygon') {
    console.tron.log('DANGER WILL ROBINSON: MultiPolygon is trying to be rendered!');
  }
  const properties = feature.properties;
  const coords = feature.geometry.coordinates;
  const mergeSettings = (coords, index = 0) =>
    Object.assign(
      { coordinates: reverseTuples(coords[0]),
        type: 'polygon' }, 
      annotationSettings,
      { id: annotationSettings.id+' '+index }
    );
  return (type === 'MultiPolygon') ? 
    coords.map((coords, index) => mergeSettings(coords, index)) :
    [mergeSettings(coords)];
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const binduMapBox = (text) => {
  // sums the ascii values of each character in the stat to use as seed
  let seed = text.split('').reduce( function(sum,item,i) { return sum + item.charCodeAt()*i+2 },0);
  const color = {
    r: parseInt(seededRandom(seed)*100+50),
    g: parseInt(seededRandom(++seed)*100+50),
    b: parseInt(seededRandom(++seed)*100+100)
  };
  return '#'+color.r.toString(16)+color.g.toString(16)+color.b.toString(16);
};