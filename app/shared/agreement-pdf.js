import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBytes from './NotoSans-Regular.ttf';

// A readable evidence copy, not a certificate-based PDF signature or legal seal.
export const agreementTitle=version=>String(version.terms.title).replace(version.terms.verification_source_intake?/^Signing verification · /:/^$/, '');
export async function agreementPdf({envelope,version,signatures,events,logoBytes,preparedSignature}){
 const draft=version.terms?.kind==='agreement_draft_v1',details=version.terms?.kind==='artist_details_record_v1',real=!draft&&!details&&envelope.rehearsal===false;
 if(details&&signatures.length)throw Error('An artist details export cannot contain contract signatures.');
 if(draft&&signatures.length)throw Error('A draft export cannot include signing evidence.');
 if(real&&version.terms?.kind!=='artist_partnership_execution_v1')throw Error('Unrecognized real document version. No PDF was downloaded.');
 const fullySigned=real&&signatures.some(row=>row.signer_role==='artist')&&signatures.some(row=>row.signer_role==='label');
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 if(!logoBytes){const response=await fetch('/assets/brand/email-wordmark.png',{credentials:'omit'});if(!response.ok)throw Error('The document logo could not be loaded. No incomplete PDF was downloaded.');logoBytes=new Uint8Array(await response.arrayBuffer());}
 const logo=await pdf.embedPng(logoBytes),logoWidth=160,logoHeight=logo.height*logoWidth/logo.width;
 const font=await pdf.embedFont(fontBytes,{subset:true}),supported=new Set(font.getCharacterSet());
 const date=new Date(envelope.created_at);pdf.setTitle(agreementTitle(version));pdf.setAuthor('Artanrecords');pdf.setCreationDate(date);pdf.setModificationDate(new Date(envelope.updated_at||envelope.created_at));
 const pages=[],width=595.28,height=841.89,margin=48,lineHeight=16,ink=rgb(.12,.14,.17);let page,y;
 function next(){page=pdf.addPage([width,height]);pages.push(page);y=height-margin;page.drawImage(logo,{x:margin,y:y-logoHeight,width:logoWidth,height:logoHeight});y-=logoHeight+20;}
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
 next();text(agreementTitle(version),16);y-=8;text(details?version.terms.notice:draft?'DRAFT - NOT ISSUED OR SIGNED':real?(fullySigned?'SIGNED DOCUMENT RECORD':'ISSUED DOCUMENT - SIGNATURES PENDING'):'Non-binding record - not an executed contract',10);text('Status: '+envelope.status.replaceAll('_',' '));if(!draft)text('Document version: '+version.version_number);y-=12;text(version.terms.body);
 if(details){pages.forEach((sheet,index)=>sheet.drawText('PRIVATE DETAILS  |  '+(index+1)+' / '+pages.length,{x:margin,y:25,font,size:8,color:ink}));return pdf.save();}
 if(draft){pages.forEach((sheet,index)=>sheet.drawText('DRAFT  |  '+(index+1)+' / '+pages.length,{x:margin,y:25,font,size:8,color:ink}));return pdf.save();}
 next();text('Signature records',15);text(real?'Recorded signing evidence for this exact document version.':'Images record the non-binding workflow only.');
 for(const signature of signatures){
  if(signature.document_sha256!==version.terms_digest)throw Error('A signature does not match this document. No PDF was downloaded.');
  const bytes=Uint8Array.from(atob(signature.image_base64),c=>c.charCodeAt(0));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==signature.image_sha256)throw Error('Signature image verification failed. No PDF was downloaded.');
  if(y<260)next();y-=12;text(signature.signer_role==='artist'?'Artist':'Label',12);text(signature.display_name);text('Recorded: '+signature.recorded_at);
  const image=await pdf.embedPng(bytes),scale=Math.min(230/image.width,75/image.height);page.drawImage(image,{x:margin,y:y-80,width:image.width*scale,height:image.height*scale});y-=100;
  text('Section initials: '+Object.entries(signature.section_initials||{}).map(([key,value])=>key+': '+value).join(' / '));
 }
 if(preparedSignature){if(y<220)next();y-=12;text('Prepared signature - not yet signed',12);const image=await pdf.embedPng(Uint8Array.from(atob(preparedSignature),c=>c.charCodeAt(0))),scale=Math.min(230/image.width,75/image.height);page.drawImage(image,{x:margin,y:y-80,width:image.width*scale,height:image.height*scale});y-=100;text('Preview only. This image is not recorded signing evidence.');}
 next();text('Document record',15);text('Reference: '+envelope.id);text('Document SHA-256:');text(version.terms_digest);y-=12;text('Activity',12);
 for(const event of events)text(event.action.replaceAll('_',' ')+' - '+event.created_at);
 text(real?'This copy is generated from the fixed stored document and its signing records. It is not a qualified electronic signature or a cryptographic PDF seal. Studio activation is a separate owner-reviewed action.':'This copy is generated from the stored document and signature records. It is not a qualified signature, a cryptographic PDF seal or proof of a legally executed agreement.');
 pages.forEach((sheet,index)=>sheet.drawText((real?'DOCUMENT RECORD':'NON-BINDING')+'  |  '+(index+1)+' / '+pages.length,{x:margin,y:25,font,size:8,color:ink}));
 return pdf.save();
}
