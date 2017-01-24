const FBSDK = require('react-native-fbsdk');
const {
  AccessToken,
  GraphRequest,
  GraphRequestManager,
} = FBSDK;

const getUserInfo = (cb) => {
  const resCallback = (error, result) => {
    if (error) {
      //alert('error fetching data: ' + error.toString());
      return error;
    } else {
      console.log('fetched fb graph data');
      const userInfo = {
        token: token,
        email: result.email,
        displayname: result.name,
        picture: result.picture.data.url,
        id: result.id,
      }

      const friendsRes = result.friends.data;
      const friendList = friendsRes.map((friend) => {
        return friend.id;
      });
      const friendsData = {
        id: result.id,
        friendlist: friendList,
      }

      cb(userInfo, friendsData);
    }
  }

  let token;
  AccessToken.getCurrentAccessToken().then(
    (data) => {
      token = data.accessToken.toString();
    }
  ).catch(function(error){
    token = null;
  })

  const reqConfig = {
    httpMethod: 'GET',
    version: 'v2.5',
    parameters: { fields: { string: 'id, name, email, picture, friends' } },
    accessToken: token,
  }

  // Create a graph request asking for user information with a callback to handle the response.
  const infoRequest = new GraphRequest(
    'me/',
    reqConfig,
    resCallback,
  );

  // Start the graph request.
  return new GraphRequestManager().addRequest(infoRequest).start();
}

export default {
  getUserInfo: getUserInfo
}
