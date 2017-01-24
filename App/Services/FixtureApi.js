// @flow

export default {
  // Functions return fixtures
  getNeighborhoodBoundaries: (city: string) => {
    const sfData = require('../Fixtures/sanFrancisco.json')
    return {
      ok: true,
      data: sfData
    }
  },
  // The actual API for this one will probably be different
  getStreets: (neighborhood: string) => {
    const tenderloinStreets = require('../Fixtures/tenderloinStreets.json')
    return {
      ok: true,
      data: tenderloinStreets
    }
  },
  getCity: (city: string) => {
    // This fixture only supports Boise or else returns toronto
    const boiseData = require('../Fixtures/boise.json')
    const torontoData = require('../Fixtures/toronto.json')
    return {
      ok: true,
      data: city.toLowerCase() === 'boise' ? boiseData : torontoData
    }
  },
  updateLocation: (id: string, latitude: string, longitude: string, bearing: string) => {
    return {
      ok: true,
      data: {
        "id": id,
        "latitude":latitude,
        "longitude":longitude,
        "bearing": bearing
      }
    }
  }
}
