import rules from '../content/release-submission.json' with {type:'json'};
export async function inspectMaster(file){
 if(!file||!file.size||file.size>rules.maxBytes)throw Error('Choose a WAV or FLAC master up to 512 MiB.');
 const buffer=await file.slice(0,65536).arrayBuffer(),view=new DataView(buffer),bytes=new Uint8Array(buffer),text=(start,size)=>String.fromCharCode(...bytes.slice(start,start+size));
 let type,sampleRate,bitDepth,channels,duration;
 if(text(0,4)==='RIFF'&&text(8,4)==='WAVE'){
  type='audio/wav';let format,dataSize,dataOffset;
  for(let offset=12;offset+8<=view.byteLength;){const id=text(offset,4),size=view.getUint32(offset+4,true),start=offset+8;if(id==='fmt '&&size>=16&&start+16<=view.byteLength){format=view.getUint16(start,true);channels=view.getUint16(start+2,true);sampleRate=view.getUint32(start+4,true);bitDepth=view.getUint16(start+14,true);if(format===65534&&size>=40&&start+40<=view.byteLength)format=view.getUint16(start+24,true);}if(id==='data'){dataSize=size;break;}offset=start+size+(size%2);}
  dataOffset=12;while(dataOffset+8<=view.byteLength&&text(dataOffset,4)!=='data'){const size=view.getUint32(dataOffset+4,true);dataOffset+=8+size+(size%2);}
  if(![1,3].includes(format)||format===3&&bitDepth!==32||!dataSize||dataOffset+8+dataSize>file.size)throw Error('Use an uncompressed PCM or 32-bit float WAV master.');duration=dataSize/(sampleRate*channels*bitDepth/8);
 }else if(text(0,4)==='fLaC'&&bytes.length>=42&&(bytes[4]&127)===0&&view.getUint32(4,false)%16777216===34){
  type='audio/flac';const packed=view.getBigUint64(18,false);sampleRate=Number(packed>>44n);channels=Number((packed>>41n)&7n)+1;bitDepth=Number((packed>>36n)&31n)+1;duration=Number(packed&((1n<<36n)-1n))/sampleRate;
 }else throw Error('Choose a valid WAV or FLAC file, not a renamed MP3.');
 if(!rules.sampleRates.includes(sampleRate)||!rules.bitDepths.includes(bitDepth)||![1,2].includes(channels)||!Number.isFinite(duration)||duration<=0)throw Error('Use mono or stereo audio, 16/24/32-bit, at a supported sample rate from 44.1 to 192 kHz.');
 return {name:file.name.slice(0,200),type,bytes:file.size,sampleRate,bitDepth,channels,duration:Math.round(duration*1000)/1000};
}
