import { call, put, take, fork, } from 'redux-saga/effects'
import FriendsLocationsActions from '../Redux/FriendsLocationsRedux'
import { eventChannel } from 'redux-saga'
import UsersApi from '../Services/UsersApi'

let open = false
let channel
let namesAndPictures = {}

function websocketInitChannel() {
  return eventChannel( emitter => {
    // init the connection
    // const ws = new WebSocket('ws://sonder.herokuapp.com')
    const ws = new WebSocket('ws://sondersf.com')

    ws.onopen = () => {
      open = true
      console.log('opening ws')

      // fetch friends
      // todo: use res to get & store friends' names for callout
      UsersApi.getFriends(function(res, userInfo) {
        console.log('fetched friends from saga', res, userInfo)

        // store names and pictures
        res.data.following.forEach((obj) => {
          namesAndPictures[ obj.fb_id ] = {}
          namesAndPictures[ obj.fb_id ].name = obj.displayname
          namesAndPictures[ obj.fb_id ].picture = obj.picture
        })

        // subscribe to friends locations
        ws.send(JSON.stringify({
          "type": "subscribe",
          "friends": res.data.following.map((friend) => {
            return friend.fb_id.toString()
          }),
        }))
      })

    }

    ws.onerror = (error) => {
      console.log('ws error: ', error)
      //ws.close()
    }

    ws.onmessage = (e) => {
      console.log('ws message: ', e.data);
      let res = JSON.parse(e.data)
      if (res.type === 'location') {
        // transform data
        let payload = {}
        payload.name = namesAndPictures[res.message.id].name
        payload.picture = namesAndPictures[res.message.id].picture
        payload.id = res.message.id
        payload.longitude = res.message.longitude
        payload.latitude = res.message.latitude

        console.log('NAMESANDPICTURES', namesAndPictures)
        console.log('PAYLOAD', payload)

        // dispatch an action with emitter
        console.log(payload)
        return emitter( { type: 'FRIENDS_LOCATIONS_UPDATE', friendsLocations: payload } )
      }
      return false
    }

    ws.onclose = (e) => {
      open = false
      console.log('closing ws')
    }

    // unsubscribe function
    return () => {
      // interrupt the socket communication
      console.log('closing ws')
      open = false;
      ws.close()
    }
  })
}

// watcher saga
 const websocketSaga = function * () {
  while (true) {
    if (!open) {
      channel = yield call(websocketInitChannel)
    }
    const action = yield take(channel)
    yield put(action)
  }
}

module.exports = { websocketSaga };
