'use strict';
/* eslint no-console: 0 */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import Mapbox, { MapView } from 'react-native-mapbox-gl';
import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import PopupDialog, {
  DialogTitle,
  DialogButton,
  SlideAnimation
} from 'react-native-popup-dialog';

import Styles from './Styles/MapViewStyle'
import popupStyles from './Styles/PopupStyle'
import loginStyles from './Styles/SonderLoginStyle'
import Compass from '../Lib/Compass'
import {
  reverseTuples,
  calculateRegionCenter,
  getPrettyBearing,
  toTuples
} from '../Lib/MapHelpers';
import { makeUrl } from '../Lib/Utilities'
import FriendsHelpers from '../Lib/FriendsHelpers'
// import Menu from './MenuView'
import Login from './FBLoginView'

const accessToken = 'pk.eyJ1Ijoic2FsbW9uYXgiLCJhIjoiY2l4czY4dWVrMGFpeTJxbm5vZnNybnRrNyJ9.MUj42m1fjS1vXHFhA_OK_w';
Mapbox.setAccessToken(accessToken);

import _ from 'lodash'
import qs from 'querystring'
import OAuthSimple from 'oauthsimple'
import nonce from 'nonce'
const n = nonce();
import { yelpConsumerSecret, yelpTokenSecret } from '../../config.js'



class SonderView extends Component {
  state = {
    initialZoomLevel: 8,
    userTrackingMode: Mapbox.userTrackingMode.follow,
    facingHood: {},
    annotations: [],
    /*
    /*<--- Popup state --->*/
      popupView: 'current', // alternatively, 'facing'
      popupTitle: '',
      popupLat: 0,
      popupLon: 0,
      popupExtract: '',
      popupImageUrl: '',
      popupImageWidth: 0,
      popupImageHeight: 0,
      yelpOneName: '',
      yelpOneUrl: '',
      yelpOneReviewCount: '',
      yelpOneCategory: '',
      yelpOneImageUrl: '',
      yelpTwoName: '',
      yelpTwoUrl: '',
      yelpTwoReviewCount: '',
      yelpTwoCategory: '',
      yelpTwoImageUrl: '',
      yelpThreeName: '',
      yelpThreeUrl: '',
      yelpThreeReviewCount: '',
      yelpThreeCategory: '',
      yelpThreeImageUrl: '',
    /*<--- Popup state --->*/
      center: {
        longitude: -122.40258693695068,
        latitude: 37.78477457373192
      },
  };

  /*<----------------------------- Popup methods ---------------------------->*/
  openDialog = (() => {
    this.popupDialog.openDialog();
  }).bind(this)

  closeDialog = (() => {
    this.popupDialog.closeDialog();
  }).bind(this)

  fetchWikiHoodInfo = (() => {
    const baseUrl = 'https://en.wikipedia.org/w/api.php?'
    const params = {
      format: 'json',
      action: 'query',
      prop: 'pageprops|info|extracts',
      exintro: '',
      explaintext: '',
      inprop: 'url',
      titles: `${ this.state.popupTitle }, San Francisco`
    }
    const url = makeUrl(baseUrl, params);

    return fetch(url)
      .then((response) => response.json())
      .then((responseJson) => {
        if (responseJson.query.pages === -1) {
          throw "Neighborhood not found in Wikipedia";
        }
        for ( var key in responseJson.query.pages) {
          let page = responseJson.query.pages[key]
          this.setState({
            popupExtract: page.extract.replace(/\n/g,"\n\n"),
            wikiUrl: page.fullurl
          });
          return page.pageprops.page_image_free
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }).bind(this)

  fetchWikiHoodImageUrl = ((imageName) => {
    const baseUrl = 'https://en.wikipedia.org/w/api.php?'
    const params = {
      action: "query",
      format: "json",
      titles: `File:${imageName}`,
      prop: "imageinfo",
      iiprop: "url|size",
      iiurlwidth: "200",
    }
    const url = makeUrl(baseUrl, params);
    fetch(url)
      .then((response) => response.json())
      .then((responseJson) => {
        for ( var key in responseJson.query.pages["-1"].imageinfo) {
          let image = responseJson.query.pages["-1"].imageinfo[key]
          this.setState({
            popupImageUrl: image.thumburl,
            popupImageWidth: image.thumbwidth,
            popupImageHeight: image.thumbheight
          });
          // this.setImageUrl(image.thumburl)
          // this.setImageWidth(image.thumbwidth)
          // this.setImageHeight(image.thumbheight)
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }).bind(this)

  // TODO
  fetchYelpHoodCoffee = (() => {
    const lat = this.state.popupLat
    const lng = this.state.popupLon
    const latlng = "ll=" + String(lat) + "," + String(lng)

    const oauth = new OAuthSimple('eUUiBEeoxTfKX2YGudP_6g', yelpTokenSecret)

    const request = oauth.sign({
      action: "GET",
      path: "https://api.yelp.com/v2/search",
      parameters: "term=coffee&radius_filter=800&" + latlng,
      signatures: {
        api_key: 'eUUiBEeoxTfKX2YGudP_6g',
        shared_secret: yelpConsumerSecret,
        access_token: 'Xc_rCgwJ7OqRAP5HiXQMIIXUw-v1QtW0',
        access_secret: yelpTokenSecret,
      },
    })

    return fetch(request.signed_url)
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(JSON.stringify(responseJson.businesses[0]));
        this.setState({
          yelpOneName: responseJson.businesses[0].name,
          yelpOneUrl: responseJson.businesses[0].mobile_url,
          yelpOneReviewCount: responseJson.businesses[0].review_count,
          yelpOneCategory: responseJson.businesses[0].categories[0][0],
          yelpOneImageUrl: responseJson.businesses[0].rating_img_url_small,
          yelpTwoName: responseJson.businesses[1].name,
          yelpTwoUrl: responseJson.businesses[1].mobile_url,
          yelpTwoReviewCount: responseJson.businesses[1].review_count,
          yelpTwoCategory: responseJson.businesses[1].categories[0][0],
          yelpTwoImageUrl: responseJson.businesses[1].rating_img_url_small,
          yelpThreeName: responseJson.businesses[2].name,
          yelpThreeUrl: responseJson.businesses[2].mobile_url,
          yelpThreeReviewCount: responseJson.businesses[2].review_count,
          yelpThreeCategory: responseJson.businesses[2].categories[0][0],
          yelpThreeImageUrl: responseJson.businesses[2].rating_img_url_small,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }).bind(this)

  setPopupHoodData = (() => {
    const popupTitle = this.state.popupView === 'current' ?
      this.state.entities.hoods.current.name :
      this.state.facingHood.name
    let popupCoord;
    if (this.state.popupView === 'current') {
      popupCoord = this.state.annotations
        .filter(annotation => annotation.id === 'currentHoodCenter')[0]
        .coordinates
    } else {
      popupCoord = this.state.annotations
        .filter(annotation => annotation.id === 'adjacentHoodCenter')[0]
        .coordinates
    }

    this.setState({
      popupTitle: popupTitle,
      popupLat: popupCoord[0],
      popupLon: popupCoord[1],
    })

  }).bind(this)

  getpopupHoodData = (() => {
    this.setPopupHoodData();
    this.fetchWikiHoodInfo()
      .then((imageName) => {
        this.fetchWikiHoodImageUrl(imageName)
      })
      .catch((error) => {
        console.error(error);
      });
    this.fetchYelpHoodCoffee();
  }).bind(this)

  clearpopupHoodData = (() => {
    this.setState({
      popupTitle: '',
      popupLat: 0,
      popupLon: 0,
      popupExtract: '',
      popupImageUrl: '',
      popupImageWidth: 0,
      popupImageHeight: 0,
      wikiUrl: '',
      yelpOneName: '',
      yelpOneUrl: '',
      yelpOneReviewCount: '',
      yelpOneCategory: '',
      yelpOneImageUrl: '',
      yelpTwoName: '',
      yelpTwoUrl: '',
      yelpTwoReviewCount: '',
      yelpTwoCategory: '',
      yelpTwoImageUrl: '',
      yelpThreeName: '',
      yelpThreeUrl: '',
      yelpThreeReviewCount: '',
      yelpThreeCategory: '',
      yelpThreeImageUrl: '',
    })
  }).bind(this)
  /*<--------------------------- / Popup methods ---------------------------->*/

  /*<----------------------------- Map methods ------------------------------>*/
  onRegionDidChange = (location) => {
    this.setState({ currentZoom: location.zoomLevel });
    console.log('onRegionDidChange', location);
  };
  onRegionWillChange = (location) => {
    console.log('onRegionWillChange', location);
  };
  onUpdateUserLocation = (location) => {
    console.log('onUpdateUserLocation', location);
  };
  onOpenAnnotation = (annotation) => {
    console.log('onOpenAnnotation', annotation);

    if (annotation.id !== 'currentHoodCenter' && annotation.id !== 'adjacentHoodCenter') {
      return;
    }
    const popupView = annotation.id === 'currentHoodCenter' ?
      'current' : 'facing';
    this.setState({popupView: popupView})
    this.openDialog();

  };
  onChangeUserTrackingMode = (userTrackingMode) => {
    this.setState({ userTrackingMode });
    console.log('onChangeUserTrackingMode', userTrackingMode);
  };

  setCompassAnnotation(headingData) {
    let compassTuple = toTuples(headingData.compassLine);
    compassTuple = [compassTuple[0].reverse(), compassTuple[1].reverse()]

    const compassLineObj = {
      id: 'compassLine',
      coordinates: compassTuple,
      type: 'polyline',
      strokeColor: '#00FB00',
      strokeWidth: 4,
      strokeAlpha: .5
    }

    const compassAnnotationExists = this.state.annotations
      .filter(annotation => annotation.id === 'compassLine')
      .length === 1;

    if (compassAnnotationExists) {
      this.setState({
        annotations: this.state.annotations.map(annotation => {
          if (annotation.id === 'compassLine') {
            return compassLineObj
          } else {
            return annotation
          }
        })
      })
    } else {
      const annotations = this.state.annotations.slice();
      annotations.push(compassLineObj)
      this.setState({
        annotations: annotations
      })
    }
  }

  setCurrentHoodAnnotation() {
    if (!this.state.entities) {
      return
    }

    let annotations = this.state.annotations.slice();
    let coordinates = this.state.entities.hoods.current.coordinates[0]
    let center = calculateRegionCenter(coordinates);

    const currentHoodObj = {
      coordinates: reverseTuples(coordinates),
      type: 'polygon',
      fillAlpha: 0.3,
      strokeColor: '#ffffff',
      fillColor: '#0000ff',
      id: 'currentHood',
    }

    const currentHoodCenterObj = {
      coordinates: reverseTuples(center),
      type: 'point',
      id: 'currentHoodCenter',
    }

    const currentHoodAnnotationExists = this.state.annotations
      .filter(annotation => annotation.id === 'currentHood')
      .length === 1;

    if (currentHoodAnnotationExists) {
      this.setState({
        annotations: this.state.annotations.map(annotation => {
          if (annotation.id === 'currentHood') {
            return currentHoodObj
          } else if (annotation.id === 'currentHoodCenter') {
            return currentHoodCenterObj
          } else {
            return annotation
          }
        })
      })
    } else {
      const annotations = this.state.annotations.slice();
      annotations.push(currentHoodObj)
      annotations.push(currentHoodCenterObj)
      this.setState({
        annotations: annotations
      })
    }
  }

  setAdjacentHoodAnnotation() {
    this.setFacingHood();

    if (!this.state.entities) {
      return
    }

    let annotations = this.state.annotations.slice();
    let coordinates = this.state.facingHood.coordinates[0]
    let center = calculateRegionCenter(coordinates);

    const adjacentHoodObj = {
      coordinates: reverseTuples(coordinates),
      type: 'polygon',
      fillAlpha: 0.3,
      strokeColor: '#00e6e6',
      fillColor: '#00e6e6',
      id: 'adjacentHood',
    }

    const adjacentHoodCenterObj = {
      coordinates: reverseTuples(center),
      type: 'point',
      id: 'adjacentHoodCenter',
    }

    const adjacentHoodAnnotationExists = this.state.annotations
      .filter(annotation => annotation.id === 'adjacentHood')
      .length === 1;

    if (adjacentHoodAnnotationExists) {
      this.setState({
        annotations: this.state.annotations.map(annotation => {
          if (annotation.id === 'adjacentHood') {
            return adjacentHoodObj
          } else if (annotation.id === 'adjacentHoodCenter') {
            return adjacentHoodCenterObj
          } else {
            return annotation
          }
        })
      })
    } else {
      const annotations = this.state.annotations.slice();
      annotations.push(adjacentHoodObj)
      annotations.push(adjacentHoodCenterObj)
      this.setState({
        annotations: annotations
      })
    }
  }
  /*<---------------------------- / Map methods ----------------------------->*/

  /*<---------------- Component mounting/unmounting methods ----------------->*/
  componentWillMount() {
    Compass.start({
      minAngle: 1,
      radius: 10,
      onInitialPosition: (initialPosition) => {
        this.setState({ initialPosition })
      },
      onInitialHoods: ({ currentHood, adjacentHoods, hoodLatLngs, streetLatLngs}) => {
        this.setState({
          currentHood,
          adjacentHoods,
          hoods: hoodLatLngs,
          streets: streetLatLngs,
        });
      },
      onHeadingSupported: (headingIsSupported) =>
        this.setState({ headingIsSupported }),
      onPositionChange: (lastPosition) =>
        this.setState({ lastPosition }),
      onHeadingChange: (headingData) => {
        this.setCompassAnnotation(headingData)
        this.setAdjacentHoodAnnotation()
      },
      onEntitiesDetected: (entities) => {
        this.setState({ entities });
        this.setCurrentHoodAnnotation();
        this.setAdjacentHoodAnnotation();
      }
    });
  }

  componentWillUnmount() {
    Compass.stop();
  }
  /*<--------------- / Component mounting/unmounting methods ---------------->*/

  setFacingHood() {
    if (!this.state.entities) {
      return
    }
    this.setState({facingHood: this.state.entities.hoods.adjacents
      .reduce((closestHood, hood) => hood.distance < closestHood.distance ?
        hood : closestHood
      )
    })
  }
  /*<---------------------------- / Map methods ----------------------------->*/

  /*<---------------- Component mounting/unmounting methods ----------------->*/
    componentWillMount() {
      Compass.start({
        minAngle: 1,
        radius: 10,
        onInitialPosition: (initialPosition) => {
          this.setState({ initialPosition })
        },
        onInitialHoods: ({ currentHood, adjacentHoods, hoodLatLngs, streetLatLngs}) => {
          this.setState({
            currentHood,
            adjacentHoods,
            hoods: hoodLatLngs,
            streets: streetLatLngs,
          });
        },
        onHeadingSupported: (headingIsSupported) =>
          this.setState({ headingIsSupported }),
        onPositionChange: (lastPosition) =>
          this.setState({ lastPosition }),
        onHeadingChange: (headingData) => {
          this.setCompassAnnotation(headingData)
          this.setAdjacentHoodAnnotation()
        },
        onEntitiesDetected: (entities) => {
          this.setState({ entities });
          this.setCurrentHoodAnnotation();
          this.setAdjacentHoodAnnotation();
        }
      });

      console.log('INSIDE componentWillMount. PROPS: ', this.props)
      // set annotations for intial friendsLocations
      this.setState((prevState, props) => {
        return FriendsHelpers.updateFriendsLocations(prevState, props)
      })
    }

    componentWillUnmount() {
      Compass.stop();
    }

    componentWillReceiveProps(nextProps) {
      // annotations change dynamically based on changes in friendsLocations
      // console.log(nextProps);
      this.setState((prevState, nextProps) => {
        return FriendsHelpers.updateFriendsLocations(prevState, nextProps)
      })
    }
  /*<--------------- / Component mounting/unmounting methods ---------------->*/

  render() {
    StatusBar.setHidden(true);
    return (
      /*------------------------------ Map View ----------------------------- */
      <View style={styles.container}>
        <MapView
          ref={map => { this._map = map; }}
          style={styles.map}
          initialCenterCoordinate={this.state.center}
          initialZoomLevel={this.state.initialZoomLevel}
          initialDirection={0}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          showsUserLocation={false}
          styleURL={Mapbox.mapStyles.streets}
          userTrackingMode={this.state.userTrackingMode}
          annotations={this.state.annotations}
          annotationsAreImmutable
          annotationsPopUpEnabled={true}
          onChangeUserTrackingMode={this.onChangeUserTrackingMode}
          onRegionDidChange={this.onRegionDidChange}
          onRegionWillChange={this.onRegionWillChange}
          onOpenAnnotation={this.onOpenAnnotation}
          onRightAnnotationTapped={this.onRightAnnotationTapped}
          onUpdateUserLocation={this.onUpdateUserLocation}
          onLongPress={this.onLongPress}
          onTap={this.onTap}
          logoIsHidden
        />
      {/*----------------------------- / Map View ---------------------------*/}

      {/*---------------------------- Popup View --------------------------- */}
        <PopupDialog
          // ref={(popupDialog) => { this.setState({popupDialog: popupDialog}); }}
          ref={(popupDialog) => { this.popupDialog = popupDialog }}
          onOpened={() => {this.getpopupHoodData(); }}
          onClosed={() => {this.clearpopupHoodData(); }}
          width={.85}
          height={.75}
          dialogStyle={{padding: 10}}
          actions={[
            <DialogButton
              buttonStyle={popupStyles.buttonStyle}
              textContainerStyle={popupStyles.textContainerStyle}
              textStyle={popupStyles.textStyle}
              text="CLOSE"
              align="center"
              onPress={this.closeDialog}
              key="closePopup"
            />
          ]}
          dialogTitle={
            <DialogTitle
              titleTextStyle={{fontSize: 20}}
              title={this.state.popupTitle}
            />
          }
        >

          <ScrollView>
            <View  style={popupStyles.scrollView}>
              <Image
                style={popupStyles.wikiImage}
                source={{uri: this.state.popupImageUrl}}
                width={this.state.popupImageWidth}
                height={this.state.popupImageHeight}
                maintainAspectRatio={true}
              />
              <Text
                style={popupStyles.wikiExtract}
              >
              {this.state.popupExtract}
              </Text>
              <Text onPress={() => {
                Linking.openURL(this.state.wikiUrl)
                  .catch(err => console.error('An error occurred', err));}}
                  style={{
                    fontSize: 12,
                    textAlign: 'left',
                    padding: 10,
                    color: 'blue'
                  }}
                >{this.state.wikiUrl ? "Wikipedia" : ""}
              </Text>
            </View>
            <YelpView
              name={this.state.yelpOneName}
              url={this.state.yelpOneUrl}
              reviewCount={this.state.yelpOneReviewCount}
              category={this.state.yelpOneCategory}
              imageUrl={this.state.yelpOneImageUrl}
            />
            <YelpView
              name={this.state.yelpTwoName}
              url={this.state.yelpTwoUrl}
              reviewCount={this.state.yelpTwoReviewCount}
              category={this.state.yelpTwoCategory}
              imageUrl={this.state.yelpTwoImageUrl}
            />
            <YelpView
              name={this.state.yelpThreeName}
              url={this.state.yelpThreeUrl}
              reviewCount={this.state.yelpThreeReviewCount}
              category={this.state.yelpThreeCategory}
              imageUrl={this.state.yelpThreeImageUrl}
            />
          </ScrollView>

        </PopupDialog>
      {/*--------------------------- / Popup View -------------------------- */}

      {/*--------------------------- Menu Subview -------------------------- */}
        {/* <Menu /> */}
        <View style={loginStyles.subview}>
          <TouchableOpacity><Login /></TouchableOpacity>
        </View>
      {/*-------------------------- / Menu Subview ------------------------- */}
      </View>
    );
  }

}

{/*-------------------------------- Yelp View ------------------------------ */}
class YelpView extends Component {
  constructor(props){
    super(props)
  }
  onTitlePress = () => {
    // https://www.yelp.com/biz/the-sentinel-san-francisco
    // yelp:///biz/the-sentinel-san-francisco
    const deepLinkUrl = `yelp:///${this.props.url.slice(18)}`;
    Linking.canOpenURL(deepLinkUrl)
      .then(supported => {
        if (!supported) {
          Linking.openURL(this.props.url)
        } else {
          return Linking.openURL(deepLinkUrl);
        }
      })
      .catch(err => console.error('An error occurred', err))
  }
  render(){
    return(
      // <View>{listItems}</View>
      <View>
        <View style={popupStyles.yelpTitleContainer}>
        <Text style={popupStyles.yelpTitle} onPress={() => this.onTitlePress()}>
          {this.props.name}
        </Text>
          <Image style={popupStyles.yelpRating} source={{uri: this.props.imageUrl}}
          />
        </View>
        <View style={popupStyles.yelpCategoriesContainer} >
          <Text style={popupStyles.yelpCategories} >{this.props.category}</Text>
          <Text style={popupStyles.yelpReviewCount} >
            {this.props.reviewCount ? this.props.reviewCount + ' Reviews' : ''}
          </Text>
        </View>
      </View>
    )
  }
}
{/*------------------------------ / Yelp View ------------------------------ */}


const mapStateToProps = (state) => {
  return {
    friendsLocations: state.friendsLocations
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch'
  },
  map: {
    flex: 1
  },
  scrollView: {
    flex: 1
  }
});

export default connect(mapStateToProps)(SonderView)
