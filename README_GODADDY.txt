KUSA FlightOps v2.9 — CACHE RESET + V-SPEED RUNTIME FIX

ROOT CAUSES FIXED
1. Old PWA service worker ("kusa-flightops-v2") could keep serving older FlightOps code after a GoDaddy update.
2. Express static assets were cached for 1 hour.
3. Partial takeoff speed data could throw a browser runtime error when VR existed but V1/BFL did not.

v2.9 CHANGES
- Removes/unregisters all old FlightOps service workers and browser Cache Storage.
- Server sends no-store/no-cache during development.
- Mission/weather requests use cache:no-store and timestamp cache-busting.
- Visible "FlightOps v2.9" badge at lower-right confirms the browser is actually using this build.
- VR=V2 displays independently when weight data is valid.
- VREF displays independently when landing weight data is valid.
- V1/BFL display only when PA + temperature + weight support a published table lookup.
- Decoded METAR and TAF are explicitly presented inside Section 3.
- Raw METAR/TAF remain expandable below decoded weather.

DEVELOPMENT / NOT FOR FLIGHT USE.


v3.0 CHANGES
- Section 2 cabin map redrawn closer to the uploaded Falcon 50 floor plan.
- Seat 9 moved aft on the left side instead of stacking directly under Seat 5.
- Seats 6/7/8 grouped as the aft lounge/divan block on the right side.
- Lav and airstair zones moved to the aft-right area and kept visible inside the frame.
- V-Speed Card labels updated to match the FlightSafety convention:
  VR -> VR=V2
  VFT -> Vfr
  VFS -> 1.5Vs
- Existing automatic data logic for V1, VR=V2, and VREF is unchanged.
- Vfr and 1.5Vs remain source-locked until their exact approved source values are identified.


v3.2 CHANGES
- Section 2 cabin label updated: CLOSET -> GALLEY
- Added JUMP SEAT as a visual cabin station near the forward entry/cabinet area
- Jump seat is currently visual only and does not change 9-passenger seat-count logic
- V-speed labels and logic unchanged from v3.1


v3.3 CHANGES
- Added optional Alternate field immediately after Destination in Section 1.
- Alternate does not affect W&B, runways, performance, fuel, or mission calculations.
- If an Alternate is entered, Section 3 displays decoded Alternate METAR and decoded Alternate TAF.
- Raw Alternate METAR/TAF remain expandable for reference.
- Alternate weather uses the existing AviationWeather.gov backend.


v3.4 CHANGES
- Section 1 route line is now Origin / Destination / Alternate.
- Fuel on Board moved down beside Mission Fuel Required.
- Taxi Fuel and a new Emer. Return Fuel Burn input are grouped with the fuel fields.
- V-speed card now auto-calculates Vfr and 1.5Vs from FlightSafety P-2–P-5 weight tables.
- VREF / Emer. Return now uses S+48 VREF at immediate-return weight:
  Takeoff Weight - entered Emer. Return Fuel Burn.
- Taxi fuel is already subtracted before Takeoff Weight.
- Emergency return fuel burn defaults to 0 lb; no unstated burn assumption is made.
- Card warns when calculated emergency-return weight exceeds max landing weight.
- No extrapolation.


v3.6 CHANGES
- Section 2 updated:
  - Entry door moved to opposite side
  - Galley moved opposite the entry door
  - Cabinet corrected to CLOSET and moved aft of the entry door
  - Jump seat moved aft of the RH flight deck seat
  - Seat 7 moved to the former Seat 8 position
  - Seat 8 moved aft to sit across from Seat 9
- Mission load now auto-selects the first available departure and destination runway when runway data exists.
- Mission status now shows runway counts and warns when no runway data is found in the local runway database.


v3.7 CHANGES
- Added Baggage Compartment I / II / III into the Section 2 cabin illustration.
- Each baggage compartment now has its own editable weight field using station limits:
  - Bag I max 681 lb
  - Bag II max 762 lb
  - Bag III max 762 lb
- Total Baggage now syncs with compartment loading.
- Editing Total Baggage auto-distributes across Bag I, II and III.
- Editing any compartment updates Total Baggage and the W&B calculation automatically.


v3.8 CHANGES
- CG chart updated from single-point display to a takeoff-to-landing trace.
- Chart now shows:
  - Takeoff CG point
  - Fuel-burn line
  - Landing CG point
  - Zero-fuel CG reference point
- Added CG detail boxes under the chart for:
  - Takeoff CG
  - Landing CG
  - Zero-Fuel CG
  - Trace status
- Current trace uses a temporary neutral fuel-arm model (0.00 in) until approved variable fuel-moment data is validated.


v3.9 CHANGES
- Replaced temporary neutral fuel-arm CG model with Falcon 50 DTM912 Revision 13 Section 2 fuel moment schedule.
- Fuel moment points entered exactly from the published loading table:
  0 through 15,514 lb, with 500 lb increments where published.
- Linear interpolation is used only between adjacent published fuel-weight points; no extrapolation.
- CG envelope now plots the full nonlinear takeoff-to-landing CG path as fuel burns.
- Takeoff CG, every intermediate burn-path point, and landing CG are checked against the CG envelope.
- Development / not for flight use until aircraft applicability and software validation are completed.


v4.0 CHANGES
- Replaced remaining ESTIMATED trace wording with DTM912 fuel-moment wording in the UI.
- Added takeoff configuration auto-refresh note and explicit auto-updated / partial-data status.
- Section 6 now refreshes when switching between Slats + Flaps 20° and Slats Only.
- Added clearer explanation when selected configuration is outside the digitized FlightSafety V1/BFL coverage.
- V-speed source labels now show the selected takeoff configuration.
- Note added that 1.5Vs may remain unchanged between S+20 and Slats Only because the published weight-based value is the same.


v4.1 CHANGES
- Landing section now auto-refreshes VREF, landing field length, max allowable landing weight, limiting factor, weight margin, runway margin, and status.
- Generic INCOMPLETE landing status replaced with TABLE DATA • CLIMB LIMIT NOT EVALUATED when only the landing-climb limit is missing.
- Added landing data summary and configuration note.
- Restored working Evaluate Takeoff function and clearer takeoff incomplete-status wording.
- System Status continues to show DTM912 REV 13 LOADED / Falcon chart interpolation ACTIVE.


v4.2 CHANGES
- Section 6 status language revised: removed generic INCOMPLETE / NOT EVALUATED wording for valid table calculations.
- Takeoff now reports TABLE DATA READY when published table values are available.
- Takeoff operational items not yet supplied are listed as pending (climb limit, field limit, obstacle analysis).
- Slats Only selector now explicitly identifies that digitized V1/BFL coverage begins at 4,000 ft pressure altitude; no extrapolation below source range.
- VR=V2, Vfr and 1.5Vs still refresh by takeoff weight when available.
- Landing now reports TABLE DATA READY • CLIMB LIMIT PENDING when VREF/LFL are valid but landing climb limit is not entered.
- Obstacle selector wording changed to Pending / not checked, Verified clear, Not cleared.


v4.3 CHANGES
- Added pilot-selectable DRY / WET runway condition in Section 6 for takeoff and landing.
- METAR precipitation triggers a VERIFY DRY/WET warning but never changes runway condition automatically.
- DRY takeoff continues to use digitized FlightSafety working tables.
- WET takeoff identifies DTM813 source sections 5.46A (S+20) and 5.51A (Slats).
- Wet-specific BFL and V1 are deliberately source-locked until wet curves are fully digitized and aircraft applicability is validated; dry BFL/V1 are not reused as wet values.
- Weight-based VR=V2, Vfr and 1.5Vs remain displayed in WET mode.
- Landing condition selector added; wet landing factor/method is not silently assumed.


v4.4 CHANGES
- Added dedicated TOLD tab with cockpit-style takeoff and landing quick-reference card.
- TOLD card mirrors active FlightOps values; no duplicate independent calculation set.
- Added structural MTOW 40,780 lb horizontal reference line to CG envelope.
- Added planned landing-fuel safety gate at 3,000 lb.
- If planned landing fuel is below 3,000 lb, pilot confirmation is required and fuel status flags the condition until confirmed.
- Low-fuel confirmation automatically resets when FOB or mission fuel is changed.
- TOLD includes runway/condition, winds, OAT/PA, weights, CG, configuration, V-speeds, BFL/LFL, limits, margins and status.
- Print button produces a TOLD-focused print view.
- Source-locked/unevaluated values remain visibly unavailable; no extrapolation.


v4.5 CHANGES
- Added KROG Rogers Executive-Carter Field runway 02/20 data.
- Added KHII Lake Havasu City Airport runway 14/32 data.
- Split reciprocal runway ends into individual selectable runway entries so wind components use the selected departure/landing direction.
- Added MANUAL / WHAT-IF performance input mode.
- Manual mode accepts pressure altitude, temperature, test takeoff weight, and runway length without requiring a reporting METAR.
- Manual planning does not alter aircraft W&B; it is a performance test point only.
- Added field-length what-if solvers:
  * maximum test weight at entered temperature
  * maximum temperature at entered test weight
  * BFL and runway margin for the manual point
- Solver is constrained to the digitized dry source tables; no extrapolation.
- Added manual runway fallback for airports absent from the packaged runway database.
- Manual runway fallback accepts runway ID, length, heading, width, and surface for the current session.
- Wet-runway what-if remains source locked until the wet curves are digitized.

v4.5.1 HOTFIX
- Manual / What-If mode no longer depends on missionData being loaded.
- Takeoff evaluation uses manual test weight and manual runway length when Manual mode is selected.
- TOLD displays manual planning PA/temp/weight/runway and explicitly labels CG as unchanged W&B CG.
- Visible Takeoff Weight and Runway Length mirror the manual planning point while in Manual mode.


v4.6 CHANGES
- Passenger type selection moved directly onto each occupied cabin seat.
- New passengers default to Adult Male / 180 lb when passenger count is entered.
- Seat-level choices: Male 180 lb, Female 150 lb, Child 70 lb.
- Removed separate passenger roster/editor below cabin layout.
- Retained one Update Passenger button below cabin layout.
- Removed Continue to Mission Results button; results update continuously.
- Added explicit Fuel on Board verification checkbox in Mission Setup.
- Changing FOB automatically clears verification and requires re-confirmation.
- Mission/W&B readiness is blocked until a positive FOB has been entered and verified.
- TOLD card displays FOB amount and verification status.


v4.6.1 HOTFIX
- Removed redundant Update Passenger button below cabin layout.
- Passenger seat/type edits already recalculate W&B immediately; no apply step remains.
- Confirmed KROG and KHII are included in data/runways.json.
- Added server-side built-in KROG/KHII runway fallback so these airports still resolve if an older runways.json is accidentally left on the server.
- This revision changes public/index.html, server.js, data/runways.json and package.json.


v4.6.2 CHANGES
- Moved FOB VERIFIED confirmation away from the Fuel on Board entry.
- Fuel verification is now positioned beside Load / Refresh Mission as a deliberate post-entry safety check.
- Added a clear FOB NOT VERIFIED / FOB VERIFIED state label.
- Changing Fuel on Board still clears the prior verification and requires a new confirmation.
- public/index.html and package.json changed.


v4.7 CHANGES
- Added nationwide live runway lookup for U.S. airports not found in local runways.json.
- Live runway service is USDOT/BTS Runways_View, derived from FAA NASR and updated on the 28-day cycle.
- Local runways.json remains first lookup for speed and offline fallback.
- Live results are cached in memory for the server session after first lookup.
- Converts each FAA reciprocal runway pair into individual selectable runway ends.
- Computes true runway heading from published runway-end coordinates for METAR wind components.
- Returns runway ID, length, width, surface, condition, treatment, airport name/city/state, effective date and data-source flag where available.
- Manual runway input remains final fallback when nationwide lookup is unavailable.
- Updated server diagnostics to report nationwide NASR live lookup capability.
- Changes: server.js, public/index.html, package.json.


v4.7.1 UI HOTFIX
- Mission Summary now reports whether runway data came from PACKAGED CACHE or FAA NASR LIVE.
- Removed stale LOCAL DB-only wording after nationwide lookup was added.
- Weather status can show NO REPORT without preventing runway retrieval.


v4.8 CHANGES
- Expanded the TOLD tab into a one-page Aircraft Prep / TOLD summary.
- Added aircraft/load summary with route and alternate.
- Added crew weights.
- Added passenger count and Male/Female/Child breakdown.
- Added compact occupied-seat summary (seat:number/type).
- Added baggage total and Compartment I/II/III split.
- Added FOB, FOB verification, taxi fuel, mission fuel, planned landing fuel and landing-fuel gate.
- Added ZFW, ramp weight, TOW, landing weight, takeoff CG and landing CG.
- Added high-level W&B, fuel and runway readiness indicators plus update timestamp.
- Existing Takeoff and Landing TOLD sections remain below the aircraft-prep summary.
- Print view remains a TOLD-focused one-page/compact output where browser page sizing permits.
- Fixed stale fobVerifyBox JavaScript reference left after moving the FOB verification control.
