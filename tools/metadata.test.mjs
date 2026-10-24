import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {artistMetadata,releaseMetadata,googlePhoto,catalogueSelection,releaseSelection} from '../app/metadata-values.js';
const schema=JSON.parse(await readFile(new URL('../content/metadata.json',import.meta.url),'utf8'));
const release=()=>({title:'Test single',type:'Single',tracks:[{title:'Test track',explicit:'Clean',contributors:[{name:'Test writer',role:'Songwriter'}]}]});
test('catalogue fields are allowlisted and private by default',()=>{
  const value=artistMetadata({spotify:'https://open.spotify.com/artist/test',role:'admin',visibility:{spotify:'public',email:'public'}},schema);
  assert.equal(value.role,undefined);assert.equal(value.visibility.email,undefined);assert.equal(value.visibility.spotify,'public');assert.equal(value.visibility.biography,'private');
  const projection=catalogueSelection({artist_name:'Test',email:'private@example.test',phone:'private'},value,schema);assert.deepEqual(projection,{spotify:value.spotify});
});
test('platform links reject impersonation, insecure URLs and embedded credentials',()=>{
  for(const spotify of ['javascript:alert(1)','https://open.spotify.com.evil.test/artist/a','https://user:secret@open.spotify.com/artist/a'])assert.throws(()=>artistMetadata({spotify},schema));
  assert.throws(()=>artistMetadata({years_active_start:'2025',years_active_end:'2024'},schema));
});
test('release and track metadata remain separate and validate identifiers',()=>{
  const value=releaseMetadata(release(),schema);assert.equal(value.tracks[0].number,1);assert.equal(value.visibility.tracks,'private');
  for(const upc of ['12','abcd'])assert.throws(()=>releaseMetadata({...release(),upc},schema));
  assert.throws(()=>releaseMetadata({...release(),tracks:[{title:'Track',isrc:'fake',contributors:[]}]},schema));
  assert.throws(()=>releaseMetadata({...release(),tracks:[{title:'Track',instrumental:true,lyrics:'words',contributors:[]}]},schema));
  assert.throws(()=>releaseMetadata({...release(),tracks:[]},schema));
});
test('public track selection never includes private listening links or contributor names',()=>{
  const value=releaseMetadata({...release(),visibility:{tracks:'public',account_id:'public'},tracks:[{title:'Track',audio_url:'https://example.test/private',contributors:[{name:'Private legal name',role:'Composer'}]}]},schema);
  const result=releaseSelection(value,schema);assert.equal(result.tracks[0].title,'Track');assert.equal(result.tracks[0].audio_url,undefined);assert.equal(result.tracks[0].contributors,undefined);assert.equal(result.account_id,undefined);
});
test('Google avatar fallback only uses authenticated Google provider metadata and an approved image host',()=>{
  assert.equal(googlePhoto({user_metadata:{avatar_url:'https://evil.test/avatar'}}),null);
  assert.equal(googlePhoto({app_metadata:{provider:'google'},user_metadata:{picture:'https://lh3.googleusercontent.com/test'}}),'https://lh3.googleusercontent.com/test');
  assert.equal(googlePhoto({app_metadata:{provider:'google'},user_metadata:{picture:'https://googleusercontent.com.evil.test/test'}}),null);
});
test('track groups cover every field once and preserve catalogue details',()=>{
  const grouped=schema.release.trackGroups.flatMap(group=>group.fields);
  assert.equal(new Set(grouped).size,grouped.length);
  assert.deepEqual([...grouped].sort(),schema.release.trackFields.map(field=>field.name).sort());
  const track={...release().tracks[0],lyrics:'Artist-authored lyrics',credits:'Piano: Display Name',key:'A minor',duration:'4:29',release_date:'2026-10-22',music_sheet_url:'https://example.test/score.pdf',performance_url:'https://example.test/performance'};
  const value=releaseMetadata({...release(),tracks:[track],visibility:{tracks:'public'}},schema);
  assert.equal(value.tracks[0].music_sheet_url,track.music_sheet_url);
  const selected=releaseSelection(value,schema).tracks[0];
  assert.equal(selected.lyrics,track.lyrics);
  assert.equal(selected.credits,track.credits);
  assert.equal(selected.music_sheet_url,undefined);
  assert.equal(selected.performance_url,undefined);
  assert.throws(()=>releaseMetadata({...release(),tracks:[{...track,performance_url:'javascript:alert(1)'}]},schema));
});
test('cover credits and preview positions remain validated private draft metadata',()=>{
 const track={...release().tracks[0],composition_type:'Cover song',original_artist:'Original artist',original_song_title:'Original title',preview_start:'0:45',duration:'3:00'};
 const value=releaseMetadata({...release(),record_label:'Artanrecords',copyright_year:'2026',tracks:[track]},schema);
 assert.equal(value.record_label,'Artanrecords');assert.equal(value.tracks[0].preview_start,'0:45');
 assert.throws(()=>releaseMetadata({...release(),tracks:[{...track,original_artist:''}]},schema));
 assert.throws(()=>releaseMetadata({...release(),tracks:[{...track,preview_start:'3:00'}]},schema));
 assert.throws(()=>releaseMetadata({...release(),tracks:[{...track,clean_version:true,explicit:'Explicit'}]},schema));
});
