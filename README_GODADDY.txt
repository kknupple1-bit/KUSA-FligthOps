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
- Landing now reports TABLE DATA READY • CLIMB DATA SOURCE REV B when VREF/LFL are valid but landing climb limit is not entered.
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


v4.8.1 HOTFIX
- Added npm "dev" script: node server.js.
- Kept npm "start" script: node server.js.
- Fixes GoDaddy/Airo preview startup error: Missing script: "dev".
- No performance, W&B, runway, weather, or TOLD logic changed from v4.8.


v4.9 CHANGES
- Reworked Section 6 WHAT-IF mode so hypothetical OAT and aircraft weight are edited directly inside the takeoff performance section.
- Added hypothetical pressure altitude and runway length inputs in the same block.
- Added immediate hypothetical outputs: BFL, V1, VR=V2, Vfr, 1.5Vs, runway margin, max weight at entered OAT, and max OAT at entered weight.
- Added explicit GO / NO-GO / NOT FULLY EVALUATED gate.
- NO-GO occurs for structural MTOW exceedance, field-length exceedance, or known climb-limit exceedance.
- NOT FULLY EVALUATED occurs when source-table coverage is unavailable or climb/brake/obstacle limits are still pending/not checked.
- WHAT-IF mode never changes actual aircraft W&B loading.
- No extrapolation outside digitized source tables.
- Wet WHAT-IF remains source locked pending aircraft-specific wet-data validation.


v5.0 PLATFORM REVISION
- Replaced automatic/default KBPT -> KDAL opening behavior with a dedicated New Trip home workflow.
- Added New Trip / Mission / TOLD / Archive top navigation.
- New Trip requires departure and destination ICAO entry before starting the mission.
- Added aircraft selector architecture; N33AP Falcon 50-4 remains the only active aircraft dataset.
- Added disabled future-aircraft placeholders: Falcon 900B, Citation CJ3, Challenger 300/301.
- Added Complete Mission workflow.
- Added Archive tab containing completed missions only.
- Archive is stored locally in the beta tester's browser via localStorage; no server-side user account sync yet.
- Added mission sharing from TOLD using Web Share API where supported (iPhone/iPad share sheet can expose Messages/Mail).
- Added Email action using mailto fallback.
- Added completed-mission sharing/email from Archive.
- Added completed mission summary containing route, runway, weights/CG, FOB verification, takeoff speeds/BFL/status, landing data, and landing-fuel gate.
- Preserves nationwide runway lookup, FOB verification, landing fuel gate, TOLD, Section 6 What-If, and v4.8.1 GoDaddy npm dev/start compatibility.
- DEVELOPMENT / VALIDATION ONLY — NOT APPROVED FOR FLIGHT USE.


v5.0.1 SECTION 6 WHAT-IF HOTFIX
- Removed legacy hidden duplicate manual performance controls that caused duplicate DOM IDs.
- Added deliberate PROCESS WHAT-IF button in Section 6.
- WHAT-IF results no longer silently reprocess while values are being edited.
- Any change to OAT, test weight, pressure altitude, runway length, takeoff configuration or runway condition marks the hypothetical result INPUTS CHANGED / PROCESS REQUIRED.
- PROCESS WHAT-IF validates the four required hypothetical inputs, then calculates BFL, V1, VR=V2, Vfr/1.5Vs, runway margin, max weight at entered OAT, max OAT at entered weight, structural check and the current GO/NO-GO/NOT FULLY EVALUATED gate.
- WHAT-IF remains isolated from actual W&B loading.
- No extrapolation outside digitized performance source ranges.


v5.0.2 NEW TRIP FUEL WORKFLOW
- Added Fuel on Board (FOB) entry to the New Trip page.
- Added Mission Required Fuel entry to the New Trip page.
- Starting a New Trip now carries both values into the live Mission fuel section.
- FOB must be greater than zero before a New Trip can start.
- Mission Required Fuel is required; if it exceeds FOB, the user receives an explicit confirmation warning.
- FOB verification remains a separate deliberate safety check in Mission Setup and is never assumed from entry.
- Mission FOB label now clearly identifies the value as coming from New Trip.
- Fuel verification control is visually emphasized as a separate safety check.


v5.1 CONSOLIDATED BETA BASELINE
- Carries forward v5.0 platform workflow, v5.0.1 Section 6 PROCESS WHAT-IF hotfix, and v5.0.2 New Trip fuel plan.
- Added explicit RETURN TO LIVE control in Section 6.
- LIVE mode is clearly labeled LIVE / ACTUAL MISSION and restores actual W&B weight, selected runway and mission weather.
- WHAT-IF remains hypothetical only and never changes actual W&B loading.
- Clarified source-lock behavior: interpolation only when required surrounding published/digitized points exist; never extrapolate.
- Replaced abbreviated email/share mission body with comprehensive Aircraft Prep / TOLD text:
  crew, passengers, seat assignments, baggage, FOB/verification, taxi/mission/landing fuel, ZFW/ramp/TOW/LDW, CG, departure runway/wind/OAT/PA/configuration, V1/VR=V2/Vfr/1.5Vs/emergency VREF, BFL/max TOW/runway margin/status, landing runway/wind/PA/configuration/VREF/LFL/max landing weight/runway margin/status, safety/source status.
- Email subject now identifies TOLD, route, and N33AP.
- Archive email uses the same comprehensive stored TOLD summary.
- Renamed Complete Mission actions to Complete & Archive Mission.
- Added archive instructions explaining that only completed missions appear and beta archive is local to the browser/device.
- Explicit archive render after save.


v5.1.1
- Emergency Return Fuel Burn default changed to 500 lb.
- Field remains user-editable.
- No other W&B, performance, runway, TOLD, archive, or mission workflow logic changed.


v5.2 DESTINATION RUNWAY / NOTAM + TOLD TIMESTAMP
- Added Destination Runway / NOTAM Assessment.
- Weather and NOTAMs are handled as separate sources.
- Added published runway length vs usable runway length.
- Landing Field Length Required is compared against usable runway length.
- CLOSED selected runway -> NO-GO.
- LFL greater than usable runway -> NO-GO.
- If live NOTAM API is not configured, app explicitly requires manual NOTAM verification.
- Added manual usable-length/status/note override as a beta fallback.
- Added /api/notams endpoint using NOTAM_API_URL and NOTAM_API_KEY environment variables.
- Added NOTAM and runway availability information to TOLD and comprehensive email.
- Added generated date/time stamp to TOLD card.
- Carries forward v5.1.1 500-lb emergency return fuel default.


v5.3 INTERNAL BETA CLEANUP
- New Trip Fuel Plan wording cleaned for mobile/iPad:
  * Fuel on Board (FOB) lb -> placeholder "Enter FOB"
  * Mission Required Fuel lb -> placeholder "Enter Fuel"
- Fuel Plan inputs sized for narrower screens.
- Added persistent INTERNAL BETA / NOT APPROVED FOR FLIGHT USE banner.
- TOLD overall status now explicitly calls out NOTAM verification and unimplemented obstacle analysis when unresolved.
- Carries forward v5.2 NOTAM/runway assessment and TOLD date/time stamp.
- Carries forward 500 lb default emergency return fuel burn.


v5.4 MULTI-LEG FLIGHT PLAN ARCHIVE
- Archive renamed to Completed Flight Plans.
- Complete & Archive Flight Plan replaces Complete & Archive Mission terminology.
- Added Flight Plan / Leg Name on New Trip.
- Archived plans preserve route, crew, passengers, seating, baggage, fuel, selected runways, runway conditions/configuration, NOTAM manual overrides, and WHAT-IF state.
- Added Open / Edit to reopen an archived leg for review or revision.
- Re-saving an opened plan updates the same archived flight plan.
- Added Duplicate to create a copy for a next leg or alternate planning scenario.
- Multi-leg workflow supported: build/archive Leg 1, Leg 2, Leg 3, then reopen any leg and revise.
- FOB verification and low-fuel confirmation intentionally reset when reopening a plan and must be re-confirmed.


v5.5 NEW TRIP INPUT CLEANUP
- Removed Flight Plan / Leg Name field from New Trip.
- Archived flight plans are identified by route and saved date/time.
- Fuel Plan inputs now display 0000 by default with no placeholder wording.
- Tapping/clicking either fuel field selects all four digits so the pilot can immediately type the correct value.
- New Trip Fuel Plan labels shortened to FOB lb and Mission Fuel lb.
- Multi-leg archive Open/Edit/Duplicate workflow remains intact.


v5.6 TAKEOFF OPERATIONAL LIMIT CLEANUP
- Field-Limited Weight now auto-solves from the digitized dry BFL table using configuration, pressure altitude, OAT, and available runway length.
- Field-Limited Weight is read-only and no longer a manual pilot entry.
- Evaluate Takeoff no longer reports FIELD LIMIT pending when the source grid supports an automatic field limit.
- Obstacle Analysis = Verified clear is treated as satisfied.
- If climb limit is the only unresolved item, status explicitly reads FIELD LIMIT PASS • CLIMB DATA SOURCE REV B.
- No climb-limited weight is invented. It remains source-locked until the applicable climb-limit chart is digitized and validated.
- Wet runway field-limit logic remains source locked.


v5.7 QRH SECOND-SEGMENT CLIMB INTEGRATION
- Integrated Dassault Falcon 50B QRH1 takeoff GCLB2 data from pages 50-10 through 50-13.
- Digitized Slats and Slats + Flaps 20°, A/I OFF and A/I ON, PA 0/2,000/4,000/6,000 ft.
- Added Takeoff Anti-Ice selector.
- Second Segment Gross Gradient is now automatic/read-only.
- Climb-Limited Weight is now automatic/read-only.
- Uses 2.7% gross second-segment climb minimum for a three-engine airplane as the takeoff climb gate.
- Interpolation is allowed only inside published QRH cells; no extrapolation.
- If published QRH coverage ends before the structural maximum, the app uses the highest validated published weight as a conservative coverage cap and identifies that condition.
- Takeoff status can now show GO • FIELD / CLIMB / OBSTACLE PASS when field, QRH climb, and manually verified obstacle gates all pass.
- Falcon 50B QRH climb data remains an internal-beta validation source for N33AP; Dash-4 AFMS applicability must still be confirmed before operational approval.


v5.8 FLIGHT PLAN ARCHIVE DELETE CONTROLS
- Added individual Delete button to every saved flight plan.
- Added per-plan selection checkbox.
- Added Select All, Clear Selection, and Delete Selected controls.
- Bulk delete supports deleting multiple selected flight plans in one action.
- Individual and bulk deletes both require confirmation.
- Selection state automatically clears for records that no longer exist.
- All existing Open/Edit, Duplicate, Share, Email, and View TOLD functions remain intact.


v5.9 CLIMB-LIMIT STATUS CORRECTION
- Fixed QRH climb lookup at airports with negative pressure altitude: PA below 0 ft now uses the published 0-ft table conservatively instead of producing CLIMB DATA pending.
- No extrapolation is performed above the published QRH pressure-altitude range.
- Climb solver now explicitly checks structural MTOW 40,780 lb first. If it meets the QRH climb criterion, the app reports CLIMB NOT LIMITING and populates Climb-Limited Weight = 40,780 lb.
- If climb is limiting, a binary solver determines the maximum climb-limited weight within published QRH coverage.
- If QRH coverage ends below structural MTOW, the highest validated published weight is identified as a coverage cap rather than a generic pending condition.
- Generic CLIMB DATA SOURCE REV B is replaced by a real climb result whenever the QRH provides valid data.
- Source note updated to reflect base-Falcon performance architecture under the Dash-4 supplement, with final FTA-PA-001019 AFMS cross-check still required.


v5.10 DIRECTIONAL RUNWAY-END SELECTION
- Paired physical runway labels such as 12/30 are expanded into individual operational runway ends: 12 and 30.
- Departure and destination runway selectors now show individual runway ends.
- Initial automatic selection chooses the runway end that best favors current wind: headwind favored, tailwind heavily penalized, crosswind considered.
- Pilot manual selection of a runway end overrides the automatic choice.
- Wind components are recalculated for the selected runway-end heading.
- TOLD, email, archive, runway summary, landing runway gate, and NOTAM matching now use the actual selected runway end rather than the paired physical-runway label.
- Archived flight plans store and restore the selected runway end.


v5.11 TOLD 40C / MTOW QUICK REFERENCE
- Added permanent TOLD takeoff reference at 40°C and 40,780 lb MTOW.
- Uses the same selected departure runway, runway length, departure pressure altitude, takeoff configuration, anti-ice state, and runway condition as the active flight plan.
- Calculates BFL through the same digitized takeoff performance engine used by Section 6.
- Adds runway margin for the 40°C / MTOW reference.
- No extrapolation: if the 40°C / 40,780 lb point is outside the digitized source grid, TOLD shows SOURCE LOCKED rather than inventing a BFL.
- Wet runway quick-reference remains source locked until the applicable wet-runway source is validated.
- The 40°C / MTOW reference is also included in the comprehensive TOLD email/archive summary.


v5.12 FAST NUMERIC ENTRY / MOBILE KEYPAD
- All editable numeric fields select their entire existing value on focus/click/tap.
- The next digit entered replaces the old value without requiring backspace/delete.
- Editable numeric fields explicitly request the numeric keypad on iPhone, iPad, and Android.
- Added inputmode=decimal and enterkeyhint=done to editable number inputs.
- Applies to crew weights, fuel, baggage, manual runway length, WHAT-IF numeric inputs, and other editable numeric fields.
- Read-only calculated fields remain protected and are not modified.


v5.13 PASSENGER COUNT FAST ENTRY
- Number of Passengers now uses the same replace-on-entry behavior as crew weights and other editable numeric fields.
- Tap/click/focus selects the entire existing passenger count so the next number replaces it.
- iPhone/iPad explicitly request the integer numeric keypad for passenger count.
- Passenger count remains constrained by the existing min/max values.


v5.14 AIRPORT/RUNWAY FALLBACK PROCESSOR
- Fallback block now pulls individual runway ends from the loaded airport data.
- Departure/Destination target selector repopulates the fallback runway list automatically.
- Selecting a runway auto-populates runway ID, length, heading, width and surface.
- MANUAL ENTRY remains available when airport runway data are unavailable.
- PROCESS RUNWAY / WEATHER calculates headwind, tailwind and crosswind from the loaded METAR for the selected runway end.
- Departure fallback runs the current actual TOW/OAT/PA/configuration against the available runway using the existing BFL table engine.
- Destination fallback runs current landing LFL against the selected runway.
- Fallback Status is GREEN GO only when the implemented field-length check passes.
- Missing weather, missing performance source coverage, or wet-runway source lock is RED NO-GO / NOT EVALUATED.
- No crosswind or tailwind operational limit is invented; components are displayed for pilot review.
- Selected fallback runway is synchronized back to the active mission runway selector and TOLD.


v5.15 40C MAX-TOW + FAA NOTAM CORRECTION
- 40°C TOLD reference no longer blindly requests structural 40,780 lb when that exact point is outside source coverage.
- It now solves the maximum source-supported/field-allowable takeoff weight at 40°C for the active runway, pressure altitude and configuration, then reports its BFL and runway margin.
- TOLD now distinguishes 40°C Max Allowable TOW from structural MTOW.
- No extrapolation is used.
- Fixed a server defect where NOTAM_API_URL / NOTAM_API_KEY were referenced without being defined.
- Standardized server variables to FAA_NOTAM_API_URL and FAA_NOTAM_API_KEY, with backward-compatible NOTAM_API_URL / NOTAM_API_KEY aliases.
- FAA NOTAM query now uses icaoLocation and X-API-KEY, matching the official FAA NOTAM API access model.
- Added support for common JSON and GeoJSON response shapes.
- NOTAM retrieval now runs automatically after mission airport/weather data load.
- Landing runway assessment immediately evaluates the returned NOTAM set against the actual selected runway end.
- If FAA NOTAM API credentials are absent, the app explicitly remains NOT VERIFIED; it never produces a false checked state.


v5.16 FAA NMS NOTAM CONNECTION / GATE CORRECTION
- Updated NOTAM provider naming for the FAA NOTAM Management Service (NMS) transition.
- Added NMS_NOTAM_API_URL and NMS_NOTAM_API_KEY as the preferred deployment variables, while retaining older FAA_NOTAM_* and NOTAM_* aliases.
- Added /api/notams/config so the UI can distinguish 'not configured' from 'configured but unavailable.'
- NOTAM panel now displays FAA NMS API CONNECTED / NOT CONFIGURED / CONNECTION ERROR.
- Landing Runway Gate can no longer display RUNWAY LENGTH PASS as the main gate status when live NOTAM verification is missing.
- If runway length passes but NOTAMs are unavailable, the gate now reads NOTAM NOT VERIFIED in yellow.
- Green PASS requires a successful NOTAM retrieval plus the runway-length check.
- Current FAA NMS distribution access still requires authorized API access. The application intentionally does not fabricate or scrape NOTAM data when credentials are absent.

GODADDY DEPLOYMENT REQUIREMENT
Set these server environment variables with values supplied by FAA NMS API access:
  NMS_NOTAM_API_URL=<FAA-provided NMS distribution endpoint>
  NMS_NOTAM_API_KEY=<FAA-provided API credential>
Then restart/redeploy the Node application.


v5.17.1 DASH-4 AFMS REV B SOURCE LABEL UPDATE
---------------------------------------
- FTA-PA-001019 Rev B is now treated as the temporary controlling Dash-4 AFM Supplement pending receipt/comparison of Rev C.
- DTM813 / DTM912 remain controlling where not superseded by the Dash-4 AFMS.
- Section 6 source banner identifies FTA-PA-001019 Rev B and the pending Rev C review.
- Legacy Falcon 50 QRH second-segment climb data is retained as REFERENCE ONLY and can no longer clear the Dash-4 AFMS climb gate.
- A green takeoff GO cannot be generated from the legacy QRH climb grid while the applicable FTA-PA-001019 Rev B chart remains undigitized/unvalidated.
- Wet runway BFL/V1 remains source locked pending applicable source/method validation.
- WHAT-IF remains isolated from LIVE W&B and now explicitly reports AFMS CLIMB SOURCE REV B when the Dash-4 climb chart has not been cleared.
- DEVELOPMENT / VALIDATION — NOT APPROVED FOR FLIGHT USE.


v5.17.1 DASH-4 AFMS REV B SOURCE LABEL UPDATE
- Replaced user-facing CLIMB LIMIT PENDING wording with DATA SOURCE: FTA-PA-001019 REV B.
- No performance values were invented or extrapolated; Rev B remains the temporary controlling Dash-4 AFMS pending Rev C review.


V5.18 AFMS REV B DIGITIZATION
- FTA-PA-001019 Rev B is temporary controlling Dash-4 AFMS pending Rev C.
- Section 5-18 S+Flaps 20 takeoff climb-limit chart digitized.
- Section 5-27 Slats takeoff climb-limit chart digitized.
- Bounded interpolation only between published pressure-altitude contours and within source-drawn chart segments.
- No extrapolation; chart-derived limits rounded down to nearest 100 lb.
- QRH GCLB2 remains reference/cross-check only.
- DEVELOPMENT / VALIDATION — NOT APPROVED FOR FLIGHT USE.


V5.19 AFMS REV C SOURCE CONTROL
- FTA-PA-001019 Revision C, FAA approved September 30, 2009, is now the controlling Dash-4 AFM Supplement.
- Rev C log identifies only page iii and Section 6 page 6-1 as affected.
- Section 5 performance pages were not revised by Rev C; the previously digitized takeoff climb charts remain valid under the Rev C document set.
- Source labels now identify Rev C as controlling. Where applicable, chart labels note that the individual Section 5 page remains Rev A and was unchanged by Rev C.
- No performance values were altered solely because of the revision-letter change.
- Existing bounded interpolation/no-extrapolation safeguards remain in force.
- DEVELOPMENT / VALIDATION — NOT APPROVED FOR FLIGHT USE.

============================================================
V5.20 - FAA NMS OAUTH2 STAGING INTEGRATION
============================================================
FlightOps v5.21 replaces the prior x-api-key NOTAM placeholder with the FAA/CGI
NMS OAuth2 client-credentials workflow supplied during KUSA onboarding.

GoDaddy SERVER-SIDE environment variables (DO NOT put these in public files):
  NMS_CLIENT_ID=<KEY from FAA encrypted credential spreadsheet>
  NMS_CLIENT_SECRET=<SECRET from FAA encrypted credential spreadsheet>

Optional; staging defaults are already built in:
  NMS_AUTH_URL=https://api-staging.cgifederal-aim.com/v1/auth/token
  NMS_BASE_URL=https://api-staging.cgifederal-aim.com/nmsapi/v1
  NMS_RESPONSE_FORMAT=GEOJSON
  NMS_ENVIRONMENT=STAGING

Security rules:
- Never commit the FAA KEY/SECRET to GitHub.
- Never place credentials in public/index.html, public/config.js, or browser code.
- server.js requests and caches a bearer token, renewing it before expiration.
- If NMS returns HTTP 401, server.js forces one token renewal and retries once.
- Browser receives only normalized NOTAM data, never credentials or bearer tokens.

NMS request used by FlightOps:
  GET /nmsapi/v1/notams?location=<ICAO>
  Authorization: Bearer <server-side token>
  nmsResponseFormat: GEOJSON

Local verification after environment variables are configured:
  /api/notams/config     -> configured:true, authenticated:true
  /api/notams?icao=KBPT -> live normalized NMS NOTAM items
