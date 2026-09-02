KUSA FlightOps v2.5 — Decoded Weather + Automatic V-Speed Fix

CHANGES
1. Section 3 now displays decoded METAR and decoded TAF as the primary weather presentation.
   Raw METAR/TAF remain available under expandable "Raw" details for reference.
2. Automatic V-speed timing fixed:
   - V1 and VR=V2 now recalculate automatically after mission/weather is loaded.
   - VREF now recalculates automatically from planned landing weight.
   - Changes to fuel, crew, passenger weights, baggage, taxi fuel, mission fuel and configuration update the speed card automatically.
   - BFL and landing field length are also auto-populated.
3. If the mission condition falls outside the digitized FlightSafety table, the value is cleared and SOURCE LOCKED rather than guessed.
4. FlightSafety Rev 8.4 tables remain the working source; FAA-approved AFM remains controlling source.

DEVELOPMENT / VALIDATION — NOT APPROVED FOR FLIGHT USE.
