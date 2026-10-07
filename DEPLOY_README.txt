KUSA FlightOps v5.26.15 FULL PATCH

Base: v5.26.14

Acceptance status carried forward:
- Cross-device draft sharing: PASSED in field test.
- v5.26.14 numeric keypad request: FAILED on iPad.

v5.26.15 change:
- iPad/iPhone positive whole-number operational fields now use type=tel + inputmode=numeric + [0-9]* to force the Apple numeric keypad more reliably.
- Decimal/negative operational fields use type=text + inputmode=decimal.
- Numeric sanitizers prevent accidental nonnumeric characters while preserving decimal/minus where permitted.
- Applies to both N33AP Falcon 50-4 and N699BG Falcon 900B.
- Desktop/Android retain native number inputs with inputmode hints.

Deploy:
1. Upload server.js and platform.js to /app and overwrite.
2. Upload all files under /public to /app/public and overwrite.
3. Restart Published App.
4. On iPad, fully close/reopen Safari/PWA or hard refresh to replace cached v5.26.14 assets.
5. Verify Browser / Server v5.26.15.
6. Tap a positive whole-number field such as passenger count, weight, baggage, fuel, or runway length. The Apple numeric keypad should display.
7. Verify a decimal/negative field such as temperature, wind component, slope, or altimeter still permits required decimal/negative entry.
