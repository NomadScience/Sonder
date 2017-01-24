import { takeLatest, takeEvery } from 'redux-saga'
import DebugSettings from '../Config/DebugSettings'

/* ------------- Types ------------- */

import { StartupTypes } from '../Redux/StartupRedux'
import { LocationTypes } from '../Redux/LocationRedux'
import { OpenScreenTypes } from '../Redux/OpenScreenRedux'
import { FriendsLocationsTypes } from '../Redux/FriendsLocationsRedux'

/* ------------- Sagas ------------- */

import { startup } from './StartupSagas'
import { updateLocation } from './LocationSagas'
import { openScreen } from './OpenScreenSagas'
import { websocketSaga } from './FriendsLocationsSagas'

/* ------------- API ------------- */

// The API we use is only used from Sagas, so we create it here and pass along
// to the sagas which need it.


/* ------------- Connect Types To Sagas ------------- */

export default function * root () {
  yield [
    // some sagas only receive an action
    takeLatest(StartupTypes.STARTUP, startup),
    takeLatest(OpenScreenTypes.OPEN_SCREEN, openScreen),
    takeLatest(LocationTypes.LOCATION_UPDATE, updateLocation),
    takeLatest(FriendsLocationsTypes.FRIENDS_LOCATIONS_UPDATE, websocketSaga),
  ]
}
