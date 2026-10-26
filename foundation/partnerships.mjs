export function validatePartnerships(config) {
  if(config.schemaVersion!==1||!Number.isInteger(config.commercialTermsVersion)||config.commercialTermsVersion<1||config.commercialApproval!=='approved')throw Error('Invalid commercial terms version or approval');
  if(config.items.map(item=>item.id).join(',')!=='silver,gold,platinum')throw Error('Invalid partnership register');
  for(const item of config.items)validateAllocation(item);
  if(typeof config.recordingScope!=='string'||!config.recordingScope||!config.commercialNotice)throw Error('Missing recording scope');
  if(typeof config.publication.percentages!=='boolean'||!['pending','approved'].includes(config.publication.legalAccountingReview))throw Error('Invalid publication review');
  if(config.publication.percentages&&config.publication.legalAccountingReview!=='approved')throw Error('Legal/accounting publication approval required');
  return config;
}
function validateAllocation(value) {
  if(![value.artistShare,value.labelShare].every(n=>Number.isInteger(n)&&n>=0&&n<=100)||value.artistShare+value.labelShare!==100)throw Error('Recording allocation must total 100 percentage points');
}
export function recordingReference(config) {
  validatePartnerships(config);
  const sections=[{id:'recording-terms',title:'Recording partnership terms',paragraphs:[config.commercialNotice]}];
  if(!config.publication.percentages)return [...sections,{id:'recording-publication',title:'Public percentage disclosure',paragraphs:['Default commercial allocations are approved internally. Public percentage disclosure remains pending legal/accounting review. A partnership preference is not acceptance or an agreement.']}];
  return [...sections,...config.items.map(item=>({id:'recording-'+item.id,title:item.name,paragraphs:[`Artist keeps ${item.artistShare}%. Artanrecords share ${item.labelShare}%. These defaults apply to ${config.recordingScope}. The applicable signed agreement governs; a default is not an account balance or payable amount.`]}))];
}
export function agreementAllocation(config,tier,signedAgreement=null) {
  validatePartnerships(config);
  if(signedAgreement!==null){
    if(signedAgreement.status!=='signed'||!signedAgreement.agreementId||!signedAgreement.effectiveDate||!signedAgreement.version)throw Error('Verified signed agreement evidence required');
    validateAllocation(signedAgreement);
    return {...signedAgreement,source:'signed-agreement'};
  }
  const item=config.items.find(item=>item.id===tier);
  if(!item)throw Error('Unknown partnership');
  return {artistShare:item.artistShare,labelShare:item.labelShare,commercialTermsVersion:config.commercialTermsVersion,source:'default-reference'};
}
