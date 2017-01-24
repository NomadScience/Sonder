const { makeBoundaryCollection } = require('./geoHelpers');
const fs = require('fs');
const data = [
  { collection: require('./raw/sanFrancisco.json'), properties: { label: "San Francisco" } },
  { collection: require('./raw/southSF.json'), properties: { label: "South San Francisco" }},
  { collection: require('./raw/eastBay.json'), properties: { label: "East Bay"} },
  { collection: require('./raw/siliconValley.json'), properties: { label: "Silicon Valley" }},
];
const outputFilePath = './indexed/bayAreaBoundaries.json';

// Assumes indexed folder exists
console.log('Processing...')
fs.writeFile(outputFilePath, JSON.stringify( makeBoundaryCollection(data) ));
console.log('File written to '+outputFilePath);
