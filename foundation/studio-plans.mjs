export function validateStudioPlans(config){
 if(config.schemaVersion!==2||!Number.isInteger(config.pricingVersion)||config.pricingVersion<1||!/^\d{4}-\d{2}-\d{2}$/.test(config.effectiveDate)||config.publicationStatus!=='approved'||config.currency!=='EUR'||!config.termsApproved||config.renewalConsentRequired!==true)throw Error('Invalid approved Studio pricing');
 if(config.items.map(item=>item.plan).join(',')!=='STUDIO,STUDIO_PRO')throw Error('Unknown plan enumeration');
 for(const plan of config.items)for(const field of ['monthlyPrice','annualPrice'])if(!Number.isSafeInteger(plan[field])||plan[field]<=0)throw Error('Plan prices must be positive integer minor units');
 if(JSON.stringify(config.partnershipInclusion)!==JSON.stringify({silver:'STUDIO',gold:'STUDIO_PRO',platinum:'STUDIO_PRO'}))throw Error('Invalid partnership inclusion');
 if(config.checkoutEnabled)throw Error('Subscription checkout requires a separately verified billing implementation');
 return config;
}
export function formatPlanPrice(minor,currency='EUR'){
 return new Intl.NumberFormat('en',{style:'currency',currency,minimumFractionDigits:minor%100?2:0,maximumFractionDigits:2}).format(minor/100);
}
export function studioComparison(config){
 validateStudioPlans(config);
 return {...config,comparison:{...config.comparison,rows:config.comparison.rows.map(row=>row.billingInterval?{...row,values:config.items.map(plan=>formatPlanPrice(plan[row.billingInterval==='MONTHLY'?'monthlyPrice':'annualPrice'],config.currency)+' / '+(row.billingInterval==='MONTHLY'?'month':'year'))}:row)}};
}
export function studioPricingSections(config){
 validateStudioPlans(config);
 return [...config.items.map(plan=>({id:plan.id,title:plan.name,paragraphs:[`${formatPlanPrice(plan.monthlyPrice,config.currency)}/month or ${formatPlanPrice(plan.annualPrice,config.currency)}/year.`,plan.description]})),config.includedAccess];
}
// Evaluate server-owned evidence only; this helper does not grant or persist access.
export function resolveStudioEntitlement(config,evidence,now=Date.now()){
 validateStudioPlans(config);
 if(!evidence||!config.entitlementSources.includes(evidence.entitlement_source)||evidence.status!=='active'||!Number.isFinite(Date.parse(evidence.entitlement_start))||Date.parse(evidence.entitlement_start)>now||!Number.isFinite(Date.parse(evidence.entitlement_end))||Date.parse(evidence.entitlement_end)<=now)return null;
 let plan=evidence.plan;
 if(evidence.entitlement_source==='PARTNERSHIP_INCLUDED'){
  if(!evidence.partnership_id||!evidence.agreement_id||evidence.agreement_status!=='signed')return null;
  plan=config.partnershipInclusion[evidence.partnership];
 }
 const definition=config.items.find(item=>item.plan===plan);if(!definition)return null;
 return {...evidence,plan,plan_version:evidence.plan_version??config.pricingVersion,currency:config.currency,list_prices:{MONTHLY:definition.monthlyPrice,ANNUAL:definition.annualPrice},amount_charged_minor:evidence.entitlement_source==='PARTNERSHIP_INCLUDED'?0:null,separateChargeAllowed:evidence.entitlement_source!=='PARTNERSHIP_INCLUDED'};
}
