export const DEFAULT_DELIVERY_SETTINGS = {
  market_code:'ph-ncr', base_distance_km:2.2, base_fare:38, additional_per_km:6, max_internal_distance_km:7.2,
  peak_surcharge:25, lunch_peak_start:'11:00', lunch_peak_end:'13:30', dinner_peak_start:'17:00', dinner_peak_end:'20:30',
  storm_surcharge:30, storm_active:false, timezone:'Asia/Manila', active:true,
};

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const minutes = (value) => { const [hour,minute]=String(value||'').split(':').map(Number); return hour*60+minute; };

export function normalizeDeliverySettings(row = {}) {
  return {
    ...DEFAULT_DELIVERY_SETTINGS,
    ...row,
    base_distance_km:number(row.base_distance_km,DEFAULT_DELIVERY_SETTINGS.base_distance_km),
    base_fare:number(row.base_fare,DEFAULT_DELIVERY_SETTINGS.base_fare),
    additional_per_km:number(row.additional_per_km,DEFAULT_DELIVERY_SETTINGS.additional_per_km),
    max_internal_distance_km:number(row.max_internal_distance_km,DEFAULT_DELIVERY_SETTINGS.max_internal_distance_km),
    peak_surcharge:number(row.peak_surcharge,DEFAULT_DELIVERY_SETTINGS.peak_surcharge),
    storm_surcharge:number(row.storm_surcharge,DEFAULT_DELIVERY_SETTINGS.storm_surcharge),
    storm_active:row.storm_active===true||row.storm_active==='true',
    active:row.active!==false&&row.active!=='false',
  };
}

export function isPeakTime(date = new Date(), settings = DEFAULT_DELIVERY_SETTINGS) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:settings.timezone||'Asia/Manila',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const current=Number(parts.find(part=>part.type==='hour')?.value)*60+Number(parts.find(part=>part.type==='minute')?.value);
  return (current>=minutes(settings.lunch_peak_start)&&current<minutes(settings.lunch_peak_end))||(current>=minutes(settings.dinner_peak_start)&&current<minutes(settings.dinner_peak_end));
}

export function calculateDeliveryQuote({marketCode,fulfillmentType='doorstep',distanceKm,date=new Date(),settings={}}) {
  const config=normalizeDeliverySettings(settings);
  const distance=distanceKm===null||distanceKm===undefined?null:Number(distanceKm);
  if(fulfillmentType==='pickup') return {delivery_fee:0,provider:'pickup',distance_km:distance,base_fare:0,distance_charge:0,peak_surcharge:0,storm_surcharge:0,peak_active:false,out_of_bounds:false};
  if(marketCode!=='ph-ncr'||!config.active) return {delivery_fee:0,provider:'internal',distance_km:distance,base_fare:0,distance_charge:0,peak_surcharge:0,storm_surcharge:0,peak_active:false,out_of_bounds:false};
  if(!Number.isFinite(distance)) return {delivery_fee:null,provider:'internal',distance_km:null,error:'Delivery distance is unavailable.',out_of_bounds:false};
  if(distance>config.max_internal_distance_km) return {delivery_fee:0,provider:'lalamove',distance_km:Number(distance.toFixed(2)),base_fare:0,distance_charge:0,peak_surcharge:0,storm_surcharge:0,peak_active:false,out_of_bounds:true};
  const extraBlocks=distance<=config.base_distance_km?0:Math.max(1,Math.ceil(distance)-Math.floor(config.base_distance_km));
  const distanceCharge=extraBlocks*config.additional_per_km;
  const peakActive=isPeakTime(date,config);
  const peak=peakActive?config.peak_surcharge:0;
  const storm=config.storm_active?config.storm_surcharge:0;
  return {delivery_fee:Number((config.base_fare+distanceCharge+peak+storm).toFixed(2)),provider:'internal',distance_km:Number(distance.toFixed(2)),base_fare:config.base_fare,distance_charge:distanceCharge,peak_surcharge:peak,storm_surcharge:storm,peak_active:peakActive,out_of_bounds:false};
}
