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
