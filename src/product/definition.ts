import { validateAuthorization as validate0 } from '../sample-accession/policy'
import { validateAuthorization as validate1 } from '../chain-of-custody/policy'
import { validateAuthorization as validate2 } from '../instrument-calibration/policy'
import { validateAuthorization as validate3 } from '../method-version/policy'
import { validateAuthorization as validate4 } from '../reagent-stock/policy'
import { validateAuthorization as validate5 } from '../quality-control/policy'
import { validateAuthorization as validate6 } from '../result-review/policy'
import { validateAuthorization as validate7 } from '../stability-window/policy'
import type { Entity, Field, Operation, Product } from '../workspace/types'
import { entity, number, requireThat, text } from '../workspace/values'
const roles=["Laboratory Coordinator","Quality Scientist","Instrument Specialist","Laboratory Director"] as const
const textField=(key:string,label:string):Field=>({key,label,type:'text',required:true,initial:'Evidence pending'})
const numberField=(key:string,label:string,initial:number):Field=>({key,label,type:'number',required:true,integer:true,min:0,max:1000000000,initial})
const dateField=(key:string,label:string):Field=>({key,label,type:'date',required:true,initial:'2026-09-14'})
type Validator=(record:{measured:number;limit:number;evidence:string;revision:number})=>unknown
function workflowOperations(kind:string,label:string,validate:Validator):Operation[]{return[
  {key:kind+'-submit',label:'Submit '+label,kind,from:['draft'],roles:[roles[0]],run:({entity})=>{entity.status='review';return label+' submitted for independent review.'}},
  {key:kind+'-authorize',label:'Authorize '+label,kind,from:['review'],roles:[roles[1]],run:({entity})=>{validate({measured:number(entity.fields,'measured'),limit:number(entity.fields,'limit'),evidence:text(entity.fields,'evidence'),revision:entity.revision});entity.status='authorized';return label+' authorized against current evidence and limits.'}},
  {key:kind+'-execute',label:'Execute '+label,kind,from:['authorized'],roles:[roles[2]],run:({entity,now})=>{requireThat(text(entity.fields,'effectiveDate')<=now.slice(0,10),'The effective date has not arrived.');entity.status='active';return label+' executed with operational custody recorded.'}},
  {key:kind+'-block',label:'Block '+label,kind,from:['authorized','active'],roles:[roles[0],roles[2]],fields:[textField('reason','Blocking reason')],run:({entity,input})=>{requireThat(text(input,'reason').trim().length>=8,'A specific blocking reason is required.');entity.status='blocked';return label+' blocked without losing prior evidence.'}},
  {key:kind+'-recover',label:'Recover '+label,kind,from:['blocked'],roles:[roles[1]],fields:[textField('recovery','Recovery evidence')],run:({entity,input})=>{requireThat(text(input,'recovery').trim().length>=8,'Recovery evidence is required.');entity.status='review';return label+' returned to review with recovery evidence.'}},
  {key:kind+'-close',label:'Close '+label,kind,from:['active'],roles:[roles[3]],run:({entity})=>{entity.status='closed';return label+' closed by accountable authority.'}},
]}
const kinds=[{
    key:"sample-accession", label:"Sample accession capacity", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Incoming sample count",6), numberField('limit',"Available accession slots",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"chain-of-custody", label:"Chain of custody sequence", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Completed custody step",4), numberField('limit',"Required custody step",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"instrument-calibration", label:"Instrument calibration validity", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Calibration age (days)",6), numberField('limit',"Maximum calibration age",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"method-version", label:"Analytical method version", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Run method revision",4), numberField('limit',"Approved method revision",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"reagent-stock", label:"Reagent reserve", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Available reagent units",6), numberField('limit',"Minimum reagent units",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"quality-control", label:"Quality control limits", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Control deviation",4), numberField('limit',"Maximum control deviation",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"result-review", label:"Result reviewer qualification", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Reviewer competency score",6), numberField('limit',"Minimum competency score",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"stability-window", label:"Sample stability window", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Analysis hour",4), numberField('limit',"Latest stable hour",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  }]
const operations:Operation[]=[...workflowOperations("sample-accession", "Sample accession capacity", validate0),
...workflowOperations("chain-of-custody", "Chain of custody sequence", validate1),
...workflowOperations("instrument-calibration", "Instrument calibration validity", validate2),
...workflowOperations("method-version", "Analytical method version", validate3),
...workflowOperations("reagent-stock", "Reagent reserve", validate4),
...workflowOperations("quality-control", "Quality control limits", validate5),
...workflowOperations("result-review", "Result reviewer qualification", validate6),
...workflowOperations("stability-window", "Sample stability window", validate7)]
const seed:Entity[]=[entity("sample-accession-001","sample-accession","Sample accession capacity primary record",'review',{owner:"Laboratory Coordinator",measured:4,limit:8,evidence:"EV-LABORBIT-001",effectiveDate:'2026-09-14'}),
entity("sample-accession-002","sample-accession","Sample accession capacity recovery record",'blocked',{owner:"Instrument Specialist",measured:4,limit:8,evidence:"REC-LABORBIT-001",effectiveDate:'2026-09-15'}),
entity("chain-of-custody-001","chain-of-custody","Chain of custody sequence primary record",'review',{owner:"Laboratory Coordinator",measured:8,limit:5,evidence:"EV-LABORBIT-002",effectiveDate:'2026-09-14'}),
entity("chain-of-custody-002","chain-of-custody","Chain of custody sequence recovery record",'blocked',{owner:"Instrument Specialist",measured:8,limit:5,evidence:"REC-LABORBIT-002",effectiveDate:'2026-09-15'}),
entity("instrument-calibration-001","instrument-calibration","Instrument calibration validity primary record",'review',{owner:"Laboratory Coordinator",measured:4,limit:8,evidence:"EV-LABORBIT-003",effectiveDate:'2026-09-14'}),
entity("instrument-calibration-002","instrument-calibration","Instrument calibration validity recovery record",'blocked',{owner:"Instrument Specialist",measured:4,limit:8,evidence:"REC-LABORBIT-003",effectiveDate:'2026-09-15'}),
entity("method-version-001","method-version","Analytical method version primary record",'review',{owner:"Laboratory Coordinator",measured:5,limit:5,evidence:"EV-LABORBIT-004",effectiveDate:'2026-09-14'}),
entity("method-version-002","method-version","Analytical method version recovery record",'blocked',{owner:"Instrument Specialist",measured:5,limit:5,evidence:"REC-LABORBIT-004",effectiveDate:'2026-09-15'}),
entity("reagent-stock-001","reagent-stock","Reagent reserve primary record",'review',{owner:"Laboratory Coordinator",measured:8,limit:5,evidence:"EV-LABORBIT-005",effectiveDate:'2026-09-14'}),
entity("reagent-stock-002","reagent-stock","Reagent reserve recovery record",'blocked',{owner:"Instrument Specialist",measured:8,limit:5,evidence:"REC-LABORBIT-005",effectiveDate:'2026-09-15'}),
entity("quality-control-001","quality-control","Quality control limits primary record",'review',{owner:"Laboratory Coordinator",measured:4,limit:8,evidence:"EV-LABORBIT-006",effectiveDate:'2026-09-14'}),
entity("quality-control-002","quality-control","Quality control limits recovery record",'blocked',{owner:"Instrument Specialist",measured:4,limit:8,evidence:"REC-LABORBIT-006",effectiveDate:'2026-09-15'}),
entity("result-review-001","result-review","Result reviewer qualification primary record",'review',{owner:"Laboratory Coordinator",measured:8,limit:5,evidence:"EV-LABORBIT-007",effectiveDate:'2026-09-14'}),
entity("result-review-002","result-review","Result reviewer qualification recovery record",'blocked',{owner:"Instrument Specialist",measured:8,limit:5,evidence:"REC-LABORBIT-007",effectiveDate:'2026-09-15'}),
entity("stability-window-001","stability-window","Sample stability window primary record",'review',{owner:"Laboratory Coordinator",measured:4,limit:8,evidence:"EV-LABORBIT-008",effectiveDate:'2026-09-14'}),
entity("stability-window-002","stability-window","Sample stability window recovery record",'blocked',{owner:"Instrument Specialist",measured:4,limit:8,evidence:"REC-LABORBIT-008",effectiveDate:'2026-09-15'})]
export const product:Product={name:"LabOrbit",description:"Laboratory sample and instrument operations",accent:"#007A78",actors:roles.map((role,index)=>({id:'actor-'+String(index),name:role,role})),kinds,operations,seed,
 validate:(entities)=>{for(const row of entities){requireThat(kinds.some(kind=>kind.key===row.kind),'Unknown domain record.');requireThat(typeof row.fields['owner']==='string','Every workflow requires accountable ownership.')}},
 metrics:(entities)=>[{label:'Domain records',value:String(entities.length)},{label:'Active controls',value:String(entities.filter(row=>['review','authorized','active','blocked'].includes(row.status)).length)},{label:'Blocked',value:String(entities.filter(row=>row.status==='blocked').length)},{label:'Closed',value:String(entities.filter(row=>row.status==='closed').length)}]}
