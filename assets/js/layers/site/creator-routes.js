// Accept an approved username, never an account ID or an unreviewed username request.
export function creatorPath(username,config,reserved=[],slug=null){
 if(typeof username!=='string'||!/^[a-z0-9][a-z0-9.]{1,30}[a-z0-9]$/.test(username)||username.includes('..')||[...reserved,...config.routes.reservedRoots].includes(username))throw Error('Invalid creator address');
 if(slug!==null&&(typeof slug!=='string'||slug.length>config.limits.slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)))throw Error('Invalid product address');
 return (slug===null?config.routes.store:config.routes.product).replace('{username}',username).replace('{slug}',slug||'');
}
export function creatorShopRoute(pathname,config,reserved=[]){
 const match=/^\/([^/]+)\/shop\/(?:([^/]+)\/)?$/.exec(pathname);
 if(!match)return null;
 try{const path=creatorPath(match[1],config,reserved,match[2]??null);return {username:match[1],slug:match[2]||null,path};}catch{return null;}
}
