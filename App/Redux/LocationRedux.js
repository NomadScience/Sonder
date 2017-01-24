// @flow

import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  locationUpdate: ['location'],
})

export const LocationTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  location: null
})

/* ------------- Reducers ------------- */

// request the temperature for a city
export const update = (state: Object, action: Object) => {
  const { location } = action;
  if (location) {
    return state.merge({ location });
  } else {
    return state;
  }
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.LOCATION_UPDATE]: update,
})
