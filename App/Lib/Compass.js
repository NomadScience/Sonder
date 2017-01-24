/*
First-pass refactor of monolithic compass
------------------------------------------
ToDos:
- Put promises everywhere
- Make it work with batching optimizations,
    or use requestAnimationFrame, or something
- Refactor the neighborhood stuff out of here
- Add isReady() helper functions to go along with events
- Unit tests
*/

import { DeviceEventEmitter } from 'react-native';
import ReactNativeHeading from 'react-native-heading';
// Note: ignoring redux-saga structure for now, so this eventually shouldn't go in here!
import FixtureApi from '../Services/FixtureApi';

import { getRegionBBox, toCoords, toTuples, toTuple } from '../Lib/MapHelpers';
import { lineString, point, polygon } from '@turf/helpers';
import intersect from '@turf/intersect';
import inside from '@turf/inside';
import Offset from 'polygon-offset';
import turf from '@turf/turf';

import { clone } from 'cloneextend';
import vis from 'code42day-vis-why';
import nextFrame from 'next-frame';

import HoodSmith from './HoodSelector';

const offset = new Offset();

const toRadians = (heading) => heading * (Math.PI / 180);
const flatten = list => list.reduce(
    (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

class Compass {
  constructor() {
    // Set individual event hook function definitions
    this.EVENTS = [ 'onInitialPosition',
                    'onPositionChange',
                    'onHeadingSupported',
                    'onHeadingChange',
                    'onCompassReady',
                    'onInitialHoods',
                    'onEntitiesDetected',
                    'onHoodChange',
                  ];
    this.EVENTS.forEach(event => {
      this['_'+event] = () => {};
      this[event] = (func) => {
        this['_'+event] = (typeof func === 'function') ?
          func : () => {};
      }
    });
    this.entities = {};
    this._currentPosition = null;
    this._heading = null;
    this._debugStreets = this.getDebugStreets();
    this._debugHoods = this.getDebugHoods();
    // Delegate hood changes to HoodSmith
    HoodSmith.onHoodChange((data) => this._onHoodChange(data));
  }
  getDebugHoods() {
    return FixtureApi.getNeighborhoodBoundaries('San Francisco').data;
  }
  getDebugStreets() {
    return FixtureApi.getStreets('Tenderloin').data;
  }

  _setEvents(opts) {
    const nullifyOnInactive = (func) => (...args) => this._active ? func(...args) : (() => {})();
    // calling whatever(args); needs to be func(args) if active, noop() otherwise
    this.EVENTS.forEach(event => {
      if (typeof opts[event] === 'function') {
        this['_'+event] = nullifyOnInactive(opts[event]);
      }
    });
  }
  start(opts) {
    /* Backlog:
       - Move to async/await, make all the logic consistent
          -- Start with detection, then features update code
       - Change ALL forEach's into for-of loops for speed
       Icebox:
          - Perhaps start() should be thenable and onInitialPosition
              and onHeadingSupported deprecated.
       Notes:
       - Right now, presumes that no movement is happening on init
          -- To fix this, could use Promise.race with getCurrent and watchPosition
       - ALL instance variable are now set here, not secretly in methods
          -- This is so they can be refactored elsewhere as needed
    */
    var startTime;
    this._active = true;

    this._radius = opts.radius || 10;
    this._setEvents(opts);

    this.getInitialPosition()
      .then(position => {
        if (!this._currentPosition) {
          this._currentPosition = position.coords;
          HoodSmith.refresh(this._currentPosition);
        }
        this._onInitialPosition(position); // probably should pass position.coords
        this.__frameCounter = 0;
        startTime = Date.now();
        return this._processNeighborhoods(position);
      })
      .then(hoodData => {
        console.tron.log('SPEED: ' + (Date.now()-startTime).toString()+'ms SPREAD: ' + this.__frameCounter.toString()+' frames');
        this._hoodData = hoodData;
        this._onInitialHoods(hoodData);
      });

    this.watchID = navigator.geolocation.watchPosition(position => {
      this._currentPosition = position.coords;
      HoodSmith.refresh(this._currentPosition);
      this._onPositionChange(position); // probably should pass position.coords
    });

    ReactNativeHeading.start(opts.minAngle || 1)
    .then(didStart => this._onHeadingSupported(didStart));

    DeviceEventEmitter.addListener('headingUpdated', data => {
      const heading = this._heading = data.heading;
      const compassLine = this._compassLine = this.getCompassLine();
      // Note: just as here, it might be best to eventually forward both position and heading to all Compass
      //lifecycle functions
      this._onHeadingChange({ heading, compassLine, position: this._currentPosition });
      if (this._detectionPending) {
        // console.tron.log("EMITTER SEES PENDING")
      }
      if (!compassLine || !this._hoodData || this._detectionPending) return;

      // MEASURE 1: angle/timing kludge for feature detection
      // if (this._lastHeadingChange && Date.now()-this._lastHeadingChange < 1000) return;
      // if (this._lastHeading && Math.abs(heading-this._lastHeading) < 5) return;
      // END
      const startTime = Date.now();
      this.__frameCounter = 0;
      this._detectionPending = true;
      this._detectEntities(heading).then(entities => {
        this._entities = entities;
        this._onEntitiesDetected(entities);
        this._detectionPending = false;
        // console.tron.log('SPEED: ' + (Date.now()-startTime).toString()+'ms SPREAD: ' + this.__frameCounter.toString()+' frames');
      });
      this._lastHeadingChange = Date.now();
      this._lastHeading = heading;
    });
  }

  getInitialPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject('Location timed out')
      );
    });
  }

  getCompassLine(heading = this._heading,
                 radius = this._radius,
                 origin = this._currentPosition) {
    if (!origin) return null;
    const headingInRadians = toRadians(heading);
    return [origin, {
        longitude: origin.longitude + radius * Math.sin(headingInRadians),
        latitude: origin.latitude + radius * Math.cos(headingInRadians)
      }];
  }

  async _detectEntities(heading) {
    // MEASURE 2: Return cached entities if any _detectEntities frame has not run to completion
    // if (this._detectionPending) {
    //   console.tron.log("SENDING CACHED ENTITIES");
    //   return this._entities;
    // }
    // END
    await nextFrame(); this.__frameCounter++;
    const hoods = await this.getHoodCollisions();
    await nextFrame(); this.__frameCounter++;
    const streets = await this.getStreetCollisions();
    return { hoods, streets };
  }

  _getCompassLineFeature() {
    return lineString(toTuples(this._compassLine));
  }

  // Probably just wrap this in a requestAnimationFrame for now
  async getHoodCollisions(compassLineFeature = this._getCompassLineFeature(),
                    adjacentHoods = this._hoodData.adjacentHoods,
                    currentHood = this._hoodData.currentHood) {
    var adjacents = [];
    var startHeading = this._heading;
    for (let feature of adjacentHoods) {
      await nextFrame(); this.__frameCounter++;
      const collisions = intersect(compassLineFeature, feature);
      if (!collisions ||
        currentHood.properties.label === feature.properties.label) continue;
      const type = collisions.geometry.type;
      const coords = collisions.geometry.coordinates;
      const nearestCoord = (type === 'MultiLineString') ? coords[0][0] : coords[0];
      const nearestFeature = point(nearestCoord);
      const originFeature = point(compassLineFeature.geometry.coordinates[0]);
      const collisionDistance = turf.distance(originFeature, nearestFeature, 'miles');
      adjacents.push({
        name: feature.properties.label,
        distance: collisionDistance.toFixed(2) + ' miles',
        coordinates: feature.geometry.coordinates,
        feature,
      });
    }
    const current = {
      name: currentHood.properties.label,
      coordinates: currentHood.geometry.coordinates,
      feature: currentHood,
    }
    return {adjacents, current };
  }

  async getStreetCollisions(compassLineFeature = this._getCompassLineFeature(),
                      streetsFixture = this._debugStreets ) {
    // return ['Streets Stubbed'];
    var streetsAhead = [];
    const startHeading = this._heading;
    var startTime, endTime, timeDiff;
    var topStartTime = Date.now();
    // MEASURE 3: replace forEach with let and call nextFrame several on each iteration
    for (let feature of streetsFixture) {
      await nextFrame; this.__frameCounter++;
      const collision = intersect(compassLineFeature, feature);
      // console.tron.log("-STREETS- intersect: "+(Date.now()-topStartTime).toString()+'ms');
      if (!collision) continue;
      const originFeature = point(compassLineFeature.geometry.coordinates[0]);
      const collisionDistance = turf.distance(originFeature,collision);
      const street = {
        name: feature.properties.name,
        distance: collisionDistance.toFixed(2) + 'miles'
      };
      const relations = feature.properties['@relations'];
      if (relations) {
        let routes = {};
        for (let relation of relations) {
          await nextFrame(); this.__frameCounter++;
          if (relation.reltags.type === "route") {
            routes[relation.reltags.ref] = true;
          }
        };
        if (routes) street.routes = Object.keys(routes);
      }
      streetsAhead.push(street);
    }
    return streetsAhead;
  }

  async _processNeighborhoods(position) {
    let startTime = Date.now();
    const adjacentHoods = HoodSmith.getAdjacentHoods();
    const currentHood = HoodSmith.getCurrentHood();
    // const rawHoods = this._debugHoods;
    // await nextFrame(); this.__frameCounter++;
    // console.tron.log('getDebugHoods: ' + (Date.now()-startTime).toString()+'ms frames: ' + this.__frameCounter.toString());
    const streets = this._debugStreets;
    await nextFrame(); this.__frameCounter++;
    // const currentHood = await this._findCurrentHood(position, rawHoods.features);
    // await nextFrame(); this.__frameCounter++;
    // console.tron.log('findCurrentHood: ' + (Date.now()-startTime).toString()+'ms frames: ' + this.__frameCounter.toString())
    // const adjacentHoods = await this._findAdjacentHoods(currentHood, rawHoods.features);
    // await nextFrame(); this.__frameCounter++;
    // console.tron.log('findAdjacentHoods: ' + (Date.now()-startTime).toString()+'ms frames: ' + this.__frameCounter.toString())
    const hoodLatLngs = this.mapifyHoods(adjacentHoods);
    await nextFrame(); this.__frameCounter++;
    console.tron.log('mapifyHoods: ' + (Date.now()-startTime).toString()+'ms frames: ' + this.__frameCounter.toString())
    const streetLatLngs = this.mapifyStreets(streets);
    await nextFrame(); this.__frameCounter++;
    console.tron.log('mapifyStreets: ' + (Date.now()-startTime).toString()+'ms frames: ' + this.__frameCounter.toString())
    const hoodData = { currentHood, adjacentHoods, hoodLatLngs, streetLatLngs };
    return hoodData;
  }

  async _findCurrentHood(position, hoodFeatures) {
    for (let feature of hoodFeatures) {
      const curPosGeo = point(toTuple(position.coords)).geometry;
      if (inside(curPosGeo, feature)) return feature;
      await nextFrame(); this.__frameCounter++;
    }
  }

  async _findAdjacentHoods(currentHood, hoodFeatures) {
    // This does an in-place grow on currentHood in order to find intersections
    // Not doing this can sometimes turn up false negatives when polys
    // don't fully overlap.
    // Note: Not yet working with MultiPolys.
    const bloatedHood = this.bloatAndSimplify(currentHood);
    var adjacentHoods = [];
    for (feature of hoodFeatures) {
      if (currentHood === feature) continue;
      if (intersect(bloatedHood, feature)) {
        feature = clone(feature);
        // Simplifies with the D3-derived Visvalingam algorithm:
        // (Clone first to avoid changing source data)
        let pointCount = flatten(feature.geometry.coordinates).length/2;
        feature.geometry.coordinates[0] = vis(feature.geometry.coordinates[0],pointCount*0.5);
        adjacentHoods.push(feature);
        await nextFrame(); this.__frameCounter++;
      }
    }
    return adjacentHoods;
  }

  stop() {
    this._active = false;
    ReactNativeHeading.stop();
    DeviceEventEmitter.removeAllListeners('headingUpdated');
    navigator.geolocation.clearWatch(this.watchID);
  }

  //TODO: make sure this works for MultiPolys!
  // If it doesn't, it's possible that false negatives will break LESS often
  // Than failed bloatAndSimplify operations
  bloatAndSimplify(feature) {
    // Deep clone the input to keep the function pure
    feature =  clone(feature);
    const coords = feature.geometry.coordinates;
    feature.geometry.coordinates = offset.data(coords).margin(0.0003); //offset the polygon
    feature.geometry = turf.simplify(feature,0.00005,false).geometry;  //simplify the offset poly
    return feature;
  }

  mapifyStreets(features) {
    return features.map((feature) => {
      const coordSet = feature.geometry.coordinates;
      const latLngs = coordSet.map((coords) => ({
        longitude: coords[0],
        latitude: coords[1]
      }));
      return {
        name: feature.properties.name,
        coords: latLngs
      };
    });
  }

  mapifyHoods(features) {
    return features.reduce((hoods, feature) => {
      // Check for polyline vs. non-polyline
      // If multiline, map each and add extra square braces
      const shapeType = feature.geometry.type;
      const hoodName = feature.properties.label;
      if (shapeType === 'Polygon') {
        const coordSet = feature.geometry.coordinates[0];
        const latLngs = coordSet.map((coords) => ({
          longitude: coords[0],
          latitude: coords[1]
        }));
        hoods.push({ name: hoodName, coords: latLngs});
      } else if (shapeType === 'MultiPolygon') {
        const multiCoordSet = feature.geometry.coordinates;
        multiCoordSet.forEach(coordSet => {
          // MultiPolygon adds an extra layer of depth, so get rid of it
          coordSet = coordSet[0];
          const latLngs = coordSet.map((coords) => ({
            longitude: coords[0],
            latitude: coords[1]
          }));
          hoods.push({ name: hoodName, coords: latLngs});
        });
      }
      return hoods;
    },[]);
  }
}

const compass = new Compass();

// Can't freeze this because the object overwrites its own methods
// at runtime; probably won't matter:
// Object.freeze(compass);

export default compass;
