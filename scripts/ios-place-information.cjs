const { parseRate, hasReportedIssue } = require('../js/components.js');
const { locationTypes } = require('../js/location-model.js');
const day = value => value ? String(value).slice(0, 10) : 'Date unavailable';
const fact = (title, value) => value == null || value === '' ? null : { title, value: String(value) };
const section = (title, facts, expandable = false, sourceURL = null) => ({title, facts: facts.filter(Boolean), expandable, sourceURL});
function chargingInformation(p) {
  const title = p.type === 'RAN' ? 'Rivian Adventure Network' : 'Waypoints';
  if (p.status === 'planned') return [section(title, [fact('Coming soon', 'This is a planned location, not an available charging stop. An opening date and station details have not been published. The map position is approximate until an exact address is available.')])];
  const r = p.roamer;
  const detailsCurrent = r && (!r.observedAt || Date.parse(r.detailsObservedAt) >= Date.parse(r.observedAt));
  const useDetailStatus = r?.detailReportedStatus && (detailsCurrent || !r.reportedStatus);
  const status = useDetailStatus ? r.detailReportedStatus : r?.reportedStatus;
  const facts = [fact('Chargers', p.chargerCount ?? 'Not published'), fact('Maximum rated power', p.maxKw ? `${p.maxKw} kW` : 'Not published'),
    fact('Vehicle access', p.rivianOnly === true ? 'Rivian vehicles only' : p.rivianOnly === false ? 'Open to other EVs; check connector compatibility and host access rules.' : 'Not published'),
    fact('Published reliability grade', p.reliabilityGrade || r?.reliabilityGrade),
    fact('Connectors', r?.connectorSummary || 'Not published'), fact('Charging hours', r?.hours || p.chargingHours || p.hours || 'Not published')];
  if (status) facts.push(fact(hasReportedIssue(status) ? 'Reported charger issue' : 'Reported status', `${status} · snapshot ${day(useDetailStatus ? r.detailsObservedAt : r.observedAt)}. Not live availability.`));
  if (r?.chargerCount != null && r.chargerCount !== p.chargerCount) facts.push(fact('Charger count in community snapshot', `${r.chargerCount} reported on ${day(r.observedAt)}; Rivian lists ${p.chargerCount ?? 'an unpublished number'}. Sources differ.`));
  if (r?.averagePeakKw || r?.averageKw) facts.push(fact('Average peak power', `${r.averagePeakKw || r.averageKw} kW · reported charging performance, separate from maximum rated power.`));
  if (r?.observedAt) facts.push(fact('Charging snapshot', day(r.observedAt)));
  const sections = [section(title, facts, false, r?.sourceUrl || null)];
  if (r) {
    const price = (detail, network) => detailsCurrent ? detail || network : network || detail;
    const priceRows = (detailsCurrent || !(r.rates?.Rivian || r.rates?.['Other EVs'])) && r.detailRates?.Energy && !r.detailRates?.Rivian && !r.detailRates?.Other
      ? [['Energy', r.detailRates.Energy]]
      : [['Rivian', price(r.detailRates?.Rivian, r.rates?.Rivian)], ['Other EVs', price(r.detailRates?.Other, r.rates?.['Other EVs'])]];
    const schedules = [];
    const prices = priceRows.map(([label, value]) => {
      const parsed = parseRate(value);
      if (parsed.periods.length || parsed.note) schedules.push(fact(label, parsed.note || parsed.periods.map(t => `${t.days} · ${t.start}–${t.end} · ${t.rate}/kWh`).join('\n')));
      return fact(label, parsed.summary ? `${parsed.summary}/kWh` : 'Not published');
    });
    prices.push(fact('Idle fee', r.detailRates?.Idle || 'Not published'), fact('Rate information', 'Prices may vary by time or vehicle. Confirm the rate before charging.'));
    sections.push(section(`${title} pricing`, prices));
    if (schedules.length) sections.push(section('Time-of-use rates', [fact('Schedule', 'Times are local to the charging site.'), ...schedules], true));
    sections.push(section('Site features', [fact('Amenities', r.amenities?.length ? r.amenities.join(' · ') : 'None listed'), fact('Details captured', day(r.detailsObservedAt))]));
    sections.push(section('Individual chargers', r.chargers?.length ? r.chargers.map(c => fact(c.name, [c.connector, c.powerKw ? `${c.powerKw} kW` : 'Power not published', ...(c.features || []).map(f => f.description || f.label)].filter(Boolean).join(' · '))) : [fact('Ports', 'Individual charger details are not published.')], true));
  } else if (p.type === 'RAN') {
    sections.push(section('Pricing and site features', [fact('Details', 'Pricing, idle fees, amenities, and individual charger details are not available in this catalog snapshot.') ]));
  }
  return sections;
}
function informationFor(p) {
  const charging = locationTypes(p).some(t => ['RAN', 'Waypoint'].includes(t));
  const sections = charging ? (p.chargingNetworks || [p]).flatMap(chargingInformation) : [section('Plan your visit', [
    fact('At this location', p.services?.join(' · ')), fact('Charging hours', p.chargingHours), fact('Local time zone', p.timezone?.replaceAll('_', ' ')),
    fact('Phone', p.phone), fact('Charging support', p.chargingPhone), fact('Service status', p.serviceStatus === 'planned' ? 'Service coming soon. Visiting and demo-drive hours remain separate.' : null)
  ])];
  const notes = [...new Set([...(p.notes || []), ...(p.publishedHoursExceptions || []), ...(p.hoursExceptions || []).map(v => typeof v === 'string' ? v : v.note || v.raw || v.text || `${v.date}: ${v.closed ? 'Closed' : v.hours || 'Special hours'}`)])];
  if (notes.length) sections.push(section('Know before you go', notes.map((n,i) => fact(notes.length === 1 ? 'Published note' : `Note ${i+1}`, n))));
  if (p.listed === false) sections.push(section('Listing status', [fact('No longer listed', 'This location is no longer listed in the current source. Retained for your saved places and visit history.')]));
  return sections.filter(s => s.facts.length);
}
module.exports = { informationFor, chargingInformation };
