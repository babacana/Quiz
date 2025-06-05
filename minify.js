const fs = require('fs');
const path = process.argv[2];
if(!path){
  console.error('usage: node minify.js file');
  process.exit(1);
}
const ext = path.split('.').pop();
const code = fs.readFileSync(path,'utf8');
let out;
function minifyJS(src){
  return src
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\/\/[^\n\r]*/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function minifyCSS(src){
  return src
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\s+/g,' ')
    .replace(/\s*([:;,{}])\s*/g,'$1')
    .trim();
}
function minifyHTML(src){
  return src
    .replace(/<!--([\s\S]*?)-->/g,'')
    .replace(/\s+/g,' ')
    .replace(/>\s+</g,'><')
    .trim();
}
function minifyJSON(src){
  return JSON.stringify(JSON.parse(src));
}
if(ext==='js') out=minifyJS(code);
else if(ext==='css') out=minifyCSS(code);
else if(ext==='html') out=minifyHTML(code);
else if(ext==='json') out=minifyJSON(code);
else { console.error('unknown extension'); process.exit(1); }
const outPath = path.replace(/\.([^.]+)$/,'\.min.$1');
fs.writeFileSync(outPath,out);
console.log('Written',outPath);
