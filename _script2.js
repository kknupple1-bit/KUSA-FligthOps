
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js?v=5.25.57",{scope:"/"});
    } catch(e) { console.warn("FlightOps service worker registration failed",e); }
  });
}

try{enableUppercaseEntry();updateManualWeatherStationLabels();syncToldRunwaySelectors();}catch(e){}

window.addEventListener("DOMContentLoaded",()=>{setTimeout(f9InitSeatMover,0)});
