const FBSDK = require('react-native-fbsdk');
const {
  AccessToken,
} = FBSDK;

const getUsersAccessToken = function () {
  return new Promise((resolve, reject) => {
    while (true) {
      AccessToken.getCurrentAccessToken().then(
        (data) => {
          let token = data.accessToken.toString();
          console.log('GOT TOKEN: ', token)
          resolve({ 'error': null, 'token': token })
        }
      ).catch(
        (error) => resolve({ 'error': error, 'token': null })
      );
    }
  })
}

module.exports.getUsersAccessToken = getUsersAccessToken;
