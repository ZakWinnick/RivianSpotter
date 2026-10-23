const fs = require('node:fs');
const path = require('node:path');
const {normalize, compare, changeLines, newLocationLines} = require('./location-digest.cjs');
const ROOT = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const localDate = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function snapshot(root = ROOT) {
  const data = name => read(path.join(root, 'data', name + '.json'));
  const roamer = data('roamer');
  return {rows:normalize({locations:data('locations'),charging:data('charging'),roamer}),
    sourceDates:{places:data('refresh-summary').date,charging:data('charging-summary').date,
      chargingDetails:roamer.completedAt?.slice(0,10) || null},
    partialDetails:Boolean(roamer.rateLimited || roamer.detailErrors?.length || roamer.coverage?.notCheckedIds?.length)};
}
function plain(line) {
  return line.replace(/^\s*-\s*/, '').replace(/\*\*([^*]+)\*\*/g,'$1')
    .replace(/\[([^\]]+)\]\(https:\/\/[^)]+\)/g,'$1')
    .replace(/\\([\\`*_\[\]<>])/g,'$1').trim();
}
function publicEntry(event) {
  const kinds = ['added','now-active','changed','relisted','no-longer-listed'];
  if (!kinds.includes(event.kind) || !/^[a-f0-9]{64}$/.test(event.eventId || '')) throw Error('Invalid change event');
  const url = new URL(event.url);
  if (url.origin !== 'https://rivianspotter.com' || !/^\/locations\/[a-z0-9-]+\/$/.test(url.pathname)) throw Error('Invalid location update URL');
  const changes = (event.changes || []).filter(change => !['Map pin','Pin precision'].includes(change.field));
  if (event.kind === 'changed' && !changes.length) return null;
  const details = event.details || {};
  const lines = [];
  if (['added','relisted'].includes(event.kind)) lines.push(...newLocationLines(event));
  if (event.kind === 'now-active') lines.push(event.changes?.some(c=>c.field==='Location status'&&c.after==='open')
    ? 'Previously marked coming soon; the location is now listed as open.'
    : 'Previously marked coming soon; now on Rivian’s charging map with station details. Rivian doesn’t publish whether a charging site is open.');
  if (event.kind === 'no-longer-listed') lines.push('This location is no longer listed. That does not necessarily mean it has closed.');
  for (const change of changes) lines.push(...changeLines(change));
  const comingSoon = details['Location status'] === 'planned' || event.changes?.some(c=>c.field==='Location status'&&c.after==='planned');
  // Explicit allowlist: never publish the private email report, delivery state or source snapshots.
  return {id:event.eventId,locationId:String(event.id),name:String(event.name),type:String(event.type),
    city:event.city || '',region:event.state || '',url:url.pathname,kind:comingSoon?'coming-soon':event.kind,
    lines:[...new Set(lines.map(plain).filter(Boolean))],chargerReport:Boolean(event.changes?.some(c=>c.field==='Reported charger condition'))};
}
function append(feed, events, {date,sourceDates,partialDetails = false}) {
  if (feed.schemaVersion !== 1 || !Array.isArray(feed.days) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Invalid location feed');
  const next = structuredClone(feed);
  if (next.latestCheck?.date > date) throw Error('Cannot move the feed backward');
  next.latestCheck = {date,sourceDates,partialDetails};
  let day = next.days.find(day=>day.date===date);
  const entries = events.map(publicEntry).filter(Boolean).filter(e=>!day?.entries.some(old=>old.id===e.id));
  if (entries.length) {
    if (!day) {day={date,entries:[]};next.days.push(day);}
    day.entries.push(...entries);
    day.entries.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  }
  next.days.sort((a,b)=>b.date.localeCompare(a.date));
  return next;
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);
}
function main() {
  const [command,beforeFile] = process.argv.slice(2);
  if (!beforeFile) throw Error('Usage: update-location-feed.cjs snapshot|record SNAPSHOT_FILE');
  if (command==='snapshot') {write(beforeFile,snapshot());return;}
  if (command!=='record') throw Error('Unknown feed command');
  const before=read(beforeFile),after=snapshot(),file=path.join(ROOT,'data/location-updates.json');
  const events=compare(before.rows,after.rows);
  write(file,append(read(file),events,{date:localDate(),sourceDates:after.sourceDates,partialDetails:after.partialDetails}));
  console.log(`Checked ${events.map(publicEntry).filter(Boolean).length} public location changes; pin changes excluded.`);
}
module.exports={snapshot,publicEntry,append,plain};
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
