import {readFileSync,writeFileSync} from 'node:fs';
const file='dist/index.html';
let html=readFileSync(file,'utf8');
if(!html.includes('manifest.webmanifest')) html=html.replace('</head>','<meta name="theme-color" content="#0B3B3C"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Liked"><meta name="robots" content="noindex,nofollow"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"></head>');
writeFileSync(file,html);
