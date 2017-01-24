import inside from '@turf/inside';
import nextFrame from 'next-frame';
import { getRegionBBox, toCoords, toTuples, toTuple } from './MapHelpers';

// These are in the same order as in buildBoundaries.js
// ToDo: make this less brittle!
const requireByIndex = (file) => {
  switch (file) {
    case 0: return require('../Fixtures/indexed/sanFrancisco.json');
    case 1: return require('../Fixtures/indexed/southSF.json');
    case 2: return require('../Fixtures/indexed/eastBay.json');
    case 3: return require('../Fixtures/indexed/siliconValley.json');
  }
}

// ToDo: put this into MapHelpers:
const toPoint = (latLng) => ({ 
  type: 'Point', 
  coordinates: toTuple(latLng) 
});

// See bottom of file for detailed HoodSelector comments
class HoodSelector {
  constructor() {
    // Loads region boundaries unconditionally
    // this._regions = require(REL_PATH+REGION_FILE).features;
    this._regions = require('../Fixtures/indexed/bayAreaBoundaries.json').features;

    // These are all the other instance variables used:
    this._regionHoods = null;
    this._adjacentHoods = null;
    this._currentRegion = null;
    this._wasLastInBounds = false;

    // Set event hook functions, just like in Compass
    const EVENTS = [ 'onRegionWillLoad',
                     'onRegionDidLoad', 
                     'onHoodChange',
                   ];
    for (let event of EVENTS) {
      this[event] = (func) => {
        if (typeof func === 'function') {
          this['_'+event] = func;
        }
      };
      this['_'+event] = () => {};
    }
  }

  // See bottom of file for detailed documentatoin on refresh() and _init()
  refresh(position) {
    const start = Date.now();
    const point = toPoint(position);
    const lastHood = this._currentHood;
    this._wasLastInBounds = this._refresh(point);
    console.tron.log('REFRESH: '+(Date.now()-start)+'ms');
    if (lastHood && this._currentHood !== lastHood) {
      this._onHoodChange({
        newHood: this._currentHood, 
        adjacentHoods: this._adjacentHoods 
      });
    } 
    return this._wasLastInBounds;
  }
  _refresh(point) {
    if (!this._currentHood) return this._init(point); // 1
    if (inside(point, this._currentHood)) return true; // 2
    if ( this._setHood( this._selectHood(point, this._adjacentHoods) ) ) return true; // 3
    if (!inside(point, this._currentRegion)) return this._init(point); // 4
    return this._setHood (this._selectHood(point, this._regionHoods) ); // 5
  }
  _init(point) {
    this._currentRegion = this._selectCurrentRegion(point);
    if (this._currentRegion === null) return false; // 1
    this._regionHoods = this._loadRegionHoods(this._currentRegion); // 2
    return this._setHood( this._selectHood(point, this._regionHoods) ); // 3
  }

  _loadRegionHoods(region) {
    this._onRegionWillLoad(region);
    const start = Date.now();
    const regionHoods = requireByIndex(region.properties.index).features;
    console.tron.log('Loaded '+region.properties.label+': '+(Date.now()-start).toFixed()+'ms');
    this._onRegionDidLoad(regionHoods, region);
    return regionHoods;
  }

  // Sets current hood and adjacent hood; 
  // It returns false if no hood, otherwise true
  _setHood(hood) {
    if (!hood) return false;
    this._currentHood = hood;
    this._adjacentHoods = this._selectAdjacentHoods(hood);
    return true;
  }
  _selectHood(point, hoods, context) {
    for (let hood of hoods) {
      if (inside(point, hood)) return hood;
      // await nextFrame(); // test this synchronously first
    }
    return null;
  }
  _selectCurrentRegion(point) {
    for (let region of this._regions) {
      if (inside(point, region)) return region;
      // await nextFrame();
    }
    return null;
  }

  // This is a "dumb" synchronous function that simply pushes indexed adjacents to an array
  _selectAdjacentHoods(centerHood = this._currentHood) {
    const adjacentIndices = centerHood.properties.adjacents;
    const adjacentHoods = [];
    for (let adjacentIndex of adjacentIndices) {
      adjacentHoods.push(this._regionHoods[adjacentIndex]);
    }
    return adjacentHoods;
  }
  // These are the "dumb" public functions. 
  // See notes on refresh() about this._wasLastInBounds
  getAdjacentHoods = () => (this._wasLastInBounds) ? this._adjacentHoods : null;
  getCurrentHood = () => (this._wasLastInBounds) ? this._currentHood : null;
  getCurrentRegion = () => this._currentRegion;
}
const hoodSelector = new HoodSelector();
export default hoodSelector;

/**
  HoodSelector is used by the Compass to scope neighborhood searches.
  Conventions:
    Internal:
      - All methods deal with feature arrays, not the collection object that wrap them
      - async/await/for-of/nextFrame pattern is shared with Compass, to prevent animation blocking
       -- Use for-of rather than forEach when possible, as it works with await
      - To avoid confusion about geoJSON and mapbox tuples, LatLng position is used for public methods and
          converted internally to a geoJSON point
    Interface:
    - The consumer uses refresh(position), which pursues all logic from cheapest to most expensive
      -- See comments on refresh() for more details
    - Assuming refresh() has been called, the consumer can access various getters
      -- Those getters are synchronous and fast, thanks to indexing
      -- Getters: getAdjacentHoods(), getCurrentHood(), getRegionHoods()
    Quirks:
      - this._currentHood is never set to null even if no hood found, but this._currentRegion IS when no region found
        -- Was unintentional at first, but keeping _currentHoods prevents a fallback to _init when leaving in-region holes
**/
// refresh(): This is the main public method that the rest of the logic is built for. It uses a series of fallbacks
// for refreshing the neighborhood information as quickly as possible.
// If the position has data associated with it, it returns true; otherwise false
/* Example: HoodSelector.refresh(position) is called in Compass.onPositionChange()
    When called, refresh() will do the following:
      1. Check if this._currentHood exists, falls back to _init() if not, which starts at regions
      2. Check if the position is still in the this._currentHood (super-cheap)
      3. If not, then iterate through this._adjacentHoods and see which they're in (cheap)
        - set this._currentHood to the match
      4. If they are STILL not found, check _currentRegion as a sanity check (semi-cheap)
        -- If they're NOT, then run init, which loads a new region, and return
      5. If we're still in the same region, then repopulate this._currentHood from ALL hoods (expensive)

      All conditions should return true; if refresh() returns false, it means the point is out of bounds!
  Notes: 
    - this._currentHood 
    - this.refresh() wraps this._refresh() in order to:
      -- a) be more explicit about what the return value means
      -- b) use this._isInBounds in the getters
*/

/* _init() is essentially a top-down refresh; like refresh, returns true if the point in dataset, otherwise false
  1. Find what region we're in, return false if no region found
  2. Load the region, anticipating some loading time
    -- Include onRegionWillLoad and onRegionDidLoad hooks and delegate them to compass
  3. Select and set the hood from regionHoods
*/

/* ToDo - EDGE CASE: you are found in the region, but there's no neighborhood, because there's an unincluded hole! What happens?
  Case 1: this._currentHoods already exists, because it didn't happen on the first run.
    1. refresh() gets called, 
    2. this._currentHood is set already, so it continues
    3. we're not inside _currentHood anymore, so it checks in adjacent hoods
    4. It doesn't find anything, so it sanity-checks the current region, but DOESN'T call init, because you're still in the region
    5. It returns _setHood on the region, turning up false; no change is made.
    EMERGENCY: this._currentHood is still set to what it was before!!

  Case 2: You start the app from that little hole between Daly City and SF, or countless ones in Silicon Valley
    1. refresh() gets called
    2. this._currentHood is NOT set, so it runs init
    3. init gets the current region and loads the region hoods
    4. init returns _setHood on the region, turning up false

  NOTE: if you're not in the current region, you're COMPLETELY out of bounds..
    So there are two cases:
      1. _currentHood isn't found, but _currentRegion exists
      2. _currentHood isn't found, but _currentRegion is null
*/