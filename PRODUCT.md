# Product

## Register
product

## Users
Rivian owners, prospective owners, and travelers looking for a showroom, demo drive, service location, or charging outpost in North America. People browse at home and use their phones outdoors when deciding where to visit.

## Purpose
Help visitors find the right Rivian place, understand its capabilities and current information, and reach the official booking page or get accurate directions. Independent community-maintained utility; never imply official affiliation.

## Confirmed direction
The user approved the full October 14, 2026 audit recommendations with “Do all of it,” including the map-first rebuild inspired by the approved Code to Adventure design. They also directed a full location refresh using https://rivian.com/spaces/locations. Public availability was intentionally disabled and is now restored; a direct HTTP check returned 200.

## Native field guide and visits (October 20, 2026)

The user wants RivianSpotter to combine the independent reporting and historical attention of ifoAppleStore with the personal field-guide experience of Facades. The website is the public catalog and editorial record; the iOS companion lets people explore and check in to RANs, Waypoints, Spaces, Service Centers, Demo Centers, and Outposts.

The approved first implementation is a private visit journal: repeat and past visits, optional notes, a separate Want to Visit list, and personal visit counts. Check-ins are self-reported and do not imply live availability or an opening-status update. Public sharing is deliberate. The initial app lives under `ios/`, reuses canonical location identities, and does not require an account. See `ios/README.md` for implementation and verification limits.

## Personality and principles
Quiet, useful, welcoming. Search and places come before secondary controls. Keep map and list selection synchronized. Treat Rivian’s published information as authoritative. Keep internal verification flags and source-conflict notes out of public views. One authoritative inventory produces every public view. Treat mobile as a primary workflow. Keep saved places private on the device. Correct errors without losing context.

## Anti-references
Avoid a giant promotional hero before the finder, endless pill stacks, ornamental dashboards, speculative destination photography, fabricated freshness, and controls that do not work. Do not copy Rivian's proprietary typeface or imply endorsement.

## Accessibility
Keyboard-operable location selection, visible focus, WCAG AA color contrast, zoom support, reduced motion, semantic pages, and usable touch targets. The result list must remain useful if the map cannot load.

Closing a mapped location zooms out to a regional view centered on that location. Initial page loads and Full Overview retain the full map; mobile closes preserve the originating List or Map view. Official location links must identify that location; shared service-center links must be labeled as shared directories.
