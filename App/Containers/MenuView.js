import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  Image,
  Linking,
  AppRegistry,
  TouchableHighlight,
  TouchableOpacity,
  Animated,
} from 'react-native';
const FBSDK = require('react-native-fbsdk')
import Login from './FBLoginView'
import menuStyles from './Styles/MenuStyle'
// const LoginManager = require('react-native').NativeModules.FBLoginManager;
const {
  LoginManager,
} = FBSDK;

import Button from 'react-native-button'


let menuIsHidden = true

class MenuLogin extends Component {
  constructor(props){
    super(props)
  }
  render(){
    return(
      <TouchableOpacity onPress={this.props.onPress}>
        <Login />
      </TouchableOpacity>
    )
  }
}

export default class Menu extends Component {
  state = {
    bounceValue: new Animated.Value(110),  // Initial position of the menu
    buttonText: 'Logout',
  }
  constructor(props){
    super(props)
  }

  _toggleSubview() {
    let toValue = 110
    if (menuIsHidden) {
      toValue = 20
    }
    // Animates the transalteY of the menu subview between 0 & 100
    // 100 is the height of the menu subview
    Animated.spring(
      this.state.bounceValue,
      {
        toValue: toValue,
        velocity: 4,
        tension: 3,
        friction: 5,
      }
    ).start();
    menuIsHidden = !menuIsHidden
  }

  _toggleLogin() {
    // LoginManager.logInWithReadPermissions(['public_profile']).then(
    //   function(result) {
    //     if (result.isCancelled) {
    //       alert('Login was cancelled');
    //     } else {
    //       alert('Login was successful with permissions: '
    //         + result.grantedPermissions.toString());
    //     }
    //   },
    //   function(error) {
    //     alert('Login failed with error: ' + error);
    //   }
    // );
    // LoginManager.logOut()
    console.log('la;fdjal;fja', LoginManager.logOut)
  }

  render(){
    return ( // todo: FIX MENU WITH FB BUTTON
      // <View>
      //   <TouchableOpacity onPress={()=> {this._toggleSubview()}}>
      //     <Image source={require('../Images/mapreactor.png')} style={menuStyles.sonderButton}></Image>
      //   </TouchableOpacity>
      //
      //   <View style={menuStyles.container}>
      //     <Animated.View
      //       style={[
      //         menuStyles.subview,
      //         {transform: [{translateY: this.state.bounceValue}]}
      //       ]}
      //     >
      //       <MenuLogin style={menuStyles.facebookButton} onPress={()=> {
      //         this._toggleSubview()
      //         LoginManager.logOut()
      //       }}> </MenuLogin>
      //       <Button style={menuStyles.textButton} containerStyle={menuStyles.buttonContainer} onPress={()=> {
      //         this._toggleSubview()
      //         this._toggleLogin()
      //         console.log('LOGIN MANGAER', LoginManager, 'FBSDK', FBSDK)
      //       }}>{this.state.buttonText}</Button>
      //       <Button style={menuStyles.textButton} containerStyle={menuStyles.buttonContainer} onPress={()=> {
      //         this._toggleSubview()
      //       }}>Cancel</Button>
      //       {/* <TouchableHighlight underlayColor="rgba(225, 225, 225, 0.3)" onPress={()=> {this._toggleSubview()}}>
      //         <Text style={menuStyles.textButton}>Cancel</Text>
      //       </TouchableHighlight> */}
      //     </Animated.View>
      //   </View>
      // </View>
   )
  }
}
