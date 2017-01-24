const FBSDK = require('react-native-fbsdk');
const { host } = require('./ApiConfig');
import GraphApi from '../Services/GraphApi'
import apisauce from 'apisauce'

export default {

  addUser: (cbOne, cbTwo) => {
    GraphApi.getUserInfo(function(userInfo, friendsData) {
      const api = apisauce.create({
        baseURL: host,
        headers: {
          'Accept': 'text/plain',
        }
      });
      api
      .post('users', userInfo)
      .then((res) => {
        console.log('success adding user');
        cbOne(friendsData, cbTwo);
      })
      .catch((err) => {
        if (err) {
          console.log('error adding user', err.data);
        }
      });
    });
  },

  addFriends: (friendsData, cb) => {
    const api = apisauce.create({
      baseURL: host,
      headers: {
        'Accept': 'text/plain',
      }
    });
    api
    .post('friends', friendsData)
    .then((res) => {
      console.log('success adding/ updating friends');
      cb(friendsData);
    })
    .catch((err) => {
      if (err) {
        console.log('error adding friends', err);
      }
    });
  },

  getFriends: (cb) => { // todo: refactor to use redux store
    console.log('getting friends!!!')
    GraphApi.getUserInfo(function(userInfo, friendsData) {
      console.log('userInfo', userInfo)
      const api = apisauce.create({
        baseURL: host,
        headers: {
          'Accept': 'text/plain'
        }
      });
      api
      .get('friends/' + userInfo.id)
      .then((res) => {
        console.log('fetched friends', res);
        cb(res, userInfo);
      })
      .catch((err) => {
        if (err) {
          console.log('error on fetching friends: ', err);
        }
      })
    })
  },

}
