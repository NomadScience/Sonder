const post = function (location) {
  return fetch('http://sondersf.com/api/location', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(location)
  }).then((response)=>{
    if (response.ok) {
      console.log("PUBLISH LOCATION -> POST SUCCESS")
    } else {
      console.log("PUBLISH LOCATION -> RESPONSE NOT OK")
    }
  }).catch((error)=>{
    console.log("PUBLISH LOCATION -> ERROR");
  })
}

export default {
  post
}
