
const getCurrentDeviceLocation = function () {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ 'error': null, 'position': position }) ,
      (error) => resolve({ 'error': error, 'position': null })
    );
  });
}

module.exports.getCurrentDeviceLocation = getCurrentDeviceLocation;
