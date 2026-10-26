import config from '../content/graphics.json' with {type:'json'};
export function colourAssignments(rows){
 const output={icons:null,header_fade:null,header_ribbon:null,logo:null};
 if(rows.length>config.maxColors)throw Error('Choose no more than five colours.');
 rows.forEach((row,index)=>{
  const option=config.assignments.find(option=>option.id===row.assignment);if(!option)throw Error('Choose a valid colour assignment.');
  for(const target of option.targets){if(output[target]!==null)throw Error('Assign each surface to only one colour.');output[target]=index;}
 });
 return output;
}
export function assignmentUnavailable(rows,index,id){
 const option=config.assignments.find(option=>option.id===id);
 return Boolean(option?.targets.some(target=>rows.some((row,other)=>other!==index&&config.assignments.find(item=>item.id===row.assignment)?.targets.includes(target))));
}
export function assignmentSelection(assignments,index){
 const values=assignments??{icons:0,header_fade:1,header_ribbon:1};
 const targets=Object.keys(values).filter(key=>values[key]===index);
 return config.assignments.find(option=>option.targets.length===targets.length&&option.targets.every(target=>targets.includes(target)))?.id||'';
}
