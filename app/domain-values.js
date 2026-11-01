import config from '../content/domains.json' with {type:'json'};
export function domainHostname(value){
 const input=String(value||'').trim().replace(/\.$/,'');
 if(!input||/[\s/:?#@*]/.test(input))throw Error('Enter a domain only, such as shop.yourname.com.');
 let hostname;try{hostname=new URL('https://'+input).hostname;}catch{throw Error('Enter a valid domain.');}
 if(hostname.length>253||!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(hostname)||/\.(localhost|local|internal|invalid|test|example)$/.test(hostname)||config.protectedHosts.some(host=>hostname===host||hostname.endsWith('.'+host)))throw Error('Use a public custom domain outside the platform domains.');
 return hostname;
}
