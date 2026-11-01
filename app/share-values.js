export function percentageBasisPoints(value){
 const text=String(value??'').trim();
 if(!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(text))throw Error('Enter a percentage from 0 to 100, with up to two decimal places.');
 const [whole,fraction='']=text.split('.'),bps=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(bps>10000)throw Error('A proposed share cannot exceed 100%.');return bps;
}
export function percentageLabel(bps){if(!Number.isInteger(bps)||bps<0||bps>10000)throw Error('Invalid percentage.');return (bps/100).toFixed(2).replace(/\.?0+$/,'')+'%';}
export function shareDates(start,end){
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 if(!valid(start)||end&&!valid(end)||end&&end<start)throw Error('Choose valid effective dates, with the end on or after the start.');
 return {effective_start:start,effective_end:end||null};
}
