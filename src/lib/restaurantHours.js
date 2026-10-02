const DAYS=[
  {key:'0',short:'Sun',label:'Sunday'}, {key:'1',short:'Mon',label:'Monday'},
  {key:'2',short:'Tue',label:'Tuesday'}, {key:'3',short:'Wed',label:'Wednesday'},
  {key:'4',short:'Thu',label:'Thursday'}, {key:'5',short:'Fri',label:'Friday'},
  {key:'6',short:'Sat',label:'Saturday'},
];

export const RESTAURANT_DAYS=DAYS;
export const DEFAULT_WEEKLY_HOURS=Object.fromEntries(DAYS.map(day=>[day.key,{closed:false,open:'09:00',close:'22:00'}]));
export const marketTimezone=(marketCode)=>String(marketCode||'').startsWith('gh-')?'Africa/Accra':'Asia/Manila';

const validTime=(value)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));
const minutes=(value)=>{const [hour,minute]=String(value).split(':').map(Number);return hour*60+minute;};
const clock=(value)=>{if(!validTime(value))return '';const [hour,minute]=value.split(':').map(Number);return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`;};

export function normalizeWeeklyHours(value){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return Object.fromEntries(DAYS.map(day=>{
    const row=source[day.key]||{};
    return [day.key,{closed:row.closed===true||row.closed==='true',open:validTime(row.open)?row.open:'09:00',close:validTime(row.close)?row.close:'22:00'}];
  }));
}

function localParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const get=(type)=>parts.find(part=>part.type===type)?.value;
  return {day:DAYS.findIndex(entry=>entry.short===get('weekday')),minute:Number(get('hour'))*60+Number(get('minute'))};
}

export function restaurantAvailability(restaurant,date=new Date()){
  if(restaurant?.orders_paused===true||restaurant?.orders_paused==='true') return {isOpen:false,paused:true,label:'Orders paused',detail:restaurant.pause_message||'This kitchen is temporarily not accepting orders.'};
  if(!restaurant?.weekly_hours) return {isOpen:true,configured:false,label:'Open now',detail:'Operating hours are not configured yet.'};
  const timeZone=restaurant.timezone||marketTimezone(restaurant.market_code);
  const schedule=normalizeWeeklyHours(restaurant.weekly_hours);
  const local=localParts(date,timeZone); const today=schedule[String(local.day)]; const previous=schedule[String((local.day+6)%7)];
  let isOpen=false; let remaining=null; let closingTime=today.close;
  if(!today.closed){
    const start=minutes(today.open); const end=minutes(today.close);
    if(start===end){isOpen=true;remaining=1440;}
    else if(start<end&&local.minute>=start&&local.minute<end){isOpen=true;remaining=end-local.minute;}
    else if(start>end&&local.minute>=start){isOpen=true;remaining=1440-local.minute+end;}
  }
  if(!isOpen&&!previous.closed&&minutes(previous.open)>minutes(previous.close)&&local.minute<minutes(previous.close)){isOpen=true;remaining=minutes(previous.close)-local.minute;closingTime=previous.close;}
  if(isOpen) return {isOpen:true,configured:true,label:remaining<=60?`Closing soon · ${remaining} min`:'Open now',detail:`Closes at ${clock(closingTime)}`,timeZone};
  for(let offset=0;offset<8;offset+=1){
    const dayIndex=(local.day+offset)%7; const row=schedule[String(dayIndex)];
    if(row.closed) continue;
    const start=minutes(row.open);
    if(offset===0&&start<=local.minute) continue;
    return {isOpen:false,configured:true,label:'Closed',detail:`Opens ${offset===0?'today':offset===1?'tomorrow':DAYS[dayIndex].label} at ${clock(row.open)}`,timeZone};
  }
  return {isOpen:false,configured:true,label:'Closed',detail:'No upcoming opening time is configured.',timeZone};
}
