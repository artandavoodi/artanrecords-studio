import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBytes from './NotoSans-Regular.ttf';

// A readable evidence copy, not a certificate-based PDF signature or legal seal.
export async function agreementPdf({envelope,version,signatures,events}){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes,{subset:true}),supported=new Set(font.getCharacterSet());
 const date=new Date(envelope.created_at);pdf.setTitle(version.terms.title);pdf.setAuthor('Artanrecords');pdf.setCreationDate(date);pdf.setModificationDate(new Date(envelope.updated_at||envelope.created_at));
 const pages=[],width=595.28,height=841.89,margin=48,lineHeight=16,ink=rgb(.12,.14,.17);let page,y;
 function next(){page=pdf.addPage([width,height]);pages.push(page);y=height-margin;page.drawText('Artanrecords',{x:margin,y,font,size:15,color:ink});y-=28;}
 function text(value,size=10){
  const input=String(value??'').replaceAll('\t','    ');
  for(const char of input)if(char!=='\n'&&!supported.has(char.codePointAt(0)))throw Error('This document contains characters the PDF font cannot display. No incomplete PDF was downloaded.');
  for(const paragraph of input.split('\n')){
   let line='';for(const word of paragraph.split(/(\s+)/)){
    if(font.widthOfTextAtSize(line+word,size)>width-margin*2&&line){draw(line.trimEnd(),size);line='';}
    const token=line?word:word.trimStart();
    for(const char of token){if(font.widthOfTextAtSize(line+char,size)>width-margin*2&&line){draw(line,size);line='';}line+=char;}
   }draw(line,size);
  }
 }
 function draw(line,size){if(y<margin+35)next();page.drawText(line,{x:margin,y,font,size,color:ink});y-=lineHeight;}
 next();text(version.terms.title,16);y-=8;text('NON-BINDING RECORD - NOT AN EXECUTED CONTRACT',10);text('Status: '+envelope.status.replaceAll('_',' '));text('Document version: '+version.version_number);y-=12;text(version.terms.body);
 next();text('Signature records',15);text('Images record the non-binding workflow only.');
 for(const signature of signatures){
  if(signature.document_sha256!==version.terms_digest)throw Error('A signature does not match this document. No PDF was downloaded.');
  const bytes=Uint8Array.from(atob(signature.image_base64),c=>c.charCodeAt(0));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==signature.image_sha256)throw Error('Signature image verification failed. No PDF was downloaded.');
  if(y<260)next();y-=12;text(signature.signer_role==='artist'?'Artist':'Label',12);text(signature.display_name);text('Recorded: '+signature.recorded_at);
  const image=await pdf.embedPng(bytes),scale=Math.min(230/image.width,75/image.height);page.drawImage(image,{x:margin,y:y-80,width:image.width*scale,height:image.height*scale});y-=100;
  text('Section initials: '+Object.entries(signature.section_initials||{}).map(([key,value])=>key+': '+value).join(' / '));
 }
 next();text('Document record',15);text('Reference: '+envelope.id);text('Document SHA-256:');text(version.terms_digest);y-=12;text('Activity',12);
 for(const event of events)text(event.action.replaceAll('_',' ')+' - '+event.created_at);
 text('This copy is generated from the stored document and signature records. It is not a qualified signature, a cryptographic PDF seal or proof of a legally executed agreement.');
 pages.forEach((sheet,index)=>sheet.drawText('NON-BINDING  |  '+(index+1)+' / '+pages.length,{x:margin,y:25,font,size:8,color:ink}));
 return pdf.save();
}
