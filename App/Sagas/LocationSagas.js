import { call, put, take, fork, } from 'redux-saga/effects'
import { path } from 'ramda'
import { eventChannel } from 'redux-saga'
import LocationActions from '../Redux/LocationRedux'
import LocationService from '../Services/LocationService'
import LocationApi from '../Services/LocationApi'

let open = false
let channel
let location
const api = LocationApi.create()

function postLocation(emitter, location) {
  return fetch('http://sondersf.com/api/location', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(location)
  }).then((response)=>{
    if (response.ok) {
      return emitter( { type: 'LOCATION_UPDATE', location: location } )
    } else {
      console.log("LOCATION POST NOT OK:" + response);
    }
  }).catch((error)=>{
    console.log("LOCATION ERROR:" + error);
  })
}

function locationInitChannel() {
  return eventChannel( emitter => {
    const locationWatcher = navigator.geolocation.watchPosition(
      position => {
        let newLocation = Object.assign({}, location);
        if (position.coords) {
          newLocation.latitude = position.coords.latitude;
          newLocation.longitude = position.coords.longitude;
          newLocation.bearing = position.coords.heading;
          console.log("NEWLOCATION:" + JSON.stringify(newLocation));
          postLocation(emitter, newLocation);
        }
      }
    );
    open = true;
    return () => {
      console.log("CLOSING LOCATION SAGA CHANNEL")
      open = false;
      navigator.geolocation.clearWatch(locationWatcher);
    }
  });
}

const updateLocation = function * (action) {
  if (!open) {
    location = action.location
    channel = yield call(locationInitChannel)
  }
  while (true) {
    const action = yield take(channel)
    yield put(action)
  }
}

module.exports = { updateLocation };
