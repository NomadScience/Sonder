// @flow

import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  friendsLocationsUpdate: ['friendsLocations'],
})

export const FriendsLocationsTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  '10154850454205890': { 'longitude': '-122.4148', 'latitude': '37.7599' },
  // '117789002060137': { 'longitude': '-122.4368', 'latitude': '37.8037' },
  // '102904480219254': { 'longitude': '-122.4702', 'latitude': '37.6879' },
})

/* ------------- Reducers ------------- */

export const update = (state: Object, action: Object) => {
  const { friendsLocations } = action
  if (friendsLocations) {
    let newLocation = {}
    newLocation[friendsLocations.id] = {
      'latitude': friendsLocations.latitude,
      'longitude': friendsLocations.longitude,
      'name': friendsLocations.name,
      'picture': friendsLocations.picture,
    }
    console.log('updating state.friendsLocations')
    return Object.assign({}, state, Object.assign({}, state.friendsLocations, newLocation))
  }
  return state
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.FRIENDS_LOCATIONS_UPDATE]: update,
})
