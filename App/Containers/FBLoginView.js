// @flow

import React, { Component } from 'react'
import { connect } from 'react-redux'
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native'
import styles from './Styles/WelcomeViewStyle'
import UserActions from '../Redux/UserRedux'
import LocationActions from '../Redux/LocationRedux'
import FriendsLocationsActions from '../Redux/FriendsLocationsRedux'
import { Images } from '../Themes'
import UsersApi from '../Services/UsersApi'
import { Actions as NavigationActions } from 'react-native-router-flux'

// create custom facebook login
const FBSDK = require('react-native-fbsdk');
const {
  LoginButton, AccessToken
} = FBSDK;

type LoginProps = {
  setUser: () => void,
  setLocation: (Object) => void,
  updateFriendLocations: () => void,
  user: Object,
}

class FBLoginView extends Component {

  props: LoginProps

  state: {
    user: Object
  }

  constructor (props: LoginProps) {
    super(props)
    this.state = {
      user: null
    }

  }

  componentWillMount() {
    try {
      let token = AccessToken.getCurrentAccessToken();
      if (token) {
        const setUserCB = function(friendsData) {
          //{id:'1234', friendlist:['9','8','7','6','5']}
          this.props.setUser(friendsData);
          this.props.setLocation({id: friendsData.id});
          this.props.updateFriendLocations();
          NavigationActions.sonderView();
        }.bind(this);

        UsersApi.addUser(UsersApi.addFriends, setUserCB)
      }
    } catch (error) {
      alert("THIS IS AN ERROR!")
    }
  }

  render() {
    return (
      <View>
        <LoginButton
          readPermissions={["public_profile","email","user_friends"]}
          onLoginFinished={
            (error, result) => {
              if (error) {
                alert("login has error: " + result.error);
              } else if (result.isCancelled) {
                // alert("login is cancelled.");
              } else {

                // posts user info to db & when complete, add friends to db
                const setUserCB = function(friendsData) {
                  //{id:'1234', friendlist:['9','8','7','6','5']}
                  this.props.setUser(friendsData);
                  this.props.setLocation({id: friendsData.id});
                  this.props.updateFriendLocations();
                  NavigationActions.sonderView();
                }.bind(this);

                UsersApi.addUser(UsersApi.addFriends, setUserCB)
              }
            }
          }
          // onLogoutFinished={() => alert("logout.")}
        />
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setUser: (user) => dispatch(UserActions.setUser(user)),
    setLocation: (location) => dispatch(LocationActions.locationUpdate(location)),
    updateFriendLocations: () => dispatch(FriendsLocationsActions.friendsLocationsUpdate())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(FBLoginView)
