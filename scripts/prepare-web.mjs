import {readFileSync,writeFileSync,existsSync,cpSync,readdirSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// Some static hosts protect paths containing node_modules. These are public
// compiled assets, so serve them under a neutral vendor path instead.
if(existsSync('dist/assets/node_modules')) cpSync('dist/assets/node_modules','dist/assets/vendor',{recursive:true});
function rewriteAssets(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory()) rewriteAssets(path);
    else if(entry.name.endsWith('.js')){
      const source=readFileSync(path,'utf8');
      writeFileSync(path,source.replaceAll('/assets/node_modules/','/assets/vendor/'));
    }
  }
}
rewriteAssets('dist/_expo');
const file='dist/index.html';
let html=readFileSync(file,'utf8');
for(const entry of readdirSync('dist/_expo/static/js/web').filter(name=>name.startsWith('entry-') && name.endsWith('.js'))){
  const path=join('dist/_expo/static/js/web',entry);
  const name=`entry-${createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,32)}.js`;
  if(name!==entry) renameSync(path,join('dist/_expo/static/js/web',name));
  html=html.replaceAll(entry,name);
}
html=html.replace('<html lang="en">','<html lang="fr">');
if(!html.includes('manifest.webmanifest')) html=html.replace('</head>','<meta name="theme-color" content="#0B3B3C"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Liked"><meta name="robots" content="noindex,nofollow"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"></head>');
writeFileSync(file,html);
