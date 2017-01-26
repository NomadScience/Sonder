// @flow

import React, { Component } from 'react'
import { Scene, Router } from 'react-native-router-flux'
import Styles from './Styles/NavigationContainerStyle'
import NavigationDrawer from './NavigationDrawer'
// import NavItems from './NavItems'

// screens identified by the router
// import CompassView from '../Containers/CompassView'
import WelcomeView from '../Containers/WelcomeView'
import SonderView from '../Containers/SonderView'
import SonderDebug from '../Containers/SonderDebug'

/* **************************
* Documentation: https://github.com/aksonov/react-native-router-flux
***************************/

class NavigationRouter extends Component {
  render () {
    return (
      <Router>
        <Scene key='drawer' component={NavigationDrawer} open={false}>
          <Scene key='drawerChildrenWrapper' navigationBarStyle={Styles.navBar} titleStyle={Styles.title} leftButtonIconStyle={Styles.leftButton} rightButtonTextStyle={Styles.rightButton}>
            <Scene key='welcomeView' hideNavBar={false} component={WelcomeView} />
            <Scene key='sonderView' component={SonderView} title='Sonder' />
            <Scene initial key='sonderDebug' component={SonderDebug} title='Sonder Data Debug' />
          </Scene>
        </Scene>
      </Router>
    )
  }
}

export default NavigationRouter
