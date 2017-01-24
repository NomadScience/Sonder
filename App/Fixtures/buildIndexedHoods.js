const { makeIndexedCollection } = require('./geoHelpers');
const fs = require('fs');

const data = [
  { src: require('./raw/sanFrancisco.json'), dest: './indexed/sanFrancisco.json' },
  { src: require('./raw/southSF.json'), dest: './indexed/southSF.json' },
  { src: require('./raw/eastBay.json'), dest: './indexed/eastBay.json' },
  { src: require('./raw/siliconValley.json'), dest: './indexed/siliconValley.json' },
];

// Assumes build directory exists
console.log('Processing...')
console.log('Warning: this will take several minutes.')
const start = Date.now();
data.forEach((file,index) => {
  fs.writeFile(file.dest, JSON.stringify( makeIndexedCollection(file.src) ) );
  console.log('File written to '+ file.dest);
});
const seconds = (Date.now()-start)/1000;
console.log('Total time: '+Math.floor(seconds/60)+'m'+Math.floor(seconds%60)+'s');
