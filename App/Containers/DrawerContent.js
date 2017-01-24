// @flow

import React, { PropTypes, Component } from 'react'
import { ScrollView, Image, BackAndroid } from 'react-native'
import { connect } from 'react-redux'
import styles from './Styles/DrawerContentStyle'
import { Images } from '../Themes'
import DrawerButton from '../Components/DrawerButton'
import { Actions as NavigationActions } from 'react-native-router-flux'
import I18n from 'react-native-i18n'

class DrawerContent extends Component {

  componentDidMount () {
    BackAndroid.addEventListener('hardwareBackPress', () => {
      if (this.context.drawer.props.open) {
        this.toggleDrawer()
        return true
      }
      return false
    })
  }

  toggleDrawer () {
    this.context.drawer.toggle()
  }

  handlePressUsage = () => {
    this.toggleDrawer()
    NavigationActions.usageExamples()
  }

  handlePressSonderView = () => {
    this.toggleDrawer()
    NavigationActions.SonderView()
  }

  // handlePressCompassView = () => {
  //   this.toggleDrawer()
  //   NavigationActions.compassView()
  // }

  handlePressSonderView = () => {
    this.toggleDrawer()
    NavigationActions.sonderView()
  }

  handlePressWelcomeView = () => {
    this.toggleDrawer()
    NavigationActions.welcomeView()
  }

  handlePressFriendsView = () => {
    this.toggleDrawer()
    NavigationActions.friendsView()
  }

  handlePressLogin = () => {
    this.toggleDrawer()
    NavigationActions.login()
  }

  handlePressLogout = () => {
    this.toggleDrawer()
    this.props.logout()
  }

  renderLoginButton () {
    return (
      <DrawerButton text='Login' onPress={this.handlePressWelcomeView} />
    )
  }

  renderLogoutButton () {
    return (
      <DrawerButton text='Logout' onPress={this.handlePressWelcomeView} />
    )
  }

  render () {
    let { loggedIn } = true
    return (
      <ScrollView style={styles.container}>
        <Image source={Images.logo} style={styles.logo} />
        <DrawerButton text='Sonder' onPress={this.handlePressSonderView} />
        {/*<DrawerButton text='Compass (deprecated)' onPress={this.handlePressCompassView} />*/}
        {/*<DrawerButton text='Mapbox Example' onPress={this.handlePressMapBoxExampleView} />*/}
        {/*<DrawerButton text='Mapbox Example SF' onPress={this.handlePressMapBoxExampleSfView} />*/}
        {/*<DrawerButton text='Friends View' onPress={this.handlePressFriendsView} />*/}
        {/*{loggedIn ? this.renderLogoutButton() : this.renderLoginButton()}*/}
      </ScrollView>
    )
  }

}

DrawerContent.contextTypes = {
  drawer: React.PropTypes.object,
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawerContent)
