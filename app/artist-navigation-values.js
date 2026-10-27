export function navigationLinks(rows){
 if(!Array.isArray(rows)||rows.length>8)throw Error('Use up to eight links in each section.');
 return rows.filter(row=>row.label.trim()||row.url.trim()).map(row=>{
  const label=row.label.trim(),value=row.url.trim();if(!label||label.length>60||!value||value.length>2000)throw Error('Enter a name and address for each link.');
  if(/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value))return {label,url:value};
  let url;try{url=new URL(value);}catch{throw Error('Use an HTTPS address or a section anchor.');}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS address without credentials.');
  return {label,url:url.href};
 });
}
