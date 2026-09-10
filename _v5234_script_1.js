
const FLIGHTOPS_API_BASE=(window.FLIGHTOPS_API_BASE||"").replace(/\/$/,"");
function apiUrl(path){return FLIGHTOPS_API_BASE+path}

const emptyWeight=21479.30,emptyMoment=127185.96,maxZFW=25570,maxRamp=40780,maxTO=40780,maxLand=35715,maxFuel=15514;
const fuelMomentSchedule=[
 [0,0],[500,24],[1000,49],[1500,77],[2000,87],[2500,73],[3000,62],[3500,53],
 [4000,46],[4500,41],[5000,29],[5500,12],[6000,-5],[6500,-22],[7000,-40],[7500,-58],
 [8000,-56],[8500,-55],[9000,-51],[9500,-49],[10000,-44],[10500,-23],[11000,-3],
 [11500,12],[12000,30],[12500,42],[13000,48],[13500,70],[14000,94],[14500,118],
 [15000,146],[15514,172]
];
const paxDefaults={male:180,female:150,child:70};
const paxLabels={male:"Adult Male",female:"Adult Female",child:"Child"};
const seats=[
 {n:1,arm:-172.73,station:"Row 1"},
 {n:2,arm:-172.73,station:"Row 1"},
 {n:3,arm:-118.79,station:"Row 2"},
 {n:4,arm:-118.79,station:"Row 2"},
 {n:5,arm:-60.61,station:"Single Seat"},
 {n:6,arm:-57.58,station:"Aft Lounge"},
 {n:7,arm:-41.82,station:"Aft Lounge"},
 {n:8,arm:0,station:"Aft Lounge"},
 {n:9,arm:0,station:"Aft Lounge"}
];
const baggageStations=[
 {name:"Baggage Compartment I",arm:82.65,limit:681},
 {name:"Baggage Compartment II",arm:101.71,limit:762},
 {name:"Baggage Compartment III",arm:123.95,limit:762}
];
const fwd=[[18959,14.0],[30618,14.0],[35715,19.2],[40300,22.99],[40780,23.3]];
const aft=[[18959,32.0],[40300,32.0],[40780,29.57]];
const QRH_CLIMB_GCLB2={"S20":{"OFF":{"0":{"25000":{"0.0":15.5,"15.0":15.4,"30.0":13.8,"45.0":10.1},"26000":{"0.0":14.4,"15.0":14.4,"30.0":12.7,"45.0":9.2},"27000":{"0.0":13.4,"15.0":13.3,"30.0":11.8,"45.0":8.4},"28000":{"0.0":12.4,"15.0":12.4,"30.0":10.9,"45.0":7.6},"29000":{"0.0":11.5,"15.0":11.5,"30.0":10.1,"45.0":6.9},"30000":{"0.0":10.7,"15.0":10.7,"30.0":9.3,"45.0":6.3},"31000":{"0.0":10.0,"15.0":10.0,"30.0":8.6,"45.0":5.8},"32000":{"0.0":9.3,"15.0":9.3,"30.0":8.0,"45.0":5.3},"33000":{"0.0":8.7,"15.0":8.7,"30.0":7.4,"45.0":4.8},"34000":{"0.0":8.2,"15.0":8.2,"30.0":6.9,"45.0":4.4},"35000":{"0.0":7.6,"15.0":7.6,"30.0":6.4,"45.0":3.9},"36000":{"0.0":7.1,"15.0":7.1,"30.0":5.9,"45.0":3.5},"37000":{"0.0":6.6,"15.0":6.6,"30.0":5.5,"45.0":3.2},"38000":{"0.0":6.2,"15.0":6.1,"30.0":5.1,"45.0":2.8},"39000":{"0.0":5.7,"15.0":5.7,"30.0":4.6},"40000":{"0.0":5.3,"15.0":5.3,"30.0":4.3},"40780":{"0.0":5.0,"15.0":5.0,"30.0":4.0}},"2000":{"25000":{"0.0":15.6,"15.0":15.2,"30.0":11.9,"45.0":8.6},"26000":{"0.0":14.5,"15.0":14.1,"30.0":10.9,"45.0":7.7},"27000":{"0.0":13.4,"15.0":13.1,"30.0":10.0,"45.0":7.0},"28000":{"0.0":12.5,"15.0":12.2,"30.0":9.2,"45.0":6.3},"29000":{"0.0":11.6,"15.0":11.3,"30.0":8.5,"45.0":5.6},"30000":{"0.0":10.8,"15.0":10.5,"30.0":7.8,"45.0":5.1},"31000":{"0.0":10.1,"15.0":9.8,"30.0":7.2,"45.0":4.6},"32000":{"0.0":9.4,"15.0":9.1,"30.0":6.6,"45.0":4.1},"33000":{"0.0":8.8,"15.0":8.5,"30.0":6.1,"45.0":3.7},"34000":{"0.0":8.2,"15.0":8.0,"30.0":5.6,"45.0":3.3},"35000":{"0.0":7.7,"15.0":7.4,"30.0":5.2,"45.0":2.9},"36000":{"0.0":7.2,"15.0":6.92,"30.0":4.7},"37000":{"0.0":6.7,"15.0":6.4,"30.0":4.3},"38000":{"0.0":6.2,"15.0":6.0,"30.0":3.9},"39000":{"0.0":5.8,"15.0":5.5,"30.0":3.5},"40000":{"0.0":5.4,"15.0":5.1,"30.0":3.2},"40780":{"0.0":5.1,"15.0":4.8,"30.0":2.9}},"4000":{"25000":{"0.0":15.4,"15.0":13.3,"30.0":10.2},"26000":{"0.0":14.3,"15.0":12.3,"30.0":9.2},"27000":{"0.0":13.3,"15.0":11.4,"30.0":8.4},"28000":{"0.0":12.3,"15.0":10.5,"30.0":7.7},"29000":{"0.0":11.4,"15.0":9.7,"30.0":7.0},"30000":{"0.0":10.6,"15.0":8.9,"30.0":6.4},"31000":{"0.0":9.9,"15.0":8.2,"30.0":5.8},"32000":{"0.0":9.3,"15.0":7.6,"30.0":5.3},"33000":{"0.0":8.7,"15.0":7.1,"30.0":4.8},"34000":{"0.0":8.1,"15.0":6.6,"30.0":4.4},"35000":{"0.0":7.6,"15.0":6.1,"30.0":4.0},"36000":{"0.0":7.0,"15.0":5.6,"30.0":3.6},"37000":{"0.0":6.5,"15.0":5.2,"30.0":3.2},"38000":{"0.0":6.1,"15.0":4.8,"30.0":2.8},"39000":{"0.0":5.6,"15.0":4.4},"40000":{"0.0":5.2,"15.0":4.0},"40780":{"0.0":4.9,"15.0":3.7}},"6000":{"25000":{"0.0":13.9,"15.0":11.4,"30.0":8.5},"26000":{"0.0":12.9,"15.0":10.4,"30.0":7.7},"27000":{"0.0":12.0,"15.0":9.6,"30.0":6.9},"28000":{"0.0":11.1,"15.0":8.8,"30.0":6.2},"29000":{"0.0":10.2,"15.0":8.0,"30.0":5.6},"30000":{"0.0":9.5,"15.0":7.4,"30.0":5.1},"31000":{"0.0":8.8,"15.0":6.8,"30.0":4.5},"32000":{"0.0":8.1,"15.0":6.2,"30.0":4.1},"33000":{"0.0":7.6,"15.0":5.8,"30.0":3.7},"34000":{"0.0":7.1,"15.0":5.3,"30.0":3.3},"35000":{"0.0":6.6,"15.0":4.8,"30.0":2.9},"36000":{"0.0":6.1,"15.0":4.4,"30.0":2.5},"37000":{"0.0":5.6,"15.0":4.0},"38000":{"0.0":5.2,"15.0":3.6},"39000":{"0.0":4.8,"15.0":3.2},"40000":{"0.0":4.4,"15.0":2.9},"40780":{"0.0":4.1}}},"ON":{"0":{"25000":{"-30.0":14.4,"-15.0":14.4,"0.0":14.4},"26000":{"-30.0":13.3,"-15.0":13.3,"0.0":13.3},"27000":{"-30.0":12.4,"-15.0":12.4,"0.0":12.3},"28000":{"-30.0":11.5,"-15.0":11.4,"0.0":11.4},"29000":{"-30.0":10.6,"-15.0":10.6,"0.0":10.6},"30000":{"-30.0":9.8,"-15.0":9.8,"0.0":9.8},"31000":{"-30.0":9.1,"-15.0":9.1,"0.0":9.1},"32000":{"-30.0":8.5,"-15.0":8.5,"0.0":8.5},"33000":{"-30.0":7.9,"-15.0":7.9,"0.0":7.9},"34000":{"-30.0":7.4,"-15.0":7.4,"0.0":7.4},"35000":{"-30.0":6.9,"-15.0":6.9,"0.0":6.8},"36000":{"-30.0":6.4,"-15.0":6.4,"0.0":6.3},"37000":{"-30.0":5.9,"-15.0":5.9,"0.0":5.9},"38000":{"-30.0":5.4,"-15.0":5.4,"0.0":5.4},"39000":{"-30.0":5.0,"-15.0":5.0,"0.0":5.0},"40000":{"-30.0":4.6,"-15.0":4.6,"0.0":4.6},"40780":{"-30.0":4.3,"-15.0":4.3,"0.0":4.3}},"2000":{"25000":{"-30.0":14.4,"-15.0":14.4,"0.0":14.4},"26000":{"-30.0":13.4,"-15.0":13.4,"0.0":13.4},"27000":{"-30.0":12.4,"-15.0":12.4,"0.0":12.4},"28000":{"-30.0":11.5,"-15.0":11.5,"0.0":11.5},"29000":{"-30.0":10.7,"-15.0":10.7,"0.0":10.6},"30000":{"-30.0":9.9,"-15.0":9.9,"0.0":9.8},"31000":{"-30.0":9.2,"-15.0":9.2,"0.0":9.2},"32000":{"-30.0":8.6,"-15.0":8.6,"0.0":8.5},"33000":{"-30.0":8.0,"-15.0":8.0,"0.0":8.0},"34000":{"-30.0":7.4,"-15.0":7.4,"0.0":7.4},"35000":{"-30.0":6.9,"-15.0":6.9,"0.0":6.9},"36000":{"-30.0":6.4,"-15.0":6.4,"0.0":6.4},"37000":{"-30.0":5.9,"-15.0":5.9,"0.0":5.9},"38000":{"-30.0":5.5,"-15.0":5.5,"0.0":5.5},"39000":{"-30.0":5.0,"-15.0":5.0,"0.0":5.0},"40000":{"-30.0":4.6,"-15.0":4.6,"0.0":4.6},"40780":{"-30.0":4.3,"-15.0":4.3,"0.0":4.3}},"4000":{"25000":{"-30.0":14.2,"-15.0":14.2,"0.0":13.2},"26000":{"-30.0":13.2,"-15.0":13.2,"0.0":12.2},"27000":{"-30.0":12.2,"-15.0":12.2,"0.0":11.3},"28000":{"-30.0":11.3,"-15.0":11.3,"0.0":10.4},"29000":{"-30.0":10.4,"-15.0":10.4,"0.0":9.6},"30000":{"-30.0":9.7,"-15.0":9.7,"0.0":8.9},"31000":{"-30.0":9.0,"-15.0":9.0,"0.0":8.2},"32000":{"-30.0":8.4,"-15.0":8.4,"0.0":7.6},"33000":{"-30.0":7.8,"-15.0":7.8,"0.0":7.0},"34000":{"-30.0":7.2,"-15.0":7.2,"0.0":6.5},"35000":{"-30.0":6.7,"-15.0":6.7,"0.0":6.1},"36000":{"-30.0":6.2,"-15.0":6.2,"0.0":5.6},"37000":{"-30.0":5.8,"-15.0":5.8,"0.0":5.2},"38000":{"-30.0":5.3,"-15.0":5.3,"0.0":4.8},"39000":{"-30.0":4.9,"-15.0":4.9,"0.0":4.4},"40000":{"-30.0":4.5,"-15.0":4.5,"0.0":4.0},"40780":{"-30.0":4.2,"-15.0":4.2,"0.0":3.7}},"6000":{"25000":{"-30.0":13.8,"-15.0":13.8,"0.0":11.4},"26000":{"-30.0":12.7,"-15.0":12.7,"0.0":10.5},"27000":{"-30.0":11.8,"-15.0":11.8,"0.0":9.6},"28000":{"-30.0":10.9,"-15.0":10.9,"0.0":8.8},"29000":{"-30.0":10.1,"-15.0":10.1,"0.0":8.0},"30000":{"-30.0":9.3,"-15.0":9.3,"0.0":7.4},"31000":{"-30.0":8.6,"-15.0":8.6,"0.0":6.8},"32000":{"-30.0":8.0,"-15.0":8.0,"0.0":6.2},"33000":{"-30.0":7.4,"-15.0":7.4,"0.0":5.8},"34000":{"-30.0":6.9,"-15.0":6.9,"0.0":5.3},"35000":{"-30.0":6.4,"-15.0":6.4,"0.0":4.8},"36000":{"-30.0":5.9,"-15.0":5.9,"0.0":4.4},"37000":{"-30.0":5.5,"-15.0":5.5,"0.0":4.0},"38000":{"-30.0":5.1,"-15.0":5.1,"0.0":3.6},"39000":{"-30.0":4.6,"-15.0":4.6,"0.0":3.2},"40000":{"-30.0":4.3,"-15.0":4.3,"0.0":2.9},"40780":{"-30.0":4.0,"-15.0":4.0,"0.0":2.7}}}},"SLATS":{"OFF":{"0":{"25000":{"0.0":16.0,"15.0":16.0,"30.0":15.4,"45.0":11.7},"26000":{"0.0":15.8,"15.0":15.8,"30.0":14.4,"45.0":10.8},"27000":{"0.0":14.9,"15.0":14.9,"30.0":13.4,"45.0":10.0},"28000":{"0.0":14.0,"15.0":14.0,"30.0":12.6,"45.0":9.3},"29000":{"0.0":13.2,"15.0":13.2,"30.0":11.8,"45.0":8.7},"30000":{"0.0":12.4,"15.0":12.4,"30.0":11.1,"45.0":8.0},"31000":{"0.0":11.6,"15.0":11.6,"30.0":10.4,"45.0":7.5},"32000":{"0.0":10.9,"15.0":10.9,"30.0":9.8,"45.0":6.9},"33000":{"0.0":10.3,"15.0":10.3,"30.0":9.2,"45.0":6.4},"34000":{"0.0":9.7,"15.0":9.7,"30.0":8.6,"45.0":5.9},"35000":{"0.0":9.1,"15.0":9.1,"30.0":8.1,"45.0":5.5},"36000":{"0.0":8.6,"15.0":8.6,"30.0":7.6,"45.0":5.1},"37000":{"0.0":8.2,"15.0":8.2,"30.0":7.2,"45.0":4.7},"38000":{"0.0":7.8,"15.0":7.8,"30.0":6.8,"45.0":4.4},"39000":{"0.0":7.4,"15.0":7.4,"30.0":6.4,"45.0":4.1},"40000":{"0.0":7.1,"15.0":7.1,"30.0":6.1,"45.0":3.8},"40780":{"0.0":6.8,"15.0":6.8,"30.0":5.8,"45.0":3.6}},"2000":{"25000":{"0.0":16.0,"15.0":16.0,"30.0":13.6,"45.0":10.1},"26000":{"0.0":15.9,"15.0":15.9,"30.0":12.7,"45.0":9.3},"27000":{"0.0":15.0,"15.0":15.0,"30.0":11.8,"45.0":8.6},"28000":{"0.0":14.1,"15.0":14.1,"30.0":11.1,"45.0":7.9},"29000":{"0.0":13.3,"15.0":13.3,"30.0":10.3,"45.0":7.3},"30000":{"0.0":12.5,"15.0":12.5,"30.0":9.6,"45.0":6.8},"31000":{"0.0":11.7,"15.0":11.7,"30.0":9.0,"45.0":6.3},"32000":{"0.0":11.0,"15.0":11.0,"30.0":8.4,"45.0":5.8},"33000":{"0.0":10.3,"15.0":10.3,"30.0":7.9,"45.0":5.3},"34000":{"0.0":9.7,"15.0":9.7,"30.0":7.4,"45.0":4.9},"35000":{"0.0":9.2,"15.0":9.2,"30.0":6.9,"45.0":4.5},"36000":{"0.0":8.7,"15.0":8.7,"30.0":6.5,"45.0":4.1},"37000":{"0.0":8.2,"15.0":8.2,"30.0":6.1,"45.0":3.8},"38000":{"0.0":7.8,"15.0":7.8,"30.0":5.7,"45.0":3.5},"39000":{"0.0":7.5,"15.0":7.5,"30.0":5.4,"45.0":3.2},"40000":{"0.0":7.1,"15.0":7.1,"30.0":5.0},"40780":{"0.0":6.8,"15.0":6.9,"30.0":4.7}},"4000":{"25000":{"0.0":16.0,"15.0":15.0,"30.0":11.8},"26000":{"0.0":15.9,"15.0":14.0,"30.0":10.9},"27000":{"0.0":15.0,"15.0":13.0,"30.0":10.1},"28000":{"0.0":14.1,"15.0":12.2,"30.0":9.4},"29000":{"0.0":13.3,"15.0":11.4,"30.0":8.7},"30000":{"0.0":12.5,"15.0":10.7,"30.0":8.1},"31000":{"0.0":11.7,"15.0":10.1,"30.0":7.5},"32000":{"0.0":11.0,"15.0":9.4,"30.0":7.0},"33000":{"0.0":10.3,"15.0":8.8,"30.0":6.5},"34000":{"0.0":9.7,"15.0":8.3,"30.0":6.0},"35000":{"0.0":9.2,"15.0":7.8,"30.0":5.5},"36000":{"0.0":8.7,"15.0":7.3,"30.0":5.1},"37000":{"0.0":8.2,"15.0":6.9,"30.0":4.8},"38000":{"0.0":7.8,"15.0":6.5,"30.0":4.4},"39000":{"0.0":7.4,"15.0":6.2,"30.0":4.1},"40000":{"0.0":7.1,"15.0":5.8,"30.0":3.8},"40780":{"0.0":6.8,"15.0":5.5,"30.0":3.6}},"6000":{"25000":{"0.0":15.6,"15.0":13.0,"30.0":10.3},"26000":{"0.0":14.6,"15.0":12.1,"30.0":9.4},"27000":{"0.0":13.7,"15.0":11.3,"30.0":8.7},"28000":{"0.0":12.8,"15.0":10.5,"30.0":8.1},"29000":{"0.0":12.0,"15.0":9.8,"30.0":7.4},"30000":{"0.0":11.3,"15.0":9.1,"30.0":6.9},"31000":{"0.0":10.6,"15.0":8.5,"30.0":6.4},"32000":{"0.0":10.0,"15.0":8.0,"30.0":5.9},"33000":{"0.0":9.4,"15.0":7.4,"30.0":5.4},"34000":{"0.0":8.8,"15.0":6.9,"30.0":5.0},"35000":{"0.0":8.3,"15.0":6.5,"30.0":4.6},"36000":{"0.0":7.8,"15.0":6.0,"30.0":4.2},"37000":{"0.0":7.4,"15.0":5.6,"30.0":3.9},"38000":{"0.0":7.0,"15.0":5.3,"30.0":3.5},"39000":{"0.0":6.6,"15.0":5.0,"30.0":3.3},"40000":{"0.0":6.2,"15.0":4.6},"40780":{"0.0":6.0,"15.0":4.3}}},"ON":{"0":{"25000":{"-30.0":15.9,"-15.0":15.9,"0.0":15.9},"26000":{"-30.0":14.9,"-15.0":14.9,"0.0":14.9},"27000":{"-30.0":13.9,"-15.0":13.9,"0.0":14.0},"28000":{"-30.0":13.0,"-15.0":13.1,"0.0":13.1},"29000":{"-30.0":12.2,"-15.0":12.2,"0.0":12.3},"30000":{"-30.0":11.5,"-15.0":11.5,"0.0":11.6},"31000":{"-30.0":10.8,"-15.0":10.8,"0.0":10.9},"32000":{"-30.0":10.1,"-15.0":10.1,"0.0":10.2},"33000":{"-30.0":9.5,"-15.0":9.5,"0.0":9.6},"34000":{"-30.0":9.0,"-15.0":9.0,"0.0":9.0},"35000":{"-30.0":8.4,"-15.0":8.4,"0.0":8.5},"36000":{"-30.0":7.9,"-15.0":8.0,"0.0":8.0},"37000":{"-30.0":7.5,"-15.0":7.5,"0.0":7.6},"38000":{"-30.0":7.1,"-15.0":7.1,"0.0":7.2},"39000":{"-30.0":6.8,"-15.0":6.8,"0.0":6.8},"40000":{"-30.0":6.4,"-15.0":6.4,"0.0":6.5},"40780":{"-30.0":6.1,"-15.0":6.1,"0.0":6.2}},"2000":{"25000":{"-30.0":15.9,"-15.0":16.0,"0.0":16.0},"26000":{"-30.0":14.9,"-15.0":15.0,"0.0":15.0},"27000":{"-30.0":14.0,"-15.0":14.0,"0.0":14.1},"28000":{"-30.0":13.1,"-15.0":13.1,"0.0":13.2},"29000":{"-30.0":12.3,"-15.0":12.3,"0.0":12.4},"30000":{"-30.0":11.6,"-15.0":11.6,"0.0":11.6},"31000":{"-30.0":10.9,"-15.0":10.9,"0.0":10.9},"32000":{"-30.0":10.2,"-15.0":10.2,"0.0":10.3},"33000":{"-30.0":9.6,"-15.0":9.6,"0.0":9.6},"34000":{"-30.0":9.0,"-15.0":9.0,"0.0":9.1},"35000":{"-30.0":8.5,"-15.0":8.5,"0.0":8.5},"36000":{"-30.0":8.0,"-15.0":8.0,"0.0":8.1},"37000":{"-30.0":7.6,"-15.0":7.6,"0.0":7.6},"38000":{"-30.0":7.2,"-15.0":7.2,"0.0":7.2},"39000":{"-30.0":6.8,"-15.0":6.8,"0.0":6.9},"40000":{"-30.0":6.5,"-15.0":6.5,"0.0":6.5},"40780":{"-30.0":6.2,"-15.0":6.2,"0.0":6.2}},"4000":{"25000":{"-30.0":15.7,"-15.0":15.8,"0.0":15.8},"26000":{"-30.0":14.7,"-15.0":14.8,"0.0":14.8},"27000":{"-30.0":13.8,"-15.0":13.8,"0.0":13.8},"28000":{"-30.0":12.9,"-15.0":12.9,"0.0":13.0},"29000":{"-30.0":12.1,"-15.0":12.1,"0.0":12.2},"30000":{"-30.0":11.4,"-15.0":11.4,"0.0":11.4},"31000":{"-30.0":10.7,"-15.0":10.7,"0.0":10.7},"32000":{"-30.0":10.1,"-15.0":10.1,"0.0":10.1},"33000":{"-30.0":9.4,"-15.0":9.4,"0.0":9.5},"34000":{"-30.0":8.9,"-15.0":8.9,"0.0":8.9},"35000":{"-30.0":8.4,"-15.0":8.4,"0.0":8.4},"36000":{"-30.0":7.9,"-15.0":7.9,"0.0":7.9},"37000":{"-30.0":7.4,"-15.0":7.4,"0.0":7.5},"38000":{"-30.0":7.0,"-15.0":7.1,"0.0":7.1},"39000":{"-30.0":6.7,"-15.0":6.7,"0.0":6.7},"40000":{"-30.0":6.3,"-15.0":6.3,"0.0":6.3},"40780":{"-30.0":6.0,"-15.0":6.0,"0.0":6.1}},"6000":{"25000":{"-30.0":15.4,"-15.0":15.4,"0.0":13.1},"26000":{"-30.0":14.4,"-15.0":14.4,"0.0":12.2},"27000":{"-30.0":13.5,"-15.0":13.4,"0.0":11.4},"28000":{"-30.0":12.6,"-15.0":12.6,"0.0":10.6},"29000":{"-30.0":11.8,"-15.0":11.8,"0.0":9.9},"30000":{"-30.0":11.1,"-15.0":11.1,"0.0":9.2},"31000":{"-30.0":10.4,"-15.0":10.4,"0.0":8.6},"32000":{"-30.0":9.8,"-15.0":9.8,"0.0":8.0},"33000":{"-30.0":9.2,"-15.0":9.2,"0.0":7.5},"34000":{"-30.0":8.6,"-15.0":8.6,"0.0":7.0},"35000":{"-30.0":8.1,"-15.0":8.1,"0.0":6.5},"36000":{"-30.0":7.6,"-15.0":7.6,"0.0":6.1},"37000":{"-30.0":7.2,"-15.0":7.2,"0.0":5.7},"38000":{"-30.0":6.8,"-15.0":6.8,"0.0":5.3},"39000":{"-30.0":6.4,"-15.0":6.4,"0.0":5.0},"40000":{"-30.0":6.1,"-15.0":6.1,"0.0":4.7},"40780":{"-30.0":5.8,"-15.0":5.8}}}}};
const QRH_CLIMB_MIN_GROSS=2.7; // 3-engine second-segment minimum, 14 CFR 25.121(b)
const QRH_CLIMB_SOURCE="Dassault Falcon 50B QRH1 50-10/50-11/50-12/50-13";

// FTA-PA-001019 Rev C controlling Dash-4 AFMS (FAA approved 2009-09-30).
// Rev C changed only revision log page iii and Section 6 noise page 6-1; Section 5 performance pages are unchanged.
// Digitized from FAA-approved Section 5 chart scans. Pixel-to-axis calibration was
// derived from the published chart grid. Each contour is bounded to the source-drawn
// segment captured from the scan; interpolation is allowed only between published
// pressure-altitude contours and within each contour's digitized segment. NO EXTRAPOLATION.
const AFMS_REVC_CHART_CAL={
  weight:{m:9.78472332,b:21298.1258},      // lb = m*x + b
  temp:{m:-0.0974460361,b:169.795289}      // °C = m*y + b
};
const AFMS_REVC_TO_CLIMB={
  S20:{
    OFF:[
      {pa:2000,m:.251154790,b:818.592006,xmin:1663,xmax:2216},
      {pa:4000,m:.239316467,b:932.722753,xmin:1235,xmax:2112},
      {pa:6000,m:.248998480,b:997.908821,xmin:1050,xmax:2066},
      {pa:8000,m:.249110391,b:1080.148108,xmin:947,xmax:2094},
      {pa:10000,m:.249004023,b:1163.418932,xmin:948,xmax:2219},
      {pa:12000,m:.244569478,b:1262.251624,xmin:622,xmax:2219},
      {pa:14000,m:.291486575,b:1284.118130,xmin:601,xmax:2219}
    ],
    ON:[
      {pa:8000,m:.258513962,b:1276.709899,xmin:1399,xmax:2156},
      {pa:10000,m:.319866378,b:1282.169650,xmin:941,xmax:2219},
      {pa:12000,m:.368555721,b:1311.745580,xmin:627,xmax:2055},
      {pa:14000,m:.376118410,b:1349.010672,xmin:746,xmax:1401}
    ]
  },
  SLATS:{
    OFF:[
      {pa:4000,m:.257895602,b:806.898875,xmin:1569,xmax:2089},
      {pa:6000,m:.239546535,b:919.900519,xmin:1480,xmax:1985},
      {pa:8000,m:.235553597,b:1004.553567,xmin:1214,xmax:2049},
      {pa:10000,m:.235499143,b:1082.110312,xmin:650,xmax:2068},
      {pa:12000,m:.239979101,b:1154.018999,xmin:607,xmax:2109},
      {pa:14000,m:.258712332,b:1210.027967,xmin:607,xmax:2028}
    ],
    ON:[
      {pa:10000,m:.267811404,b:1238.344106,xmin:1265,xmax:2086},
      {pa:12000,m:.288432610,b:1296.339136,xmin:607,xmax:2087},
      {pa:14000,m:.270122057,b:1399.029645,xmin:1125,xmax:1819}
    ]
  }
};
const AFMS_REVC_TO_CLIMB_SOURCE={S20:'FTA-PA-001019 Rev C §5-18 (page Rev A; unchanged by Rev C)',SLATS:'FTA-PA-001019 Rev C §5-27 (page Rev A; unchanged by Rev C)'};

function afmsRevCContourWeight(line,tempC,maxStruct=40780){
  if(!line||!Number.isFinite(tempC))return null;
  const tc=AFMS_REVC_CHART_CAL.temp,wc=AFMS_REVC_CHART_CAL.weight;
  const y=(tempC-tc.b)/tc.m;
  const x=(y-line.b)/line.m;
  if(!Number.isFinite(x))return null;

  // Do not extrapolate a contour beyond the source-drawn segment. There is one
  // useful source-bounded exception: if the selected temperature lies on the
  // cooler side of the captured right endpoint AND that published endpoint is
  // already above structural MTOW, the chart has already established that climb
  // is not limiting before the structural limit is reached. In that region we
  // return structural MTOW, not an extrapolated climb weight.
  if(x>line.xmax){
    const endX=line.xmax;
    const endW=wc.m*endX+wc.b;
    const endY=line.m*endX+line.b;
    const endTemp=tc.m*endY+tc.b;
    if(Number.isFinite(endW)&&Number.isFinite(endTemp)&&endW>=maxStruct&&tempC<=endTemp){
      return maxStruct;
    }
    return null;
  }
  if(x<line.xmin)return null;
  const w=wc.m*x+wc.b;
  return Number.isFinite(w)?w:null;
}
function afmsRevCTakeoffClimbLimit(cfg,ai,pa,tempC){
  const lines=AFMS_REVC_TO_CLIMB?.[cfg]?.[ai];
  const out={limit:null,pass:null,noLimitation:false,coverageLimited:false,source:AFMS_REVC_TO_CLIMB_SOURCE[cfg]||'FTA-PA-001019 Rev C',basis:''};
  if(!lines||![pa,tempC].every(Number.isFinite)){out.coverageLimited=true;return out;}
  const maxStruct=40780;
  const minPA=lines[0].pa,maxPA=lines[lines.length-1].pa;
  if(pa>maxPA){out.coverageLimited=true;out.basis=`PA ${Math.round(pa)} ft above digitized ${maxPA} ft contour`;return out;}
  if(pa<minPA){
    // Below the first drawn pressure-altitude contour, do not calculate an
    // extrapolated climb limit. We may only declare structural MTOW governing
    // when the first published contour itself is already beyond structural MTOW
    // at the selected temperature (source-bounded, conservative conclusion).
    const firstW=afmsRevCContourWeight(lines[0],tempC,maxStruct);
    if(Number.isFinite(firstW)&&firstW>=maxStruct){
      out.limit=maxStruct;
      out.noLimitation=true;
      out.basis=`PA ${Math.round(pa)} ft below first drawn ${minPA.toLocaleString()}-ft contour; first published contour already exceeds structural MTOW at selected OAT; structural MTOW governs`;
      return out;
    }
    out.coverageLimited=true;out.basis=`PA ${Math.round(pa)} ft below first drawn ${minPA.toLocaleString()}-ft contour and structural-govern region not established by source; no extrapolation`;return out;
  }
  let lo=null,hi=null;
  for(let i=0;i<lines.length-1;i++)if(pa>=lines[i].pa&&pa<=lines[i+1].pa){lo=lines[i];hi=lines[i+1];break;}
  if(!lo&&pa===maxPA){lo=hi=lines[lines.length-1];}
  if(!lo){out.coverageLimited=true;return out;}
  const w1=afmsRevCContourWeight(lo,tempC,maxStruct),w2=afmsRevCContourWeight(hi,tempC,maxStruct);
  if(!Number.isFinite(w1)||!Number.isFinite(w2)){out.coverageLimited=true;out.basis='Point falls outside source-drawn contour segment; no extrapolation';return out;}
  const frac=lo.pa===hi.pa?0:(pa-lo.pa)/(hi.pa-lo.pa);
  let w=w1+(w2-w1)*frac;
  // Conservative chart-resolution handling: round DOWN to nearest 100 lb.
  w=Math.floor(w/100)*100;
  out.limit=Math.min(maxStruct,w);
  out.noLimitation=w>=maxStruct;
  out.basis=`bounded interpolation ${lo.pa.toLocaleString()}-${hi.pa.toLocaleString()} ft contours; rounded down 100 lb`;
  return out;
}


// FTA-PA-001019 Rev C — Landing climb / maximum landing-weight source control.
// Section 5 performance pages remain Rev A and are unchanged by Rev C.
// Digitized from §5-32 (S+Flaps 48°) and §5-36 (Approach Slats / Landing S+Flaps 20°).
// Data below represents only the source-drawn NO-ANTI-ICE contour segments needed to
// resolve a climb-limited landing weight at or below structural MLW. Between-contour
// interpolation is allowed; extrapolation beyond a source-drawn segment is prohibited.
// Conservative output is rounded DOWN to the nearest 100 lb.
const AFMS_REVC_LDG_CLIMB_SOURCE={
  S48:'FTA-PA-001019 Rev C §5-32 (page Rev A; unchanged by Rev C)',
  S20:'FTA-PA-001019 Rev C §5-36 (page Rev A; unchanged by Rev C)'
};
const AFMS_REVC_LDG_CLIMB_OFF={
  // Each contour point pair is [temperature °C, landing weight lb].
  // Points were digitized from the FAA-approved chart grid; structural MLW is 35,715 lb.
  S48:[
    {pa:0,pts:[[50,37500],[42,41100]]},
    {pa:2000,pts:[[47,34400],[23,41100]]},
    {pa:4000,pts:[[42,33300],[16,41100]]},
    {pa:6000,pts:[[39,32200],[8,41100]]},
    {pa:8000,pts:[[36,31100],[1,41100]]},
    {pa:10000,pts:[[32,30000],[-8,41100]]},
    {pa:12000,pts:[[28,28900],[-17,41100]]},
    {pa:14000,pts:[[24,27800],[-25,40900]]}
  ],
  S20:[
    {pa:0,pts:[[50,40600],[23,41800]]},
    {pa:2000,pts:[[50,39600],[10,41800]]},
    {pa:4000,pts:[[49,38700],[0,41800]]},
    {pa:6000,pts:[[46,37700],[-15,41800]]},
    {pa:8000,pts:[[43,36700],[-28,41800]]},
    {pa:10000,pts:[[37,35700],[-38,41800]]},
    {pa:12000,pts:[[32,34700],[-49,41100]]},
    {pa:14000,pts:[[27,33700],[-50,40000]]}
  ]
};
function afmsLandingContourWeight(contour,tempC,maxStruct=35715){
  if(!contour||!Array.isArray(contour.pts)||contour.pts.length<2||!Number.isFinite(tempC))return null;
  const pts=[...contour.pts].sort((a,b)=>b[0]-a[0]); // hot -> cold
  const hot=pts[0],cold=pts[pts.length-1];
  // If the hottest source point already exceeds structural MLW, structural governs
  // throughout the cooler side of the chart without extrapolating a climb weight.
  if(tempC>hot[0])return null;
  if(tempC<cold[0]){
    if(cold[1]>=maxStruct)return maxStruct;
    return null;
  }
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1];
    if(tempC<=a[0]&&tempC>=b[0]){
      const f=(tempC-a[0])/(b[0]-a[0]);
      const w=a[1]+(b[1]-a[1])*f;
      return Math.min(maxStruct,w);
    }
  }
  return null;
}
function afmsRevCLandingClimbLimit(cfg,ai,pa,tempC){
  const maxStruct=35715;
  const out={limit:null,noLimitation:false,coverageLimited:false,source:AFMS_REVC_LDG_CLIMB_SOURCE[cfg]||'FTA-PA-001019 Rev C',basis:''};
  if(ai!=='OFF'){
    out.coverageLimited=true;
    out.basis='Landing anti-ice ON selected; anti-ice landing climb contours are not yet digitized. No substitution permitted.';
    return out;
  }
  const lines=AFMS_REVC_LDG_CLIMB_OFF[cfg];
  if(!lines||![pa,tempC].every(Number.isFinite)){out.coverageLimited=true;out.basis='Landing PA/OAT unavailable';return out;}
  const minPA=lines[0].pa,maxPA=lines[lines.length-1].pa;
  if(pa<minPA||pa>maxPA){out.coverageLimited=true;out.basis=`PA ${Math.round(pa)} ft outside digitized ${minPA.toLocaleString()}-${maxPA.toLocaleString()} ft contours`;return out;}
  let lo=lines[0],hi=lines[lines.length-1];
  for(let i=0;i<lines.length-1;i++)if(pa>=lines[i].pa&&pa<=lines[i+1].pa){lo=lines[i];hi=lines[i+1];break;}
  if(pa===maxPA)lo=hi=lines[lines.length-1];
  const w1=afmsLandingContourWeight(lo,tempC,maxStruct),w2=afmsLandingContourWeight(hi,tempC,maxStruct);
  if(!Number.isFinite(w1)||!Number.isFinite(w2)){
    out.coverageLimited=true;
    out.basis='Point falls outside source-drawn landing climb contour segment; no extrapolation';
    return out;
  }
  const f=lo.pa===hi.pa?0:(pa-lo.pa)/(hi.pa-lo.pa);
  const raw=w1+(w2-w1)*f;
  out.noLimitation=raw>=maxStruct;
  out.limit=out.noLimitation?maxStruct:Math.floor(raw/100)*100;
  out.basis=`bounded interpolation ${lo.pa.toLocaleString()}-${hi.pa.toLocaleString()} ft contours; rounded down 100 lb`;
  return out;
}

const FS_PERF={
 takeoff:{
  S20:{label:"Slats + Flaps 20°",vr:{24:98,26:101,28:105,30:109,32:112,34:116,36:119,38:122,40:126,40.7:127},vfr:{24:113,26:116,28:120,30:124,32:127,34:131,36:134,38:137,40:141,40.7:142},v15vs:{24:150,26:155,28:160,30:165,32:171,34:177,36:182,38:188,40:192,40.7:195},tables:{
   0:{24:{0:[91,2750],10:[91,2850],20:[91,2900],30:[91,3150],40:[91,3450]},26:{0:[91,2775],10:[91,2875],20:[91,2925],30:[91,3200],40:[91,3500]},28:{0:[91,2800],10:[91,2900],20:[91,2950],30:[91,3225],40:[91,3600]},30:{0:[91,2850],10:[91,2950],20:[91,3000],30:[92,3300],40:[95,3650]},32:{0:[96,3100],10:[96,3200],20:[96,3300],30:[98,3600],40:[101,4150]},34:{0:[101,3400],10:[101,3550],20:[101,3650],30:[103,4050],40:[106,4750]},36:{0:[106,3800],10:[106,3900],20:[106,4050],30:[108,4500],40:[111,5300]},38:{0:[111,4200],10:[111,4300],20:[111,4450],30:[112,5050],40:[115,6000]},40:{0:[115,4700],10:[115,4800],20:[115,4950],30:[117,5700],40:[118,6700]},40.7:{0:[116,4900],10:[116,5000],20:[116,5200],30:[118,6000],40:[120,7000]}},
   2000:{24:{0:[91,2950],10:[91,2950],20:[91,3150],30:[91,3400],40:[91,3750]},26:{0:[91,3000],10:[91,3000],20:[91,3200],30:[91,3450],40:[91,3800]},28:{0:[91,3025],10:[91,3050],20:[91,3250],30:[91,3500],40:[92,3900]},30:{0:[91,3050],10:[91,3100],20:[92,3300],30:[95,3650],40:[97,4200]},32:{0:[96,3400],10:[96,3500],20:[98,3700],30:[100,4200],40:[103,4800]},34:{0:[101,3800],10:[101,3950],20:[103,4100],30:[105,4750],40:[108,5550]},36:{0:[106,4200],10:[106,4400],20:[108,4600],30:[110,5300],40:[113,6250]},38:{0:[111,4650],10:[111,5000],20:[112,5150],30:[115,6000],40:[118,7000]},40:{0:[115,5200],10:[115,5650],20:[116,5800],30:[119,6700]},40.7:{0:[116,5400],10:[116,5900],20:[117,6100],30:[120,7000]}},
   4000:{24:{0:[91,3050],10:[91,3200],20:[91,3450],30:[91,3800],40:[91,4200]},26:{0:[91,3100],10:[91,3250],20:[91,3500],30:[91,3850],40:[91,4250]},28:{0:[91,3150],10:[91,3300],20:[91,3550],30:[92,3950],40:[94,4300]},30:{0:[91,3200],10:[92,3400],20:[94,3750],30:[97,4225],40:[100,4850]},32:{0:[96,3550],10:[97,3700],20:[100,4250],30:[102,4800],40:[106,5550]},34:{0:[101,4000],10:[102,4150],20:[105,4800],30:[108,5550],40:[111,6350]},36:{0:[106,4500],10:[107,4650],20:[110,5400],30:[113,6300]},38:{0:[111,5050],10:[112,5200],20:[115,6050],30:[117,7000]},40:{0:[115,5700],10:[116,5850],20:[119,6800]},40.7:{0:[116,6000],10:[117,6150],20:[120,7100]}},
   6000:{24:{0:[91,3400],10:[91,3550],20:[91,3900],30:[91,4300],40:[91,4700]},26:{0:[91,3450],10:[91,3600],20:[91,3950],30:[91,4400],40:[91,4800]},28:{0:[91,3500],10:[91,3700],20:[92,4000],30:[94,4500],40:[97,4950]},30:{0:[92,3550],10:[94,3900],20:[96,4350],30:[99,5000],40:[102,5700]},32:{0:[97,4050],10:[99,4400],20:[102,4950],30:[105,5700],40:[108,6600]},34:{0:[102,4600],10:[104,5000],20:[107,5700],30:[110,6550]},36:{0:[107,5250],10:[109,5550],20:[112,6400],30:[115,7350]},38:{0:[112,5900],10:[114,6250],20:[117,7150]},40:{0:[116,6650],10:[118,6950]},40.7:{0:[117,6900],10:[120,7300]}}
  }},
  SLATS:{label:"Slats Only",vr:{24:107,26:111,28:115,30:119,32:123,34:127,36:131,38:134,40:138},vfr:{24:132,26:136,28:140,30:144,32:148,34:152,36:156,38:159,40:163},v15vs:{24:150,26:155,28:160,30:165,32:171,34:177,36:182,38:188,40:192},tables:{
   4000:{24:{0:[91,2900],10:[91,3100],20:[91,3400],30:[92,3800],40:[95,4150]},26:{0:[92,3000],10:[93,3200],20:[95,3550],30:[98,3950],40:[101,4450]},28:{0:[97,3350],10:[98,3550],20:[101,4000],30:[103,4450],40:[106,5050]},30:{0:[102,3700],10:[103,4000],20:[106,4500],30:[109,5050],40:[112,5800]},32:{0:[108,4150],10:[109,4500],20:[112,5100],30:[115,5800],40:[118,6700]},34:{0:[114,4650],10:[115,5100],20:[118,5750],30:[121,6650],40:[124,7600]},36:{0:[119,5200],10:[121,5700],20:[123,6450],30:[126,7500],40:[129,8650]},38:{0:[124,5750],10:[126,6350],20:[128,7250],30:[131,8350],40:[134,9750]},40:{0:[129,6400]}},
   6000:{24:{0:[91,3200],10:[91,3500],20:[92,3800],30:[94,4100],40:[97,4500]},26:{0:[93,3300],10:[95,3650],20:[97,4050],30:[100,4450],40:[103,5100]},28:{0:[99,3700],10:[100,4100],20:[103,4500],30:[106,5100],40:[108,5850]},30:{0:[104,4150],10:[106,4600],20:[108,5150],30:[111,5850],40:[114,6700]},32:{0:[110,4750],10:[112,5250],20:[114,5850],30:[117,6700],40:[120,7700]},34:{0:[116,5400],10:[118,5950],20:[120,6700],30:[123,7650],40:[126,8800]},36:{0:[121,6100],10:[123,6700],20:[126,7550],30:[128,8600],40:[131,10000]},38:{0:[126,6950],10:[128,7450]}},
   8000:{24:{0:[91,3750],10:[92,4000],20:[93,4300],30:[96,4650]},26:{0:[95,3900],10:[97,4250],20:[99,4700],30:[102,5350]},28:{0:[101,4400],10:[103,4800],20:[105,5450],30:[108,6200]},30:{0:[106,5000],10:[108,5500],20:[111,6250],30:[113,7100]},32:{0:[112,5750],10:[114,6300],20:[117,7200],30:[119,8200]},34:{0:[118,6500],10:[120,7200],20:[123,8150],30:[126,9350]},36:{0:[123,7350],10:[126,8100],20:[129,9250],30:[131,10700]}},
   10000:{24:{0:[92,4200],10:[94,4500],20:[96,4950],30:[97,5400]},26:{0:[98,4550],10:[100,5100],20:[102,5700],30:[103,6300]},28:{0:[103,5250],10:[105,5850],20:[108,6450],30:[109,6200]},30:{0:[108,5000],10:[111,5500],20:[113,6650],30:[115,7350]},32:{0:[112,6000],10:[114,6750],20:[117,7650],30:[119,8450]},34:{0:[120,7850],10:[122,8900],20:[125,10250],30:[127,11200]},36:{0:[126,8850]}}
  }}
 },
 landing:{
  S48:{label:"Slats + Flaps 48°",speed:{24:104,25:106,27:110,29:114,31:118,33:121,35:125,35.7:126,37:128,38.8:131},tables:{
   0:{24:[2100,3510],25:[2150,3590],27:[2275,3800],29:[2400,4010],31:[2550,4260],33:[2700,4510],35:[2850,4760],35.7:[2900,4850],37:[3025,5060],38.8:[3200,5350]},
   2000:{24:[2175,3640],25:[2250,3760],27:[2375,3970],29:[2500,4180],31:[2675,4470],33:[2825,4720],35:[2975,4970],35.7:[3025,5060],37:[3150,5260],38.8:[3300,5520]},
   4000:{24:[2250,3760],25:[2325,3890],27:[2475,4140],29:[2625,4390],31:[2775,4640],33:[2950,4930],35:[3100,5180],35.7:[3150,5260],37:[3275,5470],38.8:[3450,5690]},
   6000:{24:[2375,3970],25:[2425,4050],27:[2575,4300],29:[2725,4550],31:[2900,4850],33:[3075,5140],35:[3250,5430],35.7:[3300,5520],37:[3425,5720],38.8:[3575,5970]},
   8000:{24:[2575,4300],25:[2650,4430],27:[2800,4680],29:[2950,4930],31:[3125,5220],33:[3325,5560],35:[3500,5850],35.7:[3575,5970],37:[3700,6180],38.8:[3875,6480]},
   10000:{24:[2775,4640],25:[2875,4810],27:[3025,5060],29:[3200,5350],31:[3400,5680],33:[3600,6020],35:[3800,6350],35.7:[3875,6480],37:[4025,6730],38.8:[4225,7060]}
  }},
  S20:{label:"Slats + Flaps 20°",speedLabel:"VREF+5",speed:{24:109,25:111,27:115,29:119,31:123,33:127,35:130,35.7:132,37:134,38.8:137},tables:{
   0:{24:[2475,4150],25:[2550,4275],27:[2675,4475],29:[2800,4675],31:[2925,4900],33:[3075,5150],35:[3225,5400],35.7:[3275,5475],37:[3400,5675],38.8:[3525,5900]},
   2000:{24:[2550,4275],25:[2625,4400],27:[2775,4650],29:[2900,4850],31:[3050,5100],33:[3200,5350],35:[3375,5650],35.7:[3425,5725],37:[3525,5900],38.8:[3700,6200]},
   4000:{24:[2650,4425],25:[2750,4600],27:[2875,4800],29:[3025,5050],31:[3175,5300],33:[3350,5600],35:[3500,5850],35.7:[3575,5975],37:[3675,6150],38.8:[3825,6400]},
   6000:{24:[2775,4650],25:[2850,4775],27:[3000,5025],29:[3150,5275],31:[3300,5525],33:[3475,5800],35:[3650,6100],35.7:[3700,6200],37:[3825,6400],38.8:[3975,6650]},
   8000:{24:[3000,5025],25:[3075,5150],27:[3250,5425],29:[3425,5725],31:[3600,6025],33:[3775,6300],35:[3950,6600],35.7:[4025,6725],37:[4150,6950],38.8:[4325,7225]},
   10000:{24:[3250,5425],25:[3325,5550],27:[3525,5900],29:[3700,6200],31:[3875,6475],33:[4075,6825],35:[4275,7150],35.7:[4350,7275],37:[4475,7475],38.8:[4675,7825]}
  }}
 }
};
function kN(o){return Object.keys(o).map(Number).sort((a,b)=>a-b)}
function bracketN(a,x){if(x<a[0]||x>a[a.length-1])return null;for(let i=0;i<a.length;i++)if(x===a[i])return[a[i],a[i]];for(let i=0;i<a.length-1;i++)if(x>a[i]&&x<a[i+1])return[a[i],a[i+1]];return null}
function lerpN(a,b,t){return a+(b-a)*t}
function interpScalarN(map,x){const b=bracketN(kN(map),x);if(!b)return null;const[a,c]=b;if(a===c)return +map[a];return lerpN(+map[a],+map[c],(x-a)/(c-a))}
function interpPairN(map,x){const b=bracketN(kN(map),x);if(!b)return null;const[a,c]=b;if(a===c)return map[a].map(Number);const t=(x-a)/(c-a);return[lerpN(+map[a][0],+map[c][0],t),lerpN(+map[a][1],+map[c][1],t)]}
function fsTakeoff(cfg,pa,temp,wk){
 const d=FS_PERF.takeoff[cfg],pb=d&&bracketN(kN(d.tables),pa);if(!pb)return null;
 function atP(p){const wm=d.tables[p],wb=bracketN(kN(wm),wk);if(!wb)return null;
  function atW(w){const tm=wm[w],tb=bracketN(kN(tm),temp);if(!tb)return null;const[a,b]=tb,A=tm[a],B=tm[b];if(a===b)return A.map(Number);const f=(temp-a)/(b-a);return[lerpN(+A[0],+B[0],f),lerpN(+A[1],+B[1],f)]}
  const[a,b]=wb,A=atW(a),B=atW(b);if(!A||!B)return null;if(a===b)return A;const f=(wk-a)/(b-a);return[lerpN(A[0],B[0],f),lerpN(A[1],B[1],f)]}
 const[a,b]=pb,A=atP(a),B=atP(b);if(!A||!B)return null;const P=a===b?A:[lerpN(A[0],B[0],(pa-a)/(b-a)),lerpN(A[1],B[1],(pa-a)/(b-a))],vr=interpScalarN(d.vr,wk);if(vr==null)return null;return{v1:P[0],bfl:P[1],vr}}
function fsLanding(cfg,pa,wk){const d=FS_PERF.landing[cfg],pb=d&&bracketN(kN(d.tables),pa);if(!pb)return null;const[a,b]=pb,A=interpPairN(d.tables[a],wk),B=interpPairN(d.tables[b],wk);if(!A||!B)return null;const P=a===b?A:[lerpN(A[0],B[0],(pa-a)/(b-a)),lerpN(A[1],B[1],(pa-a)/(b-a))],s=interpScalarN(d.speed,wk);if(s==null)return null;return{speed:s,ld:P[0],lfl:P[1],speedLabel:d.speedLabel||"VREF"}}


let missionData=null;
let passengers=[];
let seatAssignments=Array(9).fill(null); // stores passenger id
let editingPaxId=null;

const $=id=>document.getElementById(id);
const num=id=>+$((id)).value||0;
let latestCalc=null;
let currentNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
let departureNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
let departureObstacleReview={status:"NOT_CHECKED",airport:null,items:[],checked_at:null,message:"FAA NMS departure NOTAM scan only — not a clearance analysis."};
let manualWeather={
 dep:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null},
 dest:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null}
};
function wxPoint(which){return missionData?(which==="dep"?missionData.departure:missionData.destination):null}
function weatherSourceState(which){
 const st=manualWeather[which],p=wxPoint(which);
 if(st?.applied&&st.mode==="MANUAL")return{mode:"MANUAL",time:st.entered_at,note:st.note||"Pilot-entered weather"};
 const m=p?.metar; const obs=firstVal(m||{},["obs_time","reportTime","obsTime","time"]);
 if(m)return{mode:"LIVE",time:obs||null,note:"Reported METAR"};
 return{mode:"UNAVAILABLE",time:null,note:"No weather report loaded"};
}
function formatWeatherSource(which){const w=weatherSourceState(which);if(w.mode==="MANUAL")return`MANUAL • ${w.time?new Date(w.time).toLocaleString():"pilot entry"}`;if(w.mode==="LIVE")return`LIVE${w.time?" • "+fmtUtc(w.time):""}`;return"UNAVAILABLE"}
function updateWeatherSourceBadges(){
 [["dep","depWxSourceBadge","depWxSourceTime"],["dest","destWxSourceBadge","destWxSourceTime"]].forEach(([which,bid,tid])=>{const w=weatherSourceState(which),b=$(bid),t=$(tid);if(!b)return;b.textContent=w.mode;b.className=w.mode==="LIVE"?"ok":w.mode==="MANUAL"?"warn":"bad";if(t)t.textContent=w.mode==="MANUAL"?(w.time?new Date(w.time).toLocaleString():"Pilot entry"):(w.mode==="LIVE"?(w.time?fmtUtc(w.time):"Reported weather"):(w.note||"No report"));});
}
function parseWindFromRawMetar(m){
 const raw=String(firstVal(m||{},["raw","rawOb","raw_text"])||"").toUpperCase();
 const mt=raw.match(/\b(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);if(!mt)return{dir:null,spd:null,gust:null};
 return{dir:mt[1]==="VRB"?"VRB":Number(mt[1]),spd:Number(mt[2]),gust:mt[3]?Number(mt[3]):null};
}
function activeWindValues(m){const raw=parseWindFromRawMetar(m);let dir=firstVal(m||{},["wind_dir","wdir","windDir","wind_direction"]),spd=firstVal(m||{},["wind_kt","wspd","windSpeed","wind_speed_kt"]),gust=firstVal(m||{},["wind_gust_kt","wgst","windGust","wind_gust"]);if(dir==null)dir=raw.dir;if(spd==null)spd=raw.spd;if(gust==null)gust=raw.gust;return{dir,spd,gust}}
function loadManualWeatherForm(){
 const which=$("manualWxTarget")?.value||"dep",p=wxPoint(which),st=manualWeather[which];
 if($("manualWxMode"))$("manualWxMode").value=st?.applied?"MANUAL":"LIVE";
 const m=p?.metar||{},saved=st?.manual_values||null;
 const val=(id,v)=>{const e=$(id);if(e)e.value=(v===null||v===undefined||v==="")?"":v};
 if(st?.applied&&saved){
   val("manualWxOAT",saved.oat);val("manualWxPA",saved.pa);val("manualWxAlt",saved.alt);val("manualWxDir",saved.dir);val("manualWxSpeed",saved.spd);val("manualWxGust",saved.gust);val("manualWxNote",st?.note||"");
 }else{
   val("manualWxOAT",firstVal(m,["temp_c","temperature_c","temp","temperature"]));
   val("manualWxPA",p?.pressure_altitude_ft);val("manualWxAlt",p?.altimeter_inhg);
   const w=activeWindValues(m);val("manualWxDir",w.dir);val("manualWxSpeed",w.spd);val("manualWxGust",w.gust);
   val("manualWxNote",st?.note||"");
 }
 manualWeatherModeChanged();updateWeatherSourceBadges();
}
function updateManualWeatherActionButton(){
 const mode=$("manualWxMode")?.value||"LIVE",b=$("manualWxActionBtn");if(!b)return;
 b.textContent=mode==="MANUAL"?"UPDATE MANUAL WEATHER":"REFRESH / USE LIVE WEATHER";
}
function manualWeatherModeChanged(){
 const mode=$("manualWxMode")?.value||"LIVE",which=$("manualWxTarget")?.value||"dep",st=manualWeather[which],p=wxPoint(which);
 const ids=["manualWxOAT","manualWxPA","manualWxAlt","manualWxDir","manualWxSpeed","manualWxGust","manualWxNote"];ids.forEach(id=>{if($(id))$(id).disabled=mode!=="MANUAL"});
 if(mode==="MANUAL"&&st?.manual_values){const v=st.manual_values;const put=(id,x)=>{if($(id))$(id).value=x??""};put("manualWxOAT",v.oat);put("manualWxPA",v.pa);put("manualWxAlt",v.alt);put("manualWxDir",v.dir);put("manualWxSpeed",v.spd);put("manualWxGust",v.gust);put("manualWxNote",st.note||"");}
 if(mode==="LIVE"&&p){const m=(st?.live?.metar)||p.metar||{};const put=(id,x)=>{if($(id))$(id).value=x??""};put("manualWxOAT",firstVal(m,["temp_c","temperature_c","temp","temperature"]));put("manualWxPA",st?.live?.pressure_altitude_ft??p.pressure_altitude_ft??"");put("manualWxAlt",st?.live?.altimeter_inhg??p.altimeter_inhg??"");const w=activeWindValues(m);put("manualWxDir",w.dir);put("manualWxSpeed",w.spd);put("manualWxGust",w.gust);}
 const stxt=$("manualWxStatus");if(stxt)stxt.textContent=mode==="MANUAL"?"MANUAL selected. Enter or revise pilot weather, then press UPDATE MANUAL WEATHER.":"LIVE selected. Press REFRESH / USE LIVE WEATHER to restore the live feed and recalculate.";
 updateManualWeatherActionButton();
}
async function applyManualWeather(){
 const which=$("manualWxTarget")?.value||"dep",mode=$("manualWxMode")?.value||"LIVE";
 if(!missionData){const dep=cleanICAO($("dep").value),dest=cleanICAO($("dest").value);if(!dep||!dest){alert("Enter departure and destination identifiers first.");return}missionData={departure:{icao:dep,airport:{ident:dep},runways:[],metar:null,taf:null},destination:{icao:dest,airport:{ident:dest},runways:[],metar:null,taf:null},alternate:null};}
 const p=wxPoint(which),st=manualWeather[which];if(!p)return;
 if(!st.live){st.live={metar:p.metar?JSON.parse(JSON.stringify(p.metar)):null,pressure_altitude_ft:p.pressure_altitude_ft??null,density_altitude_ft:p.density_altitude_ft??null,altimeter_inhg:p.altimeter_inhg??null};}
 if(mode==="LIVE"){
   const L=st.live||{};p.metar=L.metar||null;p.pressure_altitude_ft=L.pressure_altitude_ft??null;p.density_altitude_ft=L.density_altitude_ft??null;p.altimeter_inhg=L.altimeter_inhg??null;st.mode="LIVE";st.applied=false;
   // If online, refresh the mission feed so LIVE means the newest available report rather than only the pre-manual snapshot.
   try{if(cleanICAO($("dep").value)&&cleanICAO($("dest").value)){await loadMission({preserveManualWeather:true,quiet:true});return;}}catch(e){}
 }else{
   const oat=valueOrNull("manualWxOAT"),alt=valueOrNull("manualWxAlt"),dir=valueOrNull("manualWxDir"),spd=valueOrNull("manualWxSpeed"),gust=valueOrNull("manualWxGust");let pa=valueOrNull("manualWxPA");
   const elev=Number(p?.airport?.elevation_ft??p?.airport?.elev??p?.airport?.elevation);if(!Number.isFinite(pa)&&Number.isFinite(alt)&&Number.isFinite(elev))pa=elev+(29.92-alt)*1000;
   if(!Number.isFinite(oat)||!Number.isFinite(pa)){alert("Manual weather requires OAT and pressure altitude, or an altimeter setting with a known airport elevation.");return}
   const now=new Date().toISOString();st.manual_values={oat,pa:Math.round(pa),alt:Number.isFinite(alt)?alt:null,dir:Number.isFinite(dir)?dir:null,spd:Number.isFinite(spd)?spd:null,gust:Number.isFinite(gust)?gust:null};
   p.metar={icao:p.icao||p.airport?.ident||"",raw:"MANUAL WEATHER ENTRY",obs_time:now,temp_c:oat,wind_dir:st.manual_values.dir,wind_kt:st.manual_values.spd,wind_gust_kt:st.manual_values.gust,manual:true};p.pressure_altitude_ft=Math.round(pa);p.altimeter_inhg=st.manual_values.alt;const isa=15-0.0019812*pa;p.density_altitude_ft=Math.round(pa+120*(oat-isa));st.mode="MANUAL";st.applied=true;st.entered_at=now;st.note=String($("manualWxNote")?.value||"").trim();
 }
 populatePoint(which,p);selectedRunwayChanged();if(valueOrNull("perfTOW")){syncTakeoffSection();syncLandingSection()}updateWeatherSourceBadges();updateToldCard();
 const ws=$("weatherDecodeStatus");if(ws)ws.innerHTML=weatherSourceState(which).mode==="MANUAL"?'<span class="warn">MANUAL WEATHER ACTIVE — pilot-entered values control performance for this station.</span>':'<span class="ok">LIVE / reported weather restored where available.</span>';
 const ms=$("manualWxStatus");if(ms)ms.textContent=weatherSourceState(which).mode==="MANUAL"?`MANUAL WEATHER UPDATED ${new Date(manualWeather[which].entered_at).toLocaleString()}`:"LIVE weather restored.";
 updateManualWeatherActionButton();
}


function resetFuelVerification(){if($("fobVerified"))$("fobVerified").checked=false;}
function updateFOBVerifyLabel(){
 const e=$("fobVerifyLabel"),cb=$("fobVerified");
 if(!e||!cb)return;
 const fob=Math.max(0,num("fuel"));
 if(fob<=0){e.textContent="ENTER FOB FIRST";e.className="bad";}
 else if(cb.checked){e.textContent="FOB VERIFIED";e.className="ok";}
 else{e.textContent="FOB NOT VERIFIED";e.className="warn";}
}
function resetLowFuelConfirmation(){if($("lowFuelConfirm"))$("lowFuelConfirm").checked=false;}
function showPlatformView(view){
 const ids=["home","newtrip","ops","told","archive","shared"];
 ids.forEach(v=>{
   const el=$(v+"View"); if(el)el.style.display=(v===view)?"block":"none";
   const btn=$(v+"TabBtn"); if(btn)btn.classList.toggle("active",v===view);
 });
 const bottomActions=$("missionBottomActions");
 if(bottomActions)bottomActions.style.display=(view==="ops")?"flex":"none";
 if(view==="told"){recalculate();updateToldCard();}
 if(view==="ops"){requestAnimationFrame(()=>requestAnimationFrame(redrawCgEnvelope));}
 if(view==="archive")renderArchive();
 if(view==="home"){updateHomeArchiveCount();updateHomeDraftCount();}
 window.scrollTo({top:0,behavior:"smooth"});
}
function showAppTab(tab){ showPlatformView(tab); } // backward compatibility


function cleanICAO(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)}
function newMissionId(){return "M-"+Date.now().toString(36).toUpperCase()}
function getMissionArchive(){
 try{return JSON.parse(localStorage.getItem("kusaFlightOpsArchive")||"[]")}catch{return[]}
}
function saveMissionArchive(arr){localStorage.setItem("kusaFlightOpsArchive",JSON.stringify(arr));updateHomeArchiveCount()}
function updateHomeArchiveCount(){
 const e=$("homeArchiveCount");if(e)e.textContent=getMissionArchive().length;
}
function getMissionDrafts(){
 try{return JSON.parse(localStorage.getItem("kusaFlightOpsDrafts")||"[]")}catch{return[]}
}
function saveMissionDrafts(arr){localStorage.setItem("kusaFlightOpsDrafts",JSON.stringify(arr));updateHomeDraftCount()}
function updateHomeDraftCount(){const e=$("homeDraftCount");if(e)e.textContent=getMissionDrafts().length}
let draftSaveTimer=null;
function draftRecord(){
 if(!window.currentMissionMeta||window.currentMissionMeta.completed)return null;
 const state=captureCurrentPlanState();
 state.manual_weather=JSON.parse(JSON.stringify(manualWeather||{}));
 state.fob_verified=!!$("fobVerified")?.checked;
 state.low_fuel_confirmed=!!$("lowFuelConfirm")?.checked;
 return {id:window.currentMissionMeta.id,aircraft:window.currentMissionMeta.aircraft||"N33AP",note:window.currentMissionMeta.note||state.note||"",started_at:window.currentMissionMeta.started_at||new Date().toISOString(),updated_at:new Date().toISOString(),dep:state.dep,dest:state.dest,alt:state.alt,state};
}
function saveCurrentDraft(){
 const rec=draftRecord();if(!rec)return;
 const arr=getMissionDrafts();const ix=arr.findIndex(x=>x.id===rec.id);if(ix>=0)arr[ix]=rec;else arr.unshift(rec);
 saveMissionDrafts(arr.slice(0,50));
 const txt=`Draft saved ${new Date(rec.updated_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
 const e=$("draftSaveStatus");if(e)e.textContent=txt; const eb=$("draftSaveStatusBottom");if(eb)eb.textContent=txt;
}
function scheduleDraftSave(){
 if(!window.currentMissionMeta||window.currentMissionMeta.completed)return;
 const e=$("draftSaveStatus");if(e)e.textContent="Saving draft…";const eb=$("draftSaveStatusBottom");if(eb)eb.textContent="Saving draft…";
 clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(saveCurrentDraft,450);
}
function removeMissionDraft(id){if(!id)return;saveMissionDrafts(getMissionDrafts().filter(x=>x.id!==id));}
function resetMissionForNewTrip(){
 // Mission-identifying fields
 $("dep").value="";$("dest").value="";$("alt").value="";
 // Fuel confirmation is never carried into a new mission
 if($("fobVerified"))$("fobVerified").checked=false;
 if($("lowFuelConfirm"))$("lowFuelConfirm").checked=false;
 missionData=null;
 currentNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
 departureNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
 manualWeather={dep:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null},dest:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null}};
 updateWeatherSourceBadges();
 // Clear runway selectors and mission-derived summary/performance fields
 ["depRunway","destRunway"].forEach(id=>{const e=$(id);if(e)e.innerHTML='<option value="">Load mission first</option>'});
 ["perfRwyLen","landRwyLen","perfV1","perfVR","perfBFL","landVref","landFieldLen"].forEach(id=>{const e=$(id);if(e)e.value=""});
 ["sumDepRwy","sumDestRwy","toStatus","landStatus"].forEach(id=>{const e=$(id);if(e)e.textContent="—"});
 updateFOBVerifyLabel();
 if($("fallbackRunwaySelect"))populateFallbackRunwayOptions();
}

function selectFuelEntry(el){
 if(!el)return;
 requestAnimationFrame(()=>{try{el.select()}catch(e){}});
}

function clearNewTripForm(){
 ["homeDep","homeDest","homeAlt","homeTripNote"].forEach(id=>{if($(id))$(id).value=""});
 if($("homeFOB"))$("homeFOB").value="0000";
 if($("homeMissionFuel"))$("homeMissionFuel").value="0000";
}
function openNewTripForm(){clearNewTripForm();showPlatformView("newtrip");}
function initializeMenuLanding(){
 resetMissionForNewTrip();
 clearNewTripForm();
 window.currentMissionMeta=null;
 showPlatformView("home");
}

function startNewTrip(){
 const dep=cleanICAO($("homeDep").value),dest=cleanICAO($("homeDest").value),alt=cleanICAO($("homeAlt").value);
 const fob=Number($("homeFOB").value);
 const missionFuel=Number($("homeMissionFuel").value);
 if(!dep||!dest){
   alert("Enter departure and destination ICAO identifiers.");
   return;
 }
 if(!Number.isFinite(fob)||fob<=0){
   alert("Enter Fuel on Board before starting the trip.");
   return;
 }
 if(!Number.isFinite(missionFuel)||missionFuel<0){
   alert("Enter Mission Required Fuel before starting the trip.");
   return;
 }
 if(missionFuel>fob){
   const ok=confirm("Mission Required Fuel exceeds Fuel on Board. Start the trip anyway?");
   if(!ok)return;
 }
 resetMissionForNewTrip();
 $("dep").value=dep;$("dest").value=dest;$("alt").value=alt;
 $("fuel").value=Math.round(fob);
 $("missionFuel").value=Math.round(missionFuel);
 if($("fobVerified"))$("fobVerified").checked=false;
 resetLowFuelConfirmation();
 window.currentMissionMeta={
   id:newMissionId(),
   aircraft:$("homeAircraft").value||"N33AP",
note:$("homeTripNote").value.trim(),
   initial_fob_lb:Math.round(fob),
   planned_mission_fuel_lb:Math.round(missionFuel),
   started_at:new Date().toISOString(),
   completed:false
 };
 recalculate();
 showPlatformView("ops");
 saveCurrentDraft();
 loadMission().finally(()=>scheduleDraftSave());
}
function currentMissionSummaryText(){
 updateToldCard();
 const c=latestCalc||{};
 const dep=cleanICAO($("dep").value)||"—",dest=cleanICAO($("dest").value)||"—",alt=cleanICAO($("alt").value)||"—";
 const dr=selectedRunwayObj("dep"),lr=selectedRunwayObj("dest");
 const dw=dr&&dr.wind_components||{},lw=lr&&lr.wind_components||{};
 const bagLoads=baggageLoadsFromUI();
 const bagTotal=bagLoads.reduce((a,b)=>a+b,0);
 const counts={male:0,female:0,child:0};
 const seatText=[];
 seatAssignments.forEach((pid,i)=>{
   if(!pid)return;
   const p=getPassenger(pid); if(!p)return;
   counts[p.type]=(counts[p.type]||0)+1;
   const short=p.type==="male"?"M":p.type==="female"?"F":"C";
   seatText.push(`${seats[i].n}:${short}/${Math.round(p.weight)}lb`);
 });
 const fob=Math.max(0,num("fuel")),taxi=Math.max(0,num("taxiFuel")),missionFuel=Math.max(0,num("missionFuel"));
 const depPA=perfTakeoffPA(), depTemp=perfTakeoffTemp();
 const destPA=missionData&&Number.isFinite(Number(missionData.destination.pressure_altitude_ft))
   ?Math.round(Number(missionData.destination.pressure_altitude_ft)):null;
 const toConfig=FS_PERF.takeoff[$("toConfig").value]?.label||"—";
 const landConfig=FS_PERF.landing[$("landConfig").value]?.label||"—";
 const lines=[
   "KUSA FLIGHTOPS — AIRCRAFT PREP / TOLD",
   "N33AP — FALCON 50-4",
   `${dep} → ${dest}${alt!=="—"?" | ALTERNATE "+alt:""}`,
   `Generated: ${new Date().toLocaleString()}`,
   "",
   "=== AIRCRAFT / LOAD ===",
   `Captain: ${Math.round(num("captWt")).toLocaleString()} lb`,
   `First Officer: ${Math.round(num("foWt")).toLocaleString()} lb`,
   `Passengers seated: ${seatAssignments.filter(Boolean).length} | M ${counts.male||0} / F ${counts.female||0} / C ${counts.child||0}`,
   `Seat assignments: ${seatText.length?seatText.join(" | "):"None"}`,
   `Baggage: ${Math.round(bagTotal).toLocaleString()} lb total | I ${Math.round(bagLoads[0]||0)} | II ${Math.round(bagLoads[1]||0)} | III ${Math.round(bagLoads[2]||0)} lb`,
   "",
   "=== FUEL PLAN ===",
   `FOB: ${Math.round(fob).toLocaleString()} lb | Verified: ${$("fobVerified")?.checked?"YES":"NO"}`,
   `Taxi fuel: ${Math.round(taxi).toLocaleString()} lb`,
   `Mission required fuel: ${Math.round(missionFuel).toLocaleString()} lb`,
   `Planned landing fuel: ${Number.isFinite(c.landingFuel)?Math.round(c.landingFuel).toLocaleString()+" lb":"—"}`,
   `Landing fuel gate: ${textOf("landingFuelGuardStatus")}`,
   "",
   "=== WEIGHT & BALANCE ===",
   `ZFW: ${Number.isFinite(c.zfw)?Math.round(c.zfw).toLocaleString()+" lb":"—"}`,
   `Ramp Weight: ${Number.isFinite(c.ramp)?Math.round(c.ramp).toLocaleString()+" lb":"—"}`,
   `Takeoff Weight: ${Number.isFinite(c.tow)?Math.round(c.tow).toLocaleString()+" lb":"—"}`,
   `Landing Weight: ${Number.isFinite(c.landing)?Math.round(c.landing).toLocaleString()+" lb":"—"}`,
   `Takeoff CG: ${Number.isFinite(c.takeoffPct)?c.takeoffPct.toFixed(2)+"% MAC":"—"}`,
   `Landing CG: ${Number.isFinite(c.landingPct)?c.landingPct.toFixed(2)+"% MAC":"—"}`,
   `W&B Status: ${c.wbOK?"READY":"CHECK"}`,
   "",
   "=== TAKEOFF TOLD ===",
   `Airport / Runway: ${dep} / ${dr?dr.runway_id:"—"}`,
   `Runway: ${dr&&dr.length_ft?Number(dr.length_ft).toLocaleString()+" ft":"—"} | Condition: ${$("toRunwayCondition")?.value||"—"}`,
   `Wind: HW ${dw.headwind_kt??"—"} / TW ${dw.tailwind_kt??"—"} / XW ${dw.crosswind_kt??"—"} kt`,
   `OAT: ${Number.isFinite(depTemp)?depTemp+"°C":"—"} | Pressure Altitude: ${Number.isFinite(depPA)?Math.round(depPA).toLocaleString()+" ft":"—"}`,
   `Weather Source: ${formatWeatherSource("dep")}`,
   `Configuration: ${toConfig}`,
   `V1: ${textOf("vsV1")} | VR=V2: ${textOf("vsVR")} | Vfr: ${textOf("vsVFT")} | 1.5Vs: ${textOf("vsVFS")}`,
   `Emergency Return VREF: ${textOf("vsVREF")}`,
   `Balanced Field Length: ${$("perfBFL").value?Number($("perfBFL").value).toLocaleString()+" ft":"SOURCE LOCKED"}`,
   `40°C / SOURCE-EVALUATED TOW Quick Reference BFL: ${Number.isFinite(hotMaxTakeoffReference().bfl)?Math.round(hotMaxTakeoffReference().bfl).toLocaleString()+" ft":"SOURCE LOCKED"} | Margin: ${Number.isFinite(hotMaxTakeoffReference().margin)?Math.round(hotMaxTakeoffReference().margin).toLocaleString()+" ft":"—"} | ${hotMaxTakeoffReference().status}`,
   `Structural MTOW: 40,780 lb | Digitized Field-Source Ceiling: ${textOf("toMax")}`,
   `Climb-Limited TOW: ${$("perfClimbWt")?.value?Number($("perfClimbWt").value).toLocaleString()+" lb":"SOURCE LOCKED"}`,
   `OEI 2nd Segment Gross Gradient: ${Number.isFinite(valueOrNull("perfGrad"))?valueOrNull("perfGrad").toFixed(2)+"% • QRH REFERENCE":"SOURCE LOCKED"}`,
   `Runway Margin: ${textOf("toRwyMargin")}`,
   `Takeoff Status: ${textOf("toStatus")}`,
   `Auto Obstacle Review: ${departureObstacleReview?.status||"NOT_CHECKED"} • FAA NMS text scan only; not a certified clearance analysis`,
   "",
   "=== LANDING TOLD ===",
   `Airport / Runway: ${dest} / ${lr?lr.runway_id:"—"}`,
   `Runway: ${lr&&lr.length_ft?Number(lr.length_ft).toLocaleString()+" ft":"—"} | Condition: ${$("landRunwayCondition")?.value||"—"}`,
   `Wind: HW ${lw.headwind_kt??"—"} / TW ${lw.tailwind_kt??"—"} / XW ${lw.crosswind_kt??"—"} kt`,
   `Pressure Altitude: ${destPA==null?"—":destPA.toLocaleString()+" ft"}`,
   `Weather Source: ${formatWeatherSource("dest")}`,
   `Configuration: ${landConfig}`,
   `VREF: ${$("landVref").value?Number($("landVref").value).toFixed(1)+" kt":"SOURCE LOCKED"}`,
   `Landing Field Length Required: ${$("landFieldLen").value?Number($("landFieldLen").value).toLocaleString()+" ft":"SOURCE LOCKED"}`,
   `Published Runway Length: ${Number.isFinite(runwayPublishedLength())?Math.round(runwayPublishedLength()).toLocaleString()+" ft":"—"}`,
   `Usable Runway Length: ${Number.isFinite(effectiveLandingRunwayAssessment().usable)?Math.round(effectiveLandingRunwayAssessment().usable).toLocaleString()+" ft":"—"}`,
   `NOTAM Status: ${currentNotams.status} | Runway State: ${effectiveLandingRunwayAssessment().state||"—"}`,
   `Max Allowable Landing Weight: ${textOf("landMax")}`,
   `Runway Margin: ${textOf("landRwyMargin")}`,
   `Landing Status: ${textOf("landStatus")}`,
   "",
   "=== SAFETY / SOURCE STATUS ===",
   `FOB verification: ${$("fobVerified")?.checked?"VERIFIED":"NOT VERIFIED"}`,
   `Low landing fuel confirmation: ${textOf("landingFuelGuardStatus")}`,
   `Takeoff performance mode: ${perfIsManual()?"WHAT-IF / HYPOTHETICAL":"LIVE / ACTUAL MISSION"}`,
   `Takeoff source status: ${textOf("toStatus")}`,
   `Landing source status: ${textOf("landStatus")}`,
   `NOTAM status: ${currentNotams.status} | Source: ${currentNotams.source||"NONE"}`,
   "",
   "DEVELOPMENT / VALIDATION — NOT APPROVED FOR FLIGHT USE"
 ];
 return lines.join("\n");
}
function b64urlEncodeUtf8(text){
 const bytes=new TextEncoder().encode(String(text||""));let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
 return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function b64urlDecodeUtf8(text){
 let s=String(text||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";
 const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);
}
function makeToldShareLink(summary=currentMissionSummaryText(),title=null){
 const dep=cleanICAO($("dep")?.value||""),dest=cleanICAO($("dest")?.value||"");
 const payload={v:1,title:title||`N33AP TOLD — ${dep||"—"} → ${dest||"—"}`,generated:new Date().toISOString(),summary:String(summary||"")};
 return `${window.location.origin}${window.location.pathname}#told=${b64urlEncodeUtf8(JSON.stringify(payload))}`;
}
async function copyCurrentToldLink(){
 const link=makeToldShareLink();
 try{await navigator.clipboard.writeText(link);alert("Shareable TOLD snapshot link copied.");}
 catch(e){prompt("Copy this TOLD snapshot link:",link);}
}
function openSharedToldFromHash(){
 const hash=String(window.location.hash||"");if(!hash.startsWith("#told="))return false;
 try{
   const p=JSON.parse(b64urlDecodeUtf8(hash.slice(6)));if(!p||!p.summary)return false;
   if($("sharedToldTitle"))$("sharedToldTitle").textContent=p.title||"KUSA FlightOps — Shared TOLD Snapshot";
   if($("sharedToldStamp"))$("sharedToldStamp").textContent=`Snapshot created ${p.generated?new Date(p.generated).toLocaleString():"—"}`;
   if($("sharedToldText"))$("sharedToldText").textContent=p.summary;
   showPlatformView("shared");return true;
 }catch(e){return false}
}
async function shareCurrentMission(){
 const text=currentMissionSummaryText();
 const title=`KUSA FlightOps TOLD — ${cleanICAO($("dep").value)}-${cleanICAO($("dest").value)}`;
 const url=makeToldShareLink(text,title);
 try{
   if(navigator.share){await navigator.share({title,text:"KUSA FlightOps TOLD snapshot",url});return}
   await navigator.clipboard.writeText(`${text}\n\nShared TOLD snapshot: ${url}`);
   alert("TOLD summary and shareable link copied to clipboard.");
 }catch(e){
   if(e&&e.name!=="AbortError")alert("Unable to share automatically. Use Copy TOLD Link, Email, or Print.");
 }
}
function emailCurrentMission(){
 const dep=cleanICAO($("dep").value),dest=cleanICAO($("dest").value);
 const subject=encodeURIComponent(`KUSA FlightOps - Performance + W&B | TOLD | ${dep} to ${dest} | N33AP`);
 const link=makeToldShareLink();
 const body=encodeURIComponent(`KUSA FlightOps - Performance + W&B\nTOLD PACKAGE — N33AP\nRoute: ${dep} → ${dest}\n\n${currentMissionSummaryText()}\n\nSHARED TOLD SNAPSHOT\n${link}\n\nDevelopment / validation only — not approved for flight use.`);
 window.location.href=`mailto:?subject=${subject}&body=${body}`;
}

function captureCurrentPlanState(){
 const dr=selectedRunwayObj("dep"),lr=selectedRunwayObj("dest");
 // Canonicalize baggage at save time so drafts cannot capture a stale 0-lb compartment state
 // when Total Baggage contains the controlling value.
 const enteredBagTotal=Math.max(0,num("totalBag"));
 let savedBaggage=baggageLoadsFromUI();
 const compartmentTotal=savedBaggage.reduce((a,b)=>a+b,0);
 if(Math.abs(enteredBagTotal-compartmentTotal)>0.5){
   savedBaggage=distributeBaggage(enteredBagTotal).stations.map(st=>Math.round(st.load));
 }
 const savedBagTotal=savedBaggage.reduce((a,b)=>a+b,0);
 return{
   dep:cleanICAO($("dep").value),dest:cleanICAO($("dest").value),alt:cleanICAO($("alt").value),
   aircraft:$("homeAircraft")?.value||"N33AP",
note:(window.currentMissionMeta&&window.currentMissionMeta.note)||$("homeTripNote")?.value?.trim()||"",
   captain_weight_lb:num("captWt"),fo_weight_lb:num("foWt"),
   fob_lb:num("fuel"),mission_fuel_lb:num("missionFuel"),taxi_fuel_lb:num("taxiFuel"),
   emer_return_fuel_burn_lb:num("emerReturnBurn"),
   passengers:passengers.map(p=>({...p})),
   seat_assignments:[...seatAssignments],
   baggage:savedBaggage,
   total_baggage_lb:savedBagTotal,
   dep_runway_id:dr?dr.runway_id:null,dest_runway_id:lr?lr.runway_id:null,
   takeoff_condition:$("toRunwayCondition")?.value||"DRY",
   landing_condition:$("landRunwayCondition")?.value||"DRY",
   takeoff_config:$("toConfig")?.value||"S20",
   landing_config:$("landConfig")?.value||"S48",
   landing_anti_ice:$("landAntiIce")?.value||"OFF",
   manual_usable_lda:valueOrNull("manualUsableLda"),
   manual_runway_status:$("manualRunwayStatusOverride")?.value||"",
   manual_notam_note:$("manualNotamNote")?.value||"",
   departure_notam_state:{status:departureNotams.status,source:departureNotams.source,runway_state:departureNotams.runway_state,usable_length_ft:departureNotams.usable_length_ft,checked_at:departureNotams.checked_at},
   destination_notam_state:{status:currentNotams.status,source:currentNotams.source,runway_state:currentNotams.runway_state,usable_length_ft:currentNotams.usable_length_ft,checked_at:currentNotams.checked_at},
   performance_mode:$("perfInputMode")?.value||"LIVE",
   what_if:{
     pa:valueOrNull("manualTOPA"),
     oat:valueOrNull("manualTOTemp"),
     weight:valueOrNull("manualTOWeight"),
     runway_length:valueOrNull("manualTORwyLen")
   },
   manual_weather:JSON.parse(JSON.stringify(manualWeather||{})),
   fob_verified:!!$("fobVerified")?.checked,
   low_fuel_confirmed:!!$("lowFuelConfirm")?.checked
 };
}

function selectArchivedRunway(selectId,runwayId){
 const sel=$(selectId);if(!sel||!runwayId)return;
 const target=String(runwayId).trim().toUpperCase();
 const opts=[...sel.options];
 const ix=opts.findIndex(o=>{
   const val=String(o.value||"").split("|")[1]||"";
   return val.toUpperCase()===target || String(o.textContent||"").trim().toUpperCase().startsWith(target+" ");
 });
 if(ix>=0)sel.selectedIndex=ix;
}

async function restoreArchivedFlightPlan(record,index){
 if(!record)return;
 const s=record.state||{};
 resetMissionForNewTrip();

 $("dep").value=s.dep||record.dep||"";
 $("dest").value=s.dest||record.dest||"";
 $("alt").value=s.alt||record.alt||"";
if($("homeTripNote"))$("homeTripNote").value=s.note||record.note||"";

 if(Number.isFinite(Number(s.captain_weight_lb)))$("captWt").value=s.captain_weight_lb;
 if(Number.isFinite(Number(s.fo_weight_lb)))$("foWt").value=s.fo_weight_lb;
 if(Number.isFinite(Number(s.fob_lb)))$("fuel").value=s.fob_lb;
 if(Number.isFinite(Number(s.mission_fuel_lb)))$("missionFuel").value=s.mission_fuel_lb;
 if(Number.isFinite(Number(s.taxi_fuel_lb)))$("taxiFuel").value=s.taxi_fuel_lb;
 if(Number.isFinite(Number(s.emer_return_fuel_burn_lb)))$("emerReturnBurn").value=s.emer_return_fuel_burn_lb;

 passengers=Array.isArray(s.passengers)?s.passengers.map(p=>({...p})):[];
 seatAssignments=Array.isArray(s.seat_assignments)?[...s.seat_assignments]:Array(9).fill(null);
 $("paxRequested").value=passengers.length;
 renderSeating();

 {
   const savedTotal=Number(s.total_baggage_lb);
   const hasSavedTotal=Number.isFinite(savedTotal)&&savedTotal>=0;
   const savedLoads=Array.isArray(s.baggage)?s.baggage.slice(0,3).map(v=>Number(v)||0):null;
   const loadTotal=savedLoads?savedLoads.reduce((a,b)=>a+b,0):NaN;
   // total_baggage_lb is the recovery value. If an older/stale draft stored zeroed
   // compartments beside a valid total, reconstruct the compartments from the total.
   if(hasSavedTotal && (!savedLoads || Math.abs(savedTotal-loadTotal)>0.5)){
     setBaggageFromTotal(savedTotal);
   }else if(savedLoads){
     ["bagComp0","bagComp1","bagComp2"].forEach((id,i)=>{if($(id))$(id).value=savedLoads[i]||0;});
     syncTotalBagFromCompartments();
   }else{
     setBaggageFromTotal(0);
   }
 }

 if($("toRunwayCondition")&&s.takeoff_condition)$("toRunwayCondition").value=s.takeoff_condition;
 if($("landRunwayCondition")&&s.landing_condition)$("landRunwayCondition").value=s.landing_condition;
 if($("toConfig")&&s.takeoff_config)$("toConfig").value=s.takeoff_config;
 if($("landConfig")&&s.landing_config)$("landConfig").value=s.landing_config;
 if($("landAntiIce")&&s.landing_anti_ice)$("landAntiIce").value=s.landing_anti_ice;

 if($("manualUsableLda"))$("manualUsableLda").value=Number.isFinite(Number(s.manual_usable_lda))?s.manual_usable_lda:"";
 if($("manualRunwayStatusOverride"))$("manualRunwayStatusOverride").value=s.manual_runway_status||"";
 if($("manualNotamNote"))$("manualNotamNote").value=s.manual_notam_note||"";

 if($("fobVerified"))$("fobVerified").checked=false;
 if($("lowFuelConfirm"))$("lowFuelConfirm").checked=false;
 currentNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
 departureNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
 departureObstacleReview={status:"NOT_CHECKED",airport:null,items:[],checked_at:null,message:"FAA NMS departure NOTAM scan only — not a clearance analysis."};

 window.currentMissionMeta={
   id:record.id||newMissionId(),
   aircraft:s.aircraft||record.aircraft||"N33AP",
note:s.note||record.note||"",
   started_at:new Date().toISOString(),
   completed:false,
   reopened_from_archive:true,
   source_archive_index:index
 };

 showPlatformView("ops");
 try{await loadMission()}catch(e){}
 setTimeout(()=>{
   selectArchivedRunway("depRunway",s.dep_runway_id||record.dep_runway);
   selectArchivedRunway("destRunway",s.dest_runway_id||record.dest_runway);
   if(s.departure_notam_state)departureNotams={...departureNotams,...s.departure_notam_state,items:[]};
   if(s.destination_notam_state)currentNotams={...currentNotams,...s.destination_notam_state,items:[]};
   selectedRunwayChanged();
   recalculate();
   updateDepartureRunwayAssessment();updateLandingRunwayAssessment();applyLandingRunwayGateToStatus();
   updateFOBVerifyLabel();
   updateToldCard();
 },300);
}

function buildArchiveRecord(){
 const c=latestCalc||{},dr=selectedRunwayObj("dep"),lr=selectedRunwayObj("dest"),state=captureCurrentPlanState();
 return{
   id:(window.currentMissionMeta&&window.currentMissionMeta.id)||newMissionId(),
   aircraft:"N33AP",
note:(window.currentMissionMeta&&window.currentMissionMeta.note)||state.note||"",
   started_at:(window.currentMissionMeta&&window.currentMissionMeta.started_at)||null,
   completed_at:new Date().toISOString(),
   dep:state.dep,dest:state.dest,alt:state.alt,
   dep_runway:dr?dr.runway_id:null,dest_runway:lr?lr.runway_id:null,
   takeoff_condition:$("toRunwayCondition")?.value||null,landing_condition:$("landRunwayCondition")?.value||null,
   fob_lb:Math.round(num("fuel")),fob_verified:!!$("fobVerified")?.checked,
   mission_fuel_lb:Math.round(num("missionFuel")),
   zfw_lb:Number.isFinite(c.zfw)?Math.round(c.zfw):null,
   ramp_lb:Number.isFinite(c.ramp)?Math.round(c.ramp):null,
   tow_lb:Number.isFinite(c.tow)?Math.round(c.tow):null,
   ldw_lb:Number.isFinite(c.landing)?Math.round(c.landing):null,
   landing_fuel_lb:Number.isFinite(c.landingFuel)?Math.round(c.landingFuel):null,
   takeoff_cg:Number.isFinite(c.takeoffPct)?Number(c.takeoffPct.toFixed(2)):null,
   landing_cg:Number.isFinite(c.landingPct)?Number(c.landingPct.toFixed(2)):null,
   to_status:textOf("toStatus"),ldg_status:textOf("landStatus"),
   notam_status:currentNotams?.status||"NOT_CHECKED",
   summary:currentMissionSummaryText(),
   state
 };
}
function completeMission(){
 const dep=cleanICAO($("dep").value),dest=cleanICAO($("dest").value);
 if(!dep||!dest){alert("Start a flight plan before archiving it.");return}
 const problems=[];
 if(!$("fobVerified")?.checked)problems.push("FOB is not verified");
 if(latestCalc?.lowLandingFuel&&!latestCalc?.lowLandingFuelConfirmed)problems.push("landing fuel below 3,000 lb is not confirmed");
 if(problems.length){
   const ok=confirm("Flight plan has unresolved safety confirmations:\n\n• "+problems.join("\n• ")+"\n\nArchive the flight plan anyway?");
   if(!ok)return;
 }
 const rec=buildArchiveRecord(),arr=getMissionArchive();
 const ix=arr.findIndex(x=>x.id===rec.id);
 if(ix>=0)arr[ix]=rec;else arr.unshift(rec);
 saveMissionArchive(arr.slice(0,100));
 if(window.currentMissionMeta){window.currentMissionMeta.completed=true;removeMissionDraft(window.currentMissionMeta.id)}
 renderArchive();
 alert("Flight plan saved to Archive on this device/browser.");
 showPlatformView("archive");
}

let selectedArchiveFlightPlanIds=new Set();

function updateArchiveSelectionCount(){
 const e=$("archiveSelectionCount");
 if(e)e.textContent=`${selectedArchiveFlightPlanIds.size} selected`;
}

function toggleArchiveFlightPlanSelection(id,checked){
 if(checked)selectedArchiveFlightPlanIds.add(id);
 else selectedArchiveFlightPlanIds.delete(id);
 updateArchiveSelectionCount();
}

function selectAllFlightPlans(){
 selectedArchiveFlightPlanIds=new Set(getMissionArchive().map(m=>m.id));
 renderArchive();
 updateArchiveSelectionCount();
}

function clearFlightPlanSelection(){
 selectedArchiveFlightPlanIds.clear();
 renderArchive();
 updateArchiveSelectionCount();
}

function deleteArchiveFlightPlan(i){
 const arr=getMissionArchive(),m=arr[i];
 if(!m)return;
 const route=`${m.dep||"—"} → ${m.dest||"—"}`;
 if(!confirm(`Delete saved flight plan ${route}? This cannot be undone.`))return;
 selectedArchiveFlightPlanIds.delete(m.id);
 arr.splice(i,1);
 saveMissionArchive(arr);
 renderArchive();
 updateArchiveSelectionCount();
}

function deleteSelectedFlightPlans(){
 if(!selectedArchiveFlightPlanIds.size){
   alert("Select one or more flight plans to delete.");
   return;
 }
 const count=selectedArchiveFlightPlanIds.size;
 if(!confirm(`Delete ${count} selected flight plan${count===1?"":"s"}? This cannot be undone.`))return;
 const remaining=getMissionArchive().filter(m=>!selectedArchiveFlightPlanIds.has(m.id));
 saveMissionArchive(remaining);
 selectedArchiveFlightPlanIds.clear();
 renderArchive();
 updateArchiveSelectionCount();
}


function renderDrafts(){
 const list=$("draftList");if(!list)return;
 const arr=getMissionDrafts();
 if(!arr.length){list.innerHTML='<div class="callout small">No drafts. Start a New Trip and FlightOps will auto-save it here.</div>';return}
 list.innerHTML=arr.map((m,i)=>{const dt=m.updated_at?new Date(m.updated_at).toLocaleString():"—";return `<div class="archive-item"><div class="archive-head"><div><div class="archive-route">${esc(m.dep||"—")} → ${esc(m.dest||"—")}</div><div class="archive-meta">Draft • updated ${dt} • ${esc(m.aircraft||"N33AP")}${m.note?" • "+esc(m.note):""}</div></div><div class="status warn">DRAFT</div></div><div class="archive-actions"><button type="button" class="primary-open" onclick="openDraftFlightPlan(${i})">Resume Draft</button><button type="button" class="archive-delete" onclick="deleteDraftFlightPlan(${i})">Delete Draft</button></div></div>`}).join("");
}
async function openDraftFlightPlan(i){
 const arr=getMissionDrafts(),m=arr[i];if(!m)return;
 await restoreArchivedFlightPlan(m,i);
 const s=m.state||{};
 if(s.manual_weather)manualWeather=JSON.parse(JSON.stringify(s.manual_weather));
 if($("fobVerified"))$("fobVerified").checked=!!s.fob_verified;
 if($("lowFuelConfirm"))$("lowFuelConfirm").checked=!!s.low_fuel_confirmed;
 window.currentMissionMeta={id:m.id||newMissionId(),aircraft:m.aircraft||"N33AP",note:m.note||"",started_at:m.started_at||new Date().toISOString(),completed:false,reopened_from_draft:true};
 updateWeatherSourceBadges();recalculate();updateToldCard();saveCurrentDraft();showPlatformView("ops");
}
function deleteDraftFlightPlan(i){const arr=getMissionDrafts(),m=arr[i];if(!m)return;if(!confirm(`Delete draft ${m.dep||"—"} → ${m.dest||"—"}?`))return;arr.splice(i,1);saveMissionDrafts(arr);renderDrafts()}

function renderArchive(){
 renderDrafts();
 const list=$("archiveList");if(!list)return;
 const arr=getMissionArchive();

 // Remove selections for records that no longer exist.
 const ids=new Set(arr.map(m=>m.id));
 selectedArchiveFlightPlanIds=new Set([...selectedArchiveFlightPlanIds].filter(id=>ids.has(id)));

 if(!arr.length){
   list.innerHTML='<div class="callout small">No completed flight plans yet.</div>';
   updateArchiveSelectionCount();
   return;
 }

 list.innerHTML=arr.map((m,i)=>{
   const dt=m.completed_at?new Date(m.completed_at).toLocaleString():"—";
   const checked=selectedArchiveFlightPlanIds.has(m.id)?"checked":"";
   return `<div class="archive-item">
     <div class="archive-select">
       <input type="checkbox" ${checked} onchange="toggleArchiveFlightPlanSelection('${m.id}',this.checked)">
       <span class="small">Select for bulk action</span>
     </div>
     <div class="archive-head">
       <div>
         <div class="archive-route">${m.dep||"—"} → ${m.dest||"—"}</div>
         <div class="archive-meta">${dt} • ${m.aircraft||"N33AP"}${m.note?" • "+esc(m.note):""}</div>
       </div>
       <div class="status ${String(m.to_status).includes("NO-GO")||String(m.ldg_status).includes("NO-GO")?"bad":"warn"}">${esc(m.to_status||"—")}</div>
     </div>
     <div class="small" style="margin-top:8px">
       TOW ${m.tow_lb==null?"—":Number(m.tow_lb).toLocaleString()+" lb"} •
       Mission fuel ${m.mission_fuel_lb==null?"—":Number(m.mission_fuel_lb).toLocaleString()+" lb"} •
       LDW ${m.ldw_lb==null?"—":Number(m.ldw_lb).toLocaleString()+" lb"} •
       Landing fuel ${m.landing_fuel_lb==null?"—":Number(m.landing_fuel_lb).toLocaleString()+" lb"}
     </div>
     <div class="archive-actions">
       <button type="button" class="primary-open" onclick="openArchiveFlightPlan(${i})">Open / Edit</button>
       <button type="button" onclick="duplicateArchiveFlightPlan(${i})">Duplicate</button>
       <button type="button" onclick="shareArchiveMission(${i})">Share</button>
       <button type="button" onclick="copyArchiveToldLink(${i})">Copy TOLD Link</button>
       <button type="button" onclick="emailArchiveMission(${i})">Email</button>
       <button type="button" onclick="viewArchiveMission(${i})">View TOLD</button>
       <button type="button" class="archive-delete" onclick="deleteArchiveFlightPlan(${i})">Delete</button>
     </div>
   </div>`
 }).join("");
 updateArchiveSelectionCount();
}
async function openArchiveFlightPlan(i){
 const arr=getMissionArchive(),m=arr[i];if(!m)return;
 await restoreArchivedFlightPlan(m,i);
}
function duplicateArchiveFlightPlan(i){
 const arr=getMissionArchive(),m=arr[i];if(!m)return;
 const copy=JSON.parse(JSON.stringify(m));
 copy.id=newMissionId();
copy.completed_at=new Date().toISOString();
 arr.unshift(copy);
 saveMissionArchive(arr.slice(0,100));
 renderArchive();
}
function archiveToldShareLink(m){return makeToldShareLink(m?.summary||"",`N33AP TOLD — ${m?.dep||"—"} → ${m?.dest||"—"}`)}
async function copyArchiveToldLink(i){const m=getMissionArchive()[i];if(!m)return;const link=archiveToldShareLink(m);try{await navigator.clipboard.writeText(link);alert("Completed TOLD snapshot link copied.");}catch(e){prompt("Copy this TOLD snapshot link:",link)}}
async function shareArchiveMission(i){
 const m=getMissionArchive()[i];if(!m)return;const url=archiveToldShareLink(m);
 try{
   if(navigator.share){await navigator.share({title:`KUSA FlightOps ${m.dep}-${m.dest}`,text:"KUSA FlightOps completed TOLD snapshot",url});return}
   await navigator.clipboard.writeText(`${m.summary}\n\nShared TOLD snapshot: ${url}`);alert("Completed TOLD and link copied to clipboard.");
 }catch(e){}
}
function emailArchiveMission(i){
 const m=getMissionArchive()[i];if(!m)return;const link=archiveToldShareLink(m);
 location.href=`mailto:?subject=${encodeURIComponent("KUSA FlightOps - Performance + W&B | TOLD | "+m.dep+" to "+m.dest+" | "+(m.aircraft||"N33AP"))}&body=${encodeURIComponent(`${m.summary}\n\nSHARED TOLD SNAPSHOT\n${link}\n\nDevelopment / validation only — not approved for flight use.`)}`;
}
function viewArchiveMission(i){
 const m=getMissionArchive()[i];if(!m)return;
 alert(m.summary);
}

function textOf(id){const e=$(id);return e&&e.textContent.trim()?e.textContent.trim():"—"}
function selectedRunwayObj(which){
 if(!missionData)return null;
 const dep=which==="dep",sel=$(dep?"depRunway":"destRunway");
 const point=dep?missionData.departure:missionData.destination;
 const arr=point.runways||[];
 const raw=String(sel?.value||"");
 if(!raw)return null;
 const [idxTxt,end]=raw.split("|");
 const base=arr[Number(idxTxt)];
 if(!base)return null;
 const activeEnd=end||String(base.runway_id||"");
 const heading=runwayEndHeading(activeEnd) ?? Number(base.heading);
 return{
   ...base,
   paired_runway_id:String(base.runway_id||""),
   runway_id:activeEnd,
   heading,
   wind_components:runwayWindComponents(point,heading)
 };
}

function hotMaxTakeoffReference(){
 const cfg=$("toConfig")?.value||"S20";
 const ai=$("toAntiIce")?.value||"OFF";
 const runwayCondition=$("toRunwayCondition")?.value||"DRY";
 const pa=perfTakeoffPA();
 const runwayLen=perfTakeoffRunwayLen();
 const structuralMtow=40780;
 const oat=40;
 const out={
   cfg,ai,runwayCondition,pa,runwayLen,oat,
   structuralMtow,maxTow:null,bfl:null,margin:null,
   status:"NOT EVALUATED",limiting:"",note:""
 };

 if(runwayCondition!=="DRY"){
   out.status="SOURCE LOCKED";
   out.note="Wet-runway 40°C reference is not available from the validated source set.";
   return out;
 }
 if(!Number.isFinite(pa)||!Number.isFinite(runwayLen)||runwayLen<=0){
   out.status="NOT AVAILABLE";
   out.note="Departure pressure altitude or runway length is unavailable.";
   return out;
 }

 // Find highest weight inside the published/digitized source grid whose
 // BFL is <= the selected runway. No extrapolation.
 const d=FS_PERF.takeoff[cfg];
 if(!d){
   out.status="SOURCE LOCKED";
   out.note="Takeoff source table unavailable.";
   return out;
 }

 let lookupPA=pa;
 const minPA=Math.min(...kN(d.tables));
 if(pa<minPA&&minPA===0&&pa>=-1000)lookupPA=0;

 const paBracket=bracketN(kN(d.tables),lookupPA);
 if(!paBracket){
   out.status="SOURCE LOCKED";
   out.note="40°C pressure altitude is outside published/digitized source coverage.";
   return out;
 }

 // Determine the highest source-supported weight at 40°C for both PA rows.
 function supportedWeightAtPA(p){
   const wm=d.tables[p];
   const weights=kN(wm).filter(w=>{
     const tm=wm[w];
     return !!bracketN(kN(tm),oat);
   });
   return weights.length?Math.max(...weights):null;
 }
 const [pa1,pa2]=paBracket;
 const maxW1=supportedWeightAtPA(pa1), maxW2=supportedWeightAtPA(pa2);
 const sourceMaxK=Math.min(
   Number.isFinite(maxW1)?maxW1:Infinity,
   Number.isFinite(maxW2)?maxW2:Infinity
 );
 if(!Number.isFinite(sourceMaxK)){
   out.status="SOURCE LOCKED";
   out.note="No 40°C BFL source coverage exists at the selected pressure altitude.";
   return out;
 }

 const sourceMaxLb=Math.min(structuralMtow,sourceMaxK*1000);

 // Check the highest source-supported weight first.
 const top=takeoffAt(cfg,pa,oat,sourceMaxLb);
 if(!top||!Number.isFinite(top.bfl)){
   out.status="SOURCE LOCKED";
   out.note="40°C maximum-weight source point cannot be evaluated without extrapolation.";
   return out;
 }

 if(top.bfl<=runwayLen){
   out.maxTow=sourceMaxLb;
   out.bfl=top.bfl;
   out.margin=runwayLen-top.bfl;
   out.status="PASS";
   out.limiting=sourceMaxLb>=structuralMtow?"STRUCTURAL MTOW":"SOURCE-COVERAGE MAX";
   out.note=`40°C • ${out.limiting} • same selected runway / PA / ${FS_PERF.takeoff[cfg]?.label||cfg}`;
   return out;
 }

 // Solve field-limited maximum within valid source coverage.
 const minSourceK=Math.max(...paBracket.map(p=>Math.min(...kN(d.tables[p]))));
 let lo=minSourceK*1000, hi=sourceMaxLb;
 const loR=takeoffAt(cfg,pa,oat,lo);
 if(!loR||!Number.isFinite(loR.bfl)||loR.bfl>runwayLen){
   out.status="NO-GO";
   out.note="Runway is shorter than the 40°C BFL even at the lowest source-supported weight.";
   return out;
 }

 for(let n=0;n<35;n++){
   const mid=(lo+hi)/2;
   const r=takeoffAt(cfg,pa,oat,mid);
   if(!r||!Number.isFinite(r.bfl)){hi=mid;continue}
   if(r.bfl<=runwayLen)lo=mid; else hi=mid;
 }
 const solved=Math.floor(lo);
 const rr=takeoffAt(cfg,pa,oat,solved);
 if(!rr||!Number.isFinite(rr.bfl)){
   out.status="SOURCE LOCKED";
   out.note="40°C field-limit solver could not resolve a published-source point.";
   return out;
 }

 out.maxTow=solved;
 out.bfl=rr.bfl;
 out.margin=runwayLen-rr.bfl;
 out.status="PASS";
 out.limiting="FIELD LIMITED";
 out.note=`40°C • FIELD LIMITED • same selected runway / PA / ${FS_PERF.takeoff[cfg]?.label||cfg}`;
 return out;
}

function updateToldCard(){
 const c=latestCalc||{};
 const depCode=$("dep").value.toUpperCase().trim()||"—",destCode=$("dest").value.toUpperCase().trim()||"—";
 const dr=selectedRunwayObj("dep"),lr=selectedRunwayObj("dest");
 const dw=dr&&dr.wind_components||{},lw=lr&&lr.wind_components||{};
 const temp=perfIsManual()?perfTakeoffTemp():depTempC();
 $("toldRoute").textContent=`${depCode} → ${destCode}${perfIsManual()?" • MANUAL PERFORMANCE PLAN":""}`;
 $("toldDateTime").textContent=`Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
 const altCode=$("alt").value.toUpperCase().trim();
 let bagLoads=baggageLoadsFromUI();
 let bagTotal=bagLoads.reduce((a,b)=>a+b,0);
 const enteredBagTotal=Math.max(0,num("totalBag"));
 // Defensive synchronization: TOLD must never show 0 when Mission shows a nonzero total.
 // Normally the input handlers keep these equal; this also repairs restored/programmatically loaded states.
 if(Math.abs(enteredBagTotal-bagTotal)>0.5){
   setBaggageFromTotal(enteredBagTotal);
   bagLoads=baggageLoadsFromUI();
   bagTotal=bagLoads.reduce((a,b)=>a+b,0);
 }
 const seated=seatAssignments.filter(Boolean).length;
 const counts={male:0,female:0,child:0};
 const seatText=[];
 seatAssignments.forEach((pid,i)=>{
   if(!pid)return;
   const p=getPassenger(pid);
   if(!p)return;
   counts[p.type]=(counts[p.type]||0)+1;
   const short=p.type==="male"?"M":p.type==="female"?"F":"C";
   seatText.push(`${seats[i].n}:${short}`);
 });
 const fob=Math.max(0,num("fuel")),taxi=Math.max(0,num("taxiFuel")),missionFuel=Math.max(0,num("missionFuel"));
 const fobVerified=!!$("fobVerified")?.checked && fob>0;
 const seatMatch=passengers.length===seated;
 const runwayReady=!!dr&&!!lr;

 $("toldPrepRoute").textContent=`${depCode} → ${destCode}`;
 $("toldPrepAlternate").textContent=`Alternate ${altCode||"—"}`;
 $("toldPrepPax").textContent=`${seated} seated`;
 $("toldPrepPaxBreakdown").textContent=`M ${counts.male||0} • F ${counts.female||0} • C ${counts.child||0}`;
 $("toldPrepBagTotal").textContent=`${Math.round(bagTotal).toLocaleString()} lb`;
 $("toldPrepBagSplit").textContent=`I ${Math.round(bagLoads[0]||0)} • II ${Math.round(bagLoads[1]||0)} • III ${Math.round(bagLoads[2]||0)} lb`;
 $("toldCaptain").textContent=`${Math.round(num("captWt")).toLocaleString()} lb`;
 $("toldFO").textContent=`${Math.round(num("foWt")).toLocaleString()} lb`;
 $("toldSeatSummary").textContent=seatText.length?seatText.join(" • "):"No passengers";
 $("toldSeatCheck").textContent=seatMatch?"MATCH":"MISMATCH";
 $("toldPrepFOB").textContent=`${Math.round(fob).toLocaleString()} lb`;
 $("toldPrepFOBStatus").textContent=fobVerified?"VERIFIED":"NOT VERIFIED";
 $("toldPrepTaxi").textContent=`${Math.round(taxi).toLocaleString()} lb`;
 $("toldPrepMissionFuel").textContent=`${Math.round(missionFuel).toLocaleString()} lb`;
 $("toldPrepLandingFuel").textContent=Number.isFinite(c.landingFuel)?`${Math.round(c.landingFuel).toLocaleString()} lb`:"—";
 $("toldPrepFuelGate").textContent=textOf("landingFuelGuardStatus");
 $("toldPrepZFW").textContent=Number.isFinite(c.zfw)?`${Math.round(c.zfw).toLocaleString()} lb`:"—";
 $("toldPrepRamp").textContent=Number.isFinite(c.ramp)?`${Math.round(c.ramp).toLocaleString()} lb`:"—";
 $("toldPrepTOW").textContent=Number.isFinite(c.tow)?`${Math.round(c.tow).toLocaleString()} lb`:"—";
 $("toldPrepLDW").textContent=Number.isFinite(c.landing)?`${Math.round(c.landing).toLocaleString()} lb`:"—";
 $("toldPrepTOCG").textContent=Number.isFinite(c.takeoffPct)?`${c.takeoffPct.toFixed(2)}% MAC`:"—";
 $("toldPrepLDGCG").textContent=Number.isFinite(c.landingPct)?`${c.landingPct.toFixed(2)}% MAC`:"—";
 $("toldPrepWB").textContent=`W&B ${c.wbOK?"READY":"CHECK"}`;
 $("toldPrepWB").className=`told-pill ${c.wbOK?"ok":"bad"}`;
 const fuelReady=fobVerified && (!c.lowLandingFuel || c.lowLandingFuelConfirmed);
 $("toldPrepFuel").textContent=`FUEL ${fuelReady?"VERIFIED":"CHECK"}`;
 $("toldPrepFuel").className=`told-pill ${fuelReady?"ok":"bad"}`;
 $("toldPrepRunways").textContent=`RUNWAYS ${runwayReady?"LOADED":"CHECK"}`;
 $("toldPrepRunways").className=`told-pill ${runwayReady?"ok":"warn"}`;
 $("toldPrepGenerated").textContent=`UPDATED ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;

 $("toldDepRwy").textContent=`${depCode} / ${dr?dr.runway_id:"—"}`;
 const depRunwayEval=effectiveDepartureRunwayAssessment();
 $("toldDepSurface").textContent=`${Number.isFinite(depRunwayEval.usable)?Math.round(depRunwayEval.usable).toLocaleString()+" ft":(perfIsManual()&&perfTakeoffRunwayLen()?Number(perfTakeoffRunwayLen()).toLocaleString()+" ft":(dr&&dr.length_ft?Number(dr.length_ft).toLocaleString()+" ft":"—"))} / ${$("toRunwayCondition")?$("toRunwayCondition").value:"DRY"}`;
 $("toldDepWind").textContent=dr?`HW ${esc(dw.headwind_kt)} • TW ${esc(dw.tailwind_kt)} • XW ${esc(dw.crosswind_kt)} kt`:"—";
 $("toldDepWx").textContent=`${temp==null?"—":temp+"°C"} / ${Number.isFinite(perfTakeoffPA())?Math.round(perfTakeoffPA()).toLocaleString()+" ft":"—"}`;
 if($("toldDepWxSource"))$("toldDepWxSource").textContent=formatWeatherSource("dep");
 $("toldTOW").textContent=perfIsManual()&&Number.isFinite(perfTakeoffWeightLb())?Math.round(perfTakeoffWeightLb()).toLocaleString()+" lb":(Number.isFinite(c.tow)?Math.round(c.tow).toLocaleString()+" lb":"—");
 $("toldFOBVerify").textContent=`${Math.round(num("fuel")).toLocaleString()} lb • ${$("fobVerified")?.checked?"VERIFIED":"NOT VERIFIED"}`;
 $("toldTOCG").textContent=perfIsManual()?"W&B CG UNCHANGED":(Number.isFinite(c.takeoffPct)?`${c.takeoffPct.toFixed(2)}% MAC`:"—");
 $("toldTOConfig").textContent=FS_PERF.takeoff[$("toConfig").value]?.label||"—";
 $("toldBFL").textContent=$("perfBFL").value?Number($("perfBFL").value).toLocaleString()+" ft":"SOURCE LOCKED";
 const hotMax=hotMaxTakeoffReference();
 if($("toldHotMaxTow")){
   $("toldHotMaxTow").textContent=Number.isFinite(hotMax.maxTow)
     ?`${Math.round(hotMax.maxTow).toLocaleString()} lb • ${hotMax.limiting||hotMax.status}`
     :hotMax.status;
 }
 if($("toldHotMaxBFL")){
   $("toldHotMaxBFL").textContent=Number.isFinite(hotMax.bfl)
     ?`${Math.round(hotMax.bfl).toLocaleString()} ft • ${hotMax.status}`
     :hotMax.status;
 }
 if($("toldHotMaxMargin")){
   $("toldHotMaxMargin").textContent=Number.isFinite(hotMax.margin)
     ?`${Math.round(hotMax.margin).toLocaleString()} ft`
     :"—";
 }
 if($("toldStructuralMTOW"))$("toldStructuralMTOW").textContent="40,780 lb";
 $("toldMaxTOW").textContent=textOf("toMax");
 $("toldTORwyMargin").textContent=textOf("toRwyMargin");
 if($("toldClimbTOW"))$("toldClimbTOW").textContent=$("perfClimbWt")?.value?Number($("perfClimbWt").value).toLocaleString()+" lb":"SOURCE LOCKED";
 if($("toldSecondSegment")){const g=valueOrNull("perfGrad");$("toldSecondSegment").textContent=Number.isFinite(g)?`${g.toFixed(2)}% • OEI • QRH REFERENCE`:"SOURCE LOCKED";}
 $("toldTOStatus").textContent=textOf("toStatus");
 $("toldV1").textContent=textOf("vsV1");
 $("toldVR").textContent=textOf("vsVR");
 $("toldVfr").textContent=textOf("vsVFT");
 $("told15Vs").textContent=textOf("vsVFS");
 $("toldEmerVref").textContent=textOf("vsVREF");

 $("toldDestRwy").textContent=`${destCode} / ${lr?lr.runway_id:"—"}`;
 $("toldDestSurface").textContent=`${lr&&lr.length_ft?Number(lr.length_ft).toLocaleString()+" ft":"—"} / ${$("landRunwayCondition")?$("landRunwayCondition").value:"DRY"}`;
 $("toldDestWind").textContent=lr?`HW ${esc(lw.headwind_kt)} • TW ${esc(lw.tailwind_kt)} • XW ${esc(lw.crosswind_kt)} kt`:"—";
 $("toldDestPA").textContent=missionData&&Number.isFinite(Number(missionData.destination.pressure_altitude_ft))?Math.round(Number(missionData.destination.pressure_altitude_ft)).toLocaleString()+" ft":"—";
 if($("toldDestWxSource"))$("toldDestWxSource").textContent=formatWeatherSource("dest");
 $("toldLDW").textContent=Number.isFinite(c.landing)?Math.round(c.landing).toLocaleString()+" lb":"—";
 $("toldLandingFuel").textContent=Number.isFinite(c.landingFuel)?Math.round(c.landingFuel).toLocaleString()+" lb":"—";
 $("toldLDGCG").textContent=Number.isFinite(c.landingPct)?`${c.landingPct.toFixed(2)}% MAC`:"—";
 $("toldLDGConfig").textContent=`${FS_PERF.landing[$("landConfig").value]?.label||"—"} • A/I ${$("landAntiIce")?.value||"OFF"}`;
 $("toldVref").textContent=$("landVref").value?Number($("landVref").value).toFixed(1)+" kt":"SOURCE LOCKED";
 $("toldLFL").textContent=$("landFieldLen").value?Number($("landFieldLen").value).toLocaleString()+" ft":"SOURCE LOCKED";
 const landAssess=effectiveLandingRunwayAssessment();
 $("toldPublishedLDA").textContent=Number.isFinite(landAssess.published)?`${Math.round(landAssess.published).toLocaleString()} ft`:"—";
 $("toldUsableLDA").textContent=Number.isFinite(landAssess.usable)?`${Math.round(landAssess.usable).toLocaleString()} ft`:"—";
 $("toldNotamStatus").textContent=currentNotams.status==="CHECKED"?"CHECKED":(currentNotams.status==="UNAVAILABLE"?"MANUAL VERIFY":"NOT CHECKED");
 $("toldRunwayState").textContent=landAssess.state||"—";
 $("toldMaxLDW").textContent=textOf("landMax");
 $("toldLdgRwyMargin").textContent=textOf("landRwyMargin");
 $("toldFuelGate").textContent=textOf("landingFuelGuardStatus");
 $("toldLDGStatus").textContent=textOf("landStatus");

 const lowFuel=Number.isFinite(c.landingFuel)&&c.landingFuel<3000;
 const confirmed=$("lowFuelConfirm")?.checked;
 const issues=[];
 if(passengers.length!==seatAssignments.filter(Boolean).length)issues.push("PASSENGER SEATING CHECK REQUIRED");
 if(!dr||!lr)issues.push("RUNWAY SELECTION REQUIRED");
 if(currentNotams.status!=="CHECKED")issues.push("NOTAM VERIFICATION REQUIRED");
 const obs=departureObstacleReview||{status:"NOT_CHECKED",items:[]};
 if(obs.status==="FLAGGED")issues.push(`AUTO OBSTACLE REVIEW: ${obs.items.length} OBSTACLE NOTAM${obs.items.length===1?"":"S"} FLAGGED`);
 else if(obs.status!=="REVIEWED")issues.push("AUTO OBSTACLE NOTAM REVIEW REQUIRED");
 if($("perfObs")?.value==="false")issues.push("PILOT OBSTACLE CONFLICT RECORDED");
 if(!$("fobVerified")?.checked)issues.push("FOB VERIFICATION REQUIRED");
 if(lowFuel&&!confirmed)issues.push("LOW LANDING FUEL CONFIRMATION REQUIRED");
 const ts=textOf("toStatus");
 if(ts.includes("PENDING")||ts.includes("LOCKED"))issues.push("TAKEOFF PERFORMANCE REVIEW REQUIRED");
 else if(ts.includes("PERFORMANCE PASS")&&obs.status!=="REVIEWED")issues.push("TAKEOFF PERFORMANCE EVALUATED • AUTO OBSTACLE REVIEW INCOMPLETE");
 if(textOf("landStatus").includes("PENDING")||textOf("landStatus").includes("LOCKED"))issues.push("LANDING LIMITS NOT FULLY EVALUATED");
 $("toldOverall").textContent=issues.length?issues.join(" • "):"AIRCRAFT PREP / TOLD SUMMARY CURRENT — review all values before use.";
 $("toldOverall").className=issues.length?"callout small warn":"callout small ok";
}
const esc=x=>x==null?"—":x;
function pctMacFromArm(arm){return 25+arm/1.1177}
function interp(p,w){if(w<=p[0][0])return p[0][1];if(w>=p[p.length-1][0])return p[p.length-1][1];for(let i=0;i<p.length-1;i++){let a=p[i],b=p[i+1];if(w>=a[0]&&w<=b[0])return a[1]+(b[1]-a[1])*(w-a[0])/(b[0]-a[0])}}

function setPassengerCount(){
 const requested=Math.max(0,Math.min(9,Math.round(num("paxRequested"))));
 $("paxRequested").value=requested;

 const oldPassengers=passengers.slice();
 passengers=[];
 for(let i=0;i<requested;i++){
   const existing=oldPassengers[i];
   passengers.push(existing?{...existing,id:i+1}:{id:i+1,type:"male",weight:180});
 }
 seatAssignments=Array(9).fill(null);
 passengers.forEach((p,i)=>{seatAssignments[i]=p.id});
 renderSeating();
 recalculate();
}
function fuelMomentThousand(fuelLb){
 const f=Math.max(0,Math.min(maxFuel,Number(fuelLb)||0));
 for(let i=0;i<fuelMomentSchedule.length;i++){
   const [w,m]=fuelMomentSchedule[i];
   if(f===w)return m;
   if(f<w){
     const [w0,m0]=fuelMomentSchedule[i-1];
     return m0+(m-m0)*(f-w0)/(w-w0);
   }
 }
 return fuelMomentSchedule[fuelMomentSchedule.length-1][1];
}
function fuelMomentLbIn(fuelLb){return fuelMomentThousand(fuelLb)*1000}


function getPassenger(id){return passengers.find(p=>p.id===id)||null}
function getUnseatedPassengers(){
 const seated=new Set(seatAssignments.filter(Boolean));
 return passengers.filter(p=>!seated.has(p.id));
}
function seatForPax(id){return seatAssignments.findIndex(x=>x===id)}

function seatTapped(index){
 const occupantId=seatAssignments[index];
 if(occupantId){
   seatAssignments[index]=null;
   $("seatActionMessage").textContent=`PAX ${occupantId} removed from Seat ${index+1}. Tap an empty seat to place an unseated passenger.`;
 }else{
   const unseated=getUnseatedPassengers();
   if(!unseated.length){
     $("seatActionMessage").textContent="No unseated passengers available. Tap an occupied seat first to move someone.";
     return;
   }
   const p=unseated[0];
   seatAssignments[index]=p.id;
   $("seatActionMessage").textContent=`PAX ${p.id} placed in Seat ${index+1}.`;
 }
 renderSeating();
 recalculate();
}

function seatTypeChanged(index){
 const pid=seatAssignments[index],p=pid?getPassenger(pid):null;if(!p)return;
 const sel=$("seatType"+index);if(!sel)return;
 p.type=sel.value;
 p.weight=paxDefaults[p.type];
 renderSeating();
 recalculate();
}
function updatePassengerData(){
 document.querySelectorAll(".seat-type-select[data-seat-type-index]").forEach(sel=>{
   const i=+sel.dataset.seatTypeIndex,pid=seatAssignments[i],p=pid?getPassenger(pid):null;
   if(p){p.type=sel.value;p.weight=paxDefaults[p.type]}
 });
 renderSeating();recalculate();
 $("seatActionMessage").textContent="Passenger selections updated.";
}

function renderSeating(){
 const unseated=getUnseatedPassengers();
 document.querySelectorAll(".tap-seat[data-seat-index]").forEach(btn=>{
   const i=+btn.dataset.seatIndex;
   const pid=seatAssignments[i];
   const p=pid?getPassenger(pid):null;
   btn.classList.toggle("occupied",!!p);
   btn.classList.toggle("unseated-target",!p&&unseated.length>0);
   $("seatOccupant"+i).textContent=p?`PAX ${p.id} • ${paxLabels[p.type]} • ${p.weight} lb`:"EMPTY";
   btn.setAttribute("aria-label",p?`Seat ${i+1}, Passenger ${p.id}, tap to remove`:`Seat ${i+1}, empty, tap to place passenger`);
   const sel=$("seatType"+i);
   if(sel){sel.disabled=!p;if(p)sel.value=p.type;else sel.value="male"}
 });

 $("unseatedPool").innerHTML="";
 if(!unseated.length){
   $("unseatedPool").innerHTML='<span class="small">None</span>';
   if(passengers.length) $("seatActionMessage").textContent="All entered passengers are seated.";
 }else{
   unseated.forEach(p=>{
     const chip=document.createElement("span");
     chip.className="pax-chip";
     chip.textContent=`PAX ${p.id} • ${paxLabels[p.type]} • ${p.weight} lb`;
     $("unseatedPool").appendChild(chip);
   });
 }
}

function distributeBaggage(total){
 let remaining=Math.max(0,total),out=[];
 baggageStations.forEach(s=>{const load=Math.min(remaining,s.limit);out.push({...s,load});remaining-=load});
 return{stations:out,overflow:remaining};
}
function baggageLoadsFromUI(){
 return baggageStations.map((s,i)=>{
   const el=$("bagComp"+i);
   const raw=Number(el&&el.value!==""?el.value:0);
   const load=Math.max(0,Math.min(s.limit,Number.isFinite(raw)?raw:0));
   if(el&&String(load)!==String(raw))el.value=load;
   return load;
 });
}
function syncTotalBagFromCompartments(){
 const loads=baggageLoadsFromUI();
 const total=loads.reduce((a,b)=>a+b,0);
 $("totalBag").value=Math.round(total);
 $("bagStatusNote").textContent=`Total loaded baggage ${Math.round(total).toLocaleString()} / 2,205 lb`;
 return total;
}
function setBaggageFromTotal(total){
 const dist=distributeBaggage(total);
 dist.stations.forEach((s,i)=>{$("bagComp"+i).value=Math.round(s.load)});
 syncTotalBagFromCompartments();
 return dist;
}
function onTotalBagInput(){
 setBaggageFromTotal(Math.max(0,num("totalBag")));
 recalculate();
}
function onBaggageCompInput(){
 syncTotalBagFromCompartments();
 recalculate();
}
function drawTrace(zfwW,zfwCG,path,toW,toCG,ldW,ldCG){
 const c=$("cgChart");if(!c)return;
 const W=c.clientWidth;
 // Do not erase the canvas while the Mission view is hidden (clientWidth=0).
 // It will be redrawn when the Mission view becomes visible again.
 if(!Number.isFinite(W)||W<120)return;
 const dpr=devicePixelRatio||1,H=320;c.width=W*dpr;c.height=H*dpr;
 const x=c.getContext("2d");x.scale(dpr,dpr);x.clearRect(0,0,W,H);

 const minW=18000,maxW=41000,minCG=10,maxCG=35;
 const px=v=>45+(v-minCG)/(maxCG-minCG)*(W-70);
 const py=v=>H-35-(v-minW)/(maxW-minW)*(H-60);

 x.strokeStyle="#2a4b70";x.fillStyle="#9db6cf";x.font="11px Arial";
 for(let ww=20000;ww<=40000;ww+=5000){
   x.fillText(ww.toLocaleString(),4,py(ww)+4);
   x.beginPath();x.moveTo(40,py(ww));x.lineTo(W-20,py(ww));x.stroke();
 }
 // Structural maximum takeoff weight reference
 x.save();
 x.strokeStyle="#ff6b6b";x.lineWidth=2;x.setLineDash([8,5]);
 x.beginPath();x.moveTo(40,py(maxTO));x.lineTo(W-20,py(maxTO));x.stroke();
 x.setLineDash([]);x.fillStyle="#ffb0b0";x.font="bold 11px Arial";
 x.fillText(`MTOW ${maxTO.toLocaleString()} lb`,Math.max(45,W-160),py(maxTO)-6);
 x.restore();
 for(let cg=10;cg<=35;cg+=5){
   x.fillText(String(cg),px(cg)-5,H-12);
   x.beginPath();x.moveTo(px(cg),18);x.lineTo(px(cg),H-30);x.stroke();
 }
 x.fillText("% MAC",W-58,H-12);

 x.strokeStyle="#ffca58";x.lineWidth=2;x.beginPath();
 fwd.forEach((p,i)=>i?x.lineTo(px(p[1]),py(p[0])):x.moveTo(px(p[1]),py(p[0])));
 x.stroke();

 x.strokeStyle="#55d18b";x.beginPath();
 aft.forEach((p,i)=>i?x.lineTo(px(p[1]),py(p[0])):x.moveTo(px(p[1]),py(p[0])));
 x.stroke();

 if(Array.isArray(path)&&path.length>1){
   x.strokeStyle="#8fd3ff";x.lineWidth=3;x.beginPath();
   path.forEach((p,i)=>i?x.lineTo(px(p.pct),py(p.weight)):x.moveTo(px(p.pct),py(p.weight)));
   x.stroke();
 }

 if(Number.isFinite(toW)&&Number.isFinite(toCG)){
   x.fillStyle="#8fd3ff";x.beginPath();x.arc(px(toCG),py(toW),7,0,Math.PI*2);x.fill();
   x.fillStyle="#d6e7f8";x.font="bold 11px Arial";x.fillText("TO",px(toCG)+9,py(toW)-8);
 }
 if(Number.isFinite(ldW)&&Number.isFinite(ldCG)){
   x.fillStyle="#55d18b";x.beginPath();x.arc(px(ldCG),py(ldW),7,0,Math.PI*2);x.fill();
   x.fillStyle="#d6e7f8";x.font="bold 11px Arial";x.fillText("LDG",px(ldCG)+9,py(ldW)-8);
 }
 if(Number.isFinite(zfwW)&&Number.isFinite(zfwCG)){
   x.fillStyle="#edf5ff";x.beginPath();x.arc(px(zfwCG),py(zfwW),4,0,Math.PI*2);x.fill();
   x.font="10px Arial";x.fillText("ZFW",px(zfwCG)+8,py(zfwW)+14);
 }
}

function redrawCgEnvelope(){
 const c=latestCalc||{};
 if(!Number.isFinite(c.zfw)||!Number.isFinite(c.pct))return;
 drawTrace(c.zfw,c.pct,c.burnPath,c.tow,c.takeoffPct,c.landing,c.landingPct);
}

function rawMetarText(point){
 const m=point&&point.metar||{};
 return String(firstVal(m,["raw","rawOb","raw_text","rawText"])||"").toUpperCase();
}
function precipitationReported(point){
 const raw=rawMetarText(point);
 return /(^|\s)([-+]?RA|[-+]?SN|[-+]?DZ|SHRA|SHSN|TSRA|FZRA|FZDZ)(\s|$)/.test(raw);
}
function updateRunwayConditionWarnings(){
 const wetSel=$("toRunwayCondition").value==="WET";
 const precip=missionData?precipitationReported(missionData.departure):false;
 if(precip && !wetSel){
   $("toWxRunwayCheck").textContent="PRECIP REPORTED • VERIFY DRY/WET";
   $("toWxRunwayCheck").className="warn";
   $("toWxRunwayNote").textContent="METAR precipitation does not automatically set runway condition; pilot confirmation required.";
 }else if(precip && wetSel){
   $("toWxRunwayCheck").textContent="PRECIP REPORTED • WET SELECTED";
   $("toWxRunwayCheck").className="ok";
   $("toWxRunwayNote").textContent="Pilot has confirmed WET selection. Wet-specific BFL/V1 remain source-locked until wet charts are digitized.";
 }else{
   $("toWxRunwayCheck").textContent=wetSel?"WET SELECTED":"NO PRECIP FLAG";
   $("toWxRunwayCheck").className=wetSel?"warn":"ok";
   $("toWxRunwayNote").textContent=wetSel?"WET is pilot-selected; do not infer dry from absence of precipitation.":"Pilot selection controls performance.";
 }
 const lwet=$("landRunwayCondition").value==="WET";
 $("landSurfaceStatus").textContent=lwet?"WET":"DRY";
 $("landSurfaceStatus").className=lwet?"warn":"ok";
 $("landSurfaceNote").textContent=lwet?"Wet landing factor/method is not automatically applied until operator method is defined.":"Pilot-confirmed dry runway.";
}



function qrhCellGradient(cfg,ai,pa,temp,weightLb){
 const ptab=QRH_CLIMB_GCLB2?.[cfg]?.[ai]?.[String(pa)];
 if(!ptab)return null;
 const weights=kN(ptab);
 const wb=bracketN(weights,weightLb);
 if(!wb)return null;

 function atWeight(w){
   const tm=ptab[String(w)];
   if(!tm)return null;
   const temps=kN(tm);
   const tb=bracketN(temps,temp);
   if(!tb)return null;
   const [ta,tb2]=tb;
   // QRH JSON temperature keys are stored as strings such as "30.0".
   // Numeric interpolation converts them to 30, so direct tm[String(30)] would
   // miss the published key. Resolve keys numerically to preserve source data.
   const valAtTemp=(t)=>{
     const k=Object.keys(tm).find(key=>Number(key)===Number(t));
     return k==null?null:Number(tm[k]);
   };
   const A=valAtTemp(ta),B=valAtTemp(tb2);
   if(!Number.isFinite(A)||!Number.isFinite(B))return null;
   if(ta===tb2)return A;
   return lerpN(A,B,(temp-ta)/(tb2-ta));
 }
 const [wa,wb2]=wb,A=atWeight(wa),B=atWeight(wb2);
 if(!Number.isFinite(A)||!Number.isFinite(B))return null;
 if(wa===wb2)return A;
 return lerpN(A,B,(weightLb-wa)/(wb2-wa));
}

function qrhGradientAt(cfg,ai,pa,temp,weightLb){
 const ptab=QRH_CLIMB_GCLB2?.[cfg]?.[ai];
 if(!ptab||![pa,temp,weightLb].every(Number.isFinite))return null;

 // QRH takeoff climb tables begin at 0 ft PA. For actual PA below sea level,
 // use the 0-ft table conservatively rather than extrapolating below the chart.
 const paUsed=pa<0?0:pa;
 const pas=kN(ptab);
 if(paUsed>Math.max(...pas))return null;

 const pb=bracketN(pas,paUsed);
 if(!pb)return null;
 const [pa1,pa2]=pb;
 const A=qrhCellGradient(cfg,ai,pa1,temp,weightLb);
 const B=qrhCellGradient(cfg,ai,pa2,temp,weightLb);
 if(!Number.isFinite(A)||!Number.isFinite(B))return null;
 if(pa1===pa2)return A;
 return lerpN(A,B,(paUsed-pa1)/(pa2-pa1));
}

function autoClimbAssessment(){
 const cfg=$("toConfig").value,ai=$("toAntiIce")?.value||"OFF";
 const pa=perfTakeoffPA(),temp=perfTakeoffTemp(),actual=perfTakeoffWeightLb();
 const result={cfg,ai,pa,temp,actual,gradient:null,limit:null,pass:null,noLimitation:false,coverageLimited:false,sourceControlled:true,msg:""};
 $("perfClimbWt").value="";
 if(![pa,temp,actual].every(Number.isFinite)||actual<=0){
   $("perfGrad").value="";
   result.msg="Mission pressure altitude, OAT and takeoff weight required. FTA-PA-001019 Rev C controls Dash-4 climb.";
   return result;
 }
 const af=afmsRevCTakeoffClimbLimit(cfg,ai,pa,temp);
 result.limit=af.limit; result.noLimitation=af.noLimitation; result.coverageLimited=af.coverageLimited;
 if(Number.isFinite(af.limit)){
   result.pass=actual<=af.limit;
   $("perfClimbWt").value=Math.round(af.limit);
 }
 // Keep legacy QRH gradient visible strictly as a cross-check/reference; it does not set the limit.
 const g=qrhGradientAt(cfg,ai,pa,temp,actual);
 if(Number.isFinite(g)){result.gradient=g;$("perfGrad").value=g.toFixed(2);}else $("perfGrad").value="";
 const ref=Number.isFinite(g)?` • QRH REF GCLB2 ${g.toFixed(2)}%`:"";
 if(Number.isFinite(af.limit)){
   result.msg=`AFMS CLIMB ACTIVE • ${af.source} • ${cfg==="S20"?"S+F 20°":"SLATS"} • A/I ${ai} • CLIMB LIMIT ${Math.round(af.limit).toLocaleString()} lb${af.noLimitation?" (STRUCTURAL MTOW GOVERNS)":""} • ${af.basis}${ref}`;
 }else{
   result.msg=`AFMS CLIMB DATA OUTSIDE SOURCE COVERAGE • ${af.source} • ${af.basis||"outside bounded digitized chart coverage"} • NO EXTRAPOLATION${ref}`;
 }
 return result;
}

function takeoffFieldSourceCeilingLb(cfg,pa,temp){
 const d=FS_PERF.takeoff[cfg];
 if(!d||![pa,temp].every(Number.isFinite))return null;
 let lookupPA=pa;
 const pas=kN(d.tables),minPA=Math.min(...pas);
 if(pa<minPA&&minPA===0&&pa>=-1000)lookupPA=0;
 const pb=bracketN(pas,lookupPA);
 if(!pb)return null;
 function maxSupportedAtPA(p){
   const wm=d.tables[p];
   const supported=kN(wm).filter(w=>bracketN(kN(wm[w]),temp));
   return supported.length?Math.max(...supported)*1000:null;
 }
 const vals=pb.map(maxSupportedAtPA);
 if(vals.some(v=>!Number.isFinite(v)))return null;
 return Math.min(maxTO,...vals);
}

function autoFieldLimitedWeight(){
 const cfg=$("toConfig").value;
 const runwayCondition=$("toRunwayCondition")?.value||"DRY";
 const pa=perfTakeoffPA(),temp=perfTakeoffTemp(),rwy=perfTakeoffRunwayLen();
 if(runwayCondition!=="DRY"||!Number.isFinite(pa)||!Number.isFinite(temp)||!Number.isFinite(rwy)||rwy<=0){
   $("perfFieldWt").value="";
   return null;
 }
 const w=solveMaxWeightForRunway(cfg,pa,temp,rwy);
 if(Number.isFinite(w)){
   $("perfFieldWt").value=Math.round(w);
   return Math.round(w);
 }
 $("perfFieldWt").value="";
 return null;
}

function syncTakeoffSection(){
 const cfg=$("toConfig").value,d=FS_PERF.takeoff[cfg],a=autoTO();
 const autoFieldWt=autoFieldLimitedWeight();
 const climb=autoClimbAssessment();
 const sourceCeiling=takeoffFieldSourceCeilingLb(cfg,perfTakeoffPA(),perfTakeoffTemp());
 const actualTow=perfTakeoffWeightLb(),usableDep=effectiveDepartureRunwayAssessment().usable;
 if($("toMax"))$("toMax").textContent=Number.isFinite(sourceCeiling)?`${Math.round(sourceCeiling).toLocaleString()} lb`:"—";
 if($("toWtMargin"))$("toWtMargin").textContent=(Number.isFinite(autoFieldWt)&&Number.isFinite(climb.limit)&&Number.isFinite(actualTow))?`${Math.round(Math.min(autoFieldWt,climb.limit)-actualTow).toLocaleString()} lb`:"—";
 if($("toRwyMargin"))$("toRwyMargin").textContent=(Number.isFinite(usableDep)&&Number.isFinite(a.bfl))?`${Math.round(usableDep-a.bfl).toLocaleString()} ft`:"—";
 updateRunwayConditionWarnings();
 const runwayCondition=$("toRunwayCondition").value;
 const wk=(perfTakeoffWeightLb()||0)/1000;
 const speedParts=[];
 if(a.v1!=null)speedParts.push(`V1 ${a.v1.toFixed(1)}`);
 if(a.vr!=null)speedParts.push(`VR=V2 ${a.vr.toFixed(1)}`);
 if(a.vfr!=null)speedParts.push(`Vfr ${a.vfr.toFixed(1)}`);
 if(a.v15vs!=null)speedParts.push(`1.5Vs ${a.v15vs.toFixed(1)}`);
 if(a.bfl!=null)speedParts.push(`BFL ${Math.round(a.bfl).toLocaleString()} ft`);
 $("toSpeeds").textContent=speedParts.length?`${runwayCondition} • ${speedParts.join(" • ")}`:"—";

 if(!missionData&&!perfIsManual()){
   $("toStatus").textContent="LOAD MISSION";$("toStatus").className="warn";
   $("toLimit").textContent="Load mission airport and weather data first";
   $("toConfigNote").textContent="Load mission data to calculate field data; current AFMS climb source is active.";
   return a;
 }

 if(runwayCondition==="WET"){
   $("toStatus").textContent="WET SELECTED • BFL/V1 SOURCE LOCKED";$("toStatus").className="warn";
   $("toLimit").textContent=`WET RUNWAY • ${d.label} • ${a.msg}`;
   $("toConfigNote").textContent=`WET runway confirmed • ${d.label}. Wet BFL/V1 remains source locked until an applicable wet method is validated; Dash-4 climb remains AFMS-controlled.`;
   return a;
 }

 if(a.v1==null&&a.bfl==null){
   $("toStatus").textContent=(a.vr!=null||a.vfr!=null)?"WEIGHT SPEEDS READY • V1/BFL OUT OF RANGE":"SOURCE LOCKED";
   $("toStatus").className="warn";
   $("toLimit").textContent=`AUTO TABLE • ${d.label} • ${a.msg||"No V1/BFL data for selected point"}`;
   $("toConfigNote").textContent=`${d.label}: V1/BFL source coverage is incomplete at this point. ${climb.msg}`;
   return a;
 }

 const pending=[];
 const depAssessment=effectiveDepartureRunwayAssessment();
 if(depAssessment.state==="CLOSED"){
   $("toStatus").textContent="NO-GO • SELECTED DEPARTURE RUNWAY CLOSED";$("toStatus").className="bad";updateDepartureRunwayAssessment();return a;
 }
 if(departureNotams.status!=="CHECKED")pending.push("DEPARTURE NOTAM REVIEW");
 if(!Number.isFinite(autoFieldWt))pending.push("FIELD LIMIT");
 if(!Number.isFinite(climb.limit))pending.push("AFMS CLIMB SOURCE COVERAGE PENDING");
 if(climb.pass===false)pending.push("CLIMB FAIL");
 const obs=departureObstacleReview||{status:"NOT_CHECKED",items:[]};
 if(obs.status==="FLAGGED")pending.push("AUTO OBSTACLE REVIEW FLAGGED");
 else if(obs.status==="UNAVAILABLE")pending.push("AUTO OBSTACLE REVIEW UNAVAILABLE");
 else if(obs.status!=="REVIEWED")pending.push("AUTO OBSTACLE REVIEW PENDING");
 if($("perfObs").value==="false")pending.push("PILOT OBSTACLE CONFLICT");

 if(climb.pass===false){
   $("toStatus").textContent="NO-GO • SECOND-SEGMENT CLIMB";$("toStatus").className="bad";
 }else if(pending.length){
   $("toStatus").textContent=`PENDING • ${pending.join(" • ")}`;$("toStatus").className="warn";
 }else{
   $("toStatus").textContent=climb.noLimitation?"TABLE DATA READY • CLIMB NOT LIMITING":"TABLE DATA READY • CLIMB PASS";$("toStatus").className="ok";
 }

 const limits=[`AUTO TABLE • ${d.label}`];
 if(Number.isFinite(autoFieldWt)){
   const srcCeil=takeoffFieldSourceCeilingLb(cfg,perfTakeoffPA(),perfTakeoffTemp());
   const fieldIsSourceCeiling=Number.isFinite(srcCeil)&&Math.abs(autoFieldWt-srcCeil)<75;
   limits.push(`${fieldIsSourceCeiling?"Field source evaluated through":"Field limit"} ${Math.round(autoFieldWt).toLocaleString()} lb`);
 }
 if(Number.isFinite(climb.limit))limits.push(`Climb ${Math.round(climb.limit).toLocaleString()} lb`);
 $("toLimit").textContent=limits.join(" • ");

 const notes=[`Using ${d.label}`];
 if(Number.isFinite(perfTakeoffPA()))notes.push(`PA ${Math.round(perfTakeoffPA()).toLocaleString()} ft`);
 if(Number.isFinite(wk)&&wk>0)notes.push(`WT ${wk.toFixed(1)}k lb`);
 if(Number.isFinite(autoFieldWt)){
   const srcCeil=takeoffFieldSourceCeilingLb(cfg,perfTakeoffPA(),perfTakeoffTemp());
   notes.push(Number.isFinite(srcCeil)&&Math.abs(autoFieldWt-srcCeil)<75
     ?`field source through ${Math.round(autoFieldWt).toLocaleString()} lb; structural MTOW 40,780 lb`
     :`field limit ${Math.round(autoFieldWt).toLocaleString()} lb`);
 }
 if(Number.isFinite(climb.limit))notes.push(`AFMS CLIMB ACTIVE${climb.noLimitation?" — NOT LIMITING":""}`);
 if(Number.isFinite(climb.gradient))notes.push(`QRH GRADIENT ${climb.gradient.toFixed(2)}% REFERENCE`);
 notes.push(`A/I ${climb.ai}`);
 $("toConfigNote").textContent=notes.join(" • ");
 return a;
}

function updateVSpeedCard(tow,landing){
 const toAuto=autoTO();
 const v1=toAuto.v1,vr=toAuto.vr,vfr=toAuto.vfr,v15vs=toAuto.v15vs;

 const requestedBurn=Math.max(0,num("emerReturnBurn"));
 const takeoffFuel=Math.max(0,Math.min(maxFuel,num("fuel"))-Math.max(0,num("taxiFuel")));
 const appliedBurn=Math.min(requestedBurn,takeoffFuel);
 const emerWt=Math.max(0,tow-appliedBurn);
 const emerWk=emerWt/1000;
 const emerVref=interpScalarN(FS_PERF.landing.S48.speed,emerWk);

 $("vsTOW").textContent=Math.round(tow).toLocaleString()+" lb";
 $("vsLDW").textContent=Math.round(emerWt).toLocaleString()+" lb";
 $("vsERWsrc").textContent=`TOW less ${Math.round(appliedBurn).toLocaleString()} lb return burn${requestedBurn>takeoffFuel?" (limited to available takeoff fuel)":""}`;

 $("vsV1").textContent=v1==null?"—":v1.toFixed(1)+" kt";
 $("vsVR").textContent=vr==null?"—":vr.toFixed(1)+" kt";
 $("vsVFT").textContent=vfr==null?"—":vfr.toFixed(1)+" kt";
 $("vsVFS").textContent=v15vs==null?"—":v15vs.toFixed(1)+" kt";
 $("vsVREF").textContent=emerVref==null?"—":emerVref.toFixed(1)+" kt";

 $("vsV1src").textContent=v1==null?"Requires valid PA / temperature / weight cell":`${FS_PERF.takeoff[toAuto.cfg].label} • FlightSafety P-2–P-5`;
 $("vsVRsrc").textContent=vr==null?"Takeoff weight outside published table":`${FS_PERF.takeoff[toAuto.cfg].label} • FlightSafety P-2–P-5 • weight based`;
 $("vsVFTsrc").textContent=vfr==null?"Takeoff weight outside published table":`${FS_PERF.takeoff[toAuto.cfg].label} • FlightSafety P-2–P-5 • weight based`;
 $("vsVFSsrc").textContent=v15vs==null?"Takeoff weight outside published table":`${FS_PERF.takeoff[toAuto.cfg].label} • FlightSafety P-2–P-5 • weight based`;
 $("vsVREFsrc").textContent=emerVref==null?"Emer. return weight outside S+48 VREF table":"FlightSafety P-18/P-19 • S+48 • weight based";

 const vals=[v1,vr,vfr,v15vs,emerVref];
 const count=vals.filter(v=>v!=null).length;
 const overweight=emerWt>maxLand;
 if(count===5){
   $("vsStatus").textContent=overweight?"AUTO DATA • OVER MAX LDG WT":"AUTO TABLE DATA";
   $("vsStatus").className=overweight?"warn":"ok";
 }else if(count>0){
   $("vsStatus").textContent=`PARTIAL AUTO DATA (${count}/5)`;
   $("vsStatus").className="warn";
 }else{
   $("vsStatus").textContent="SOURCE LOCKED";
   $("vsStatus").className="warn";
 }
}
function recalculate(){
 const requested=passengers.length;
 const seatedCount=seatAssignments.filter(Boolean).length;
 const unseated=requested-seatedCount;
 const capt=num("captWt"),fo=num("foWt"),crew=capt+fo;
 let bagLoads=baggageLoadsFromUI();
 let bag=bagLoads.reduce((a,b)=>a+b,0);
 const enteredBagTotal=Math.max(0,num("totalBag"));
 if(Math.abs(enteredBagTotal-bag)>0.5){
   const dist=distributeBaggage(enteredBagTotal);
   dist.stations.forEach((st,i)=>{const el=$("bagComp"+i);if(el)el.value=Math.round(st.load)});
   bagLoads=baggageLoadsFromUI();
   bag=bagLoads.reduce((a,b)=>a+b,0);
   if($("bagStatusNote"))$("bagStatusNote").textContent=`Total loaded baggage ${Math.round(bag).toLocaleString()} / 2,205 lb`;
 }
 let fob=Math.min(maxFuel,Math.max(0,num("fuel")));$("fuel").value=fob;
 const fobVerified=fob>0 && !!$("fobVerified")?.checked;
 const fvn=$("fobVerifyNote");
 if(fob<=0){
   if($("fobVerified"))$("fobVerified").checked=false;
   if(fvn)fvn.textContent="ENTER FUEL ON BOARD — verification required before mission readiness.";
 }else if(fobVerified){
   if(fvn)fvn.textContent=`Verified ${Math.round(fob).toLocaleString()} lb fuel on board.`;
 }else{
   if(fvn)fvn.textContent=`VERIFY ${Math.round(fob).toLocaleString()} lb fuel on board.`;
 }
 let missionFuel=Math.min(maxFuel,Math.max(0,num("missionFuel")));$("missionFuel").value=missionFuel;
 const taxi=Math.max(0,num("taxiFuel"));

 let w=emptyWeight,m=emptyMoment,paxWeight=0,loadRows=[];
 w+=crew;m+=crew*(-275.88);
 loadRows.push({name:"Flight Deck",desc:"Captain + First Officer",arm:-275.88,load:crew,moment:crew*(-275.88)});

 seats.forEach((s,i)=>{
   const pid=seatAssignments[i],p=pid?getPassenger(pid):null,load=p?p.weight:0;
   paxWeight+=load;w+=load;m+=load*s.arm;
   loadRows.push({name:`Seat ${s.n}`,desc:p?`PAX ${p.id} — ${paxLabels[p.type]}`:"Empty",arm:s.arm,load,moment:load*s.arm});
 });

 const bd={stations:baggageStations.map((s,i)=>({...s,load:bagLoads[i]})),overflow:0};
 bd.stations.forEach(s=>{w+=s.load;m+=s.load*s.arm;loadRows.push({name:s.name,desc:"Baggage",arm:s.arm,load:s.load,moment:s.load*s.arm})});

 const zfw=w,arm=m/w,pct=pctMacFromArm(arm),fl=interp(fwd,w),al=interp(aft,w);
 const ramp=zfw+fob,tow=ramp-taxi,landingFuel=Math.max(0,fob-missionFuel),landing=zfw+landingFuel,reserve=fob-missionFuel;
 const takeoffFuel=Math.max(0,fob-taxi);
 const takeoffMoment=m+fuelMomentLbIn(takeoffFuel);
 const landingMoment=m+fuelMomentLbIn(landingFuel);
 const takeoffArm=tow>0?takeoffMoment/tow:arm;
 const landingArm=landing>0?landingMoment/landing:arm;
 const takeoffPct=pctMacFromArm(takeoffArm);
 const landingPct=pctMacFromArm(landingArm);

 const burnPath=[];
 const startFuel=takeoffFuel,endFuel=landingFuel;
 if(startFuel>=endFuel){
   const steps=Math.max(2,Math.ceil((startFuel-endFuel)/250));
   for(let i=0;i<=steps;i++){
     const fuel=startFuel-(startFuel-endFuel)*(i/steps);
     const gross=zfw+fuel;
     const moment=m+fuelMomentLbIn(fuel);
     const a=gross>0?moment/gross:arm;
     burnPath.push({fuel,weight:gross,pct:pctMacFromArm(a)});
   }
 }
 const seatMatch=requested===seatedCount,fuelOK=reserve>=0;
 const toFl=interp(fwd,tow),toAl=interp(aft,tow),ldFl=interp(fwd,landing),ldAl=interp(aft,landing);
 const cgPathOK=burnPath.length?burnPath.every(p=>p.pct>=interp(fwd,p.weight)&&p.pct<=interp(aft,p.weight)):false;
 const wbMathOK=seatMatch&&pct>=fl&&pct<=al&&takeoffPct>=toFl&&takeoffPct<=toAl&&landingPct>=ldFl&&landingPct<=ldAl&&cgPathOK&&zfw<=maxZFW&&ramp<=maxRamp&&tow<=maxTO&&landing<=maxLand&&bd.overflow<=0;
 const wbOK=wbMathOK&&fobVerified;
 const lowLandingFuel=landingFuel<3000;
 const lowLandingFuelConfirmed=!lowLandingFuel || !!$("lowFuelConfirm")?.checked;
 latestCalc={zfw,ramp,tow,landing,landingFuel,reserve,pct,takeoffPct,landingPct,takeoffArm,landingArm,burnPath,wbOK,lowLandingFuel,lowLandingFuelConfirmed};

 $("paxRequestedDisplay").textContent=requested;
 $("paxSeatedDisplay").textContent=seatedCount;
 $("paxUnseatedDisplay").textContent=unseated;
 $("seatCheck").textContent=seatMatch?"MATCH":"MISMATCH";
 $("seatCheck").className=seatMatch?"ok":"bad";
 $("seatMismatch").style.display=seatMatch?"none":"block";

 $("crewCalc").textContent=crew.toLocaleString()+" lb";
 $("paxCalc").textContent=paxWeight.toLocaleString()+" lb";
 $("bagCalc").textContent=bag.toLocaleString()+" lb"; $("bagStatusNote").textContent=`Total loaded baggage ${Math.round(bag).toLocaleString()} / 2,205 lb`;
 $("fuelCalc").textContent=fob.toLocaleString()+" lb";
 $("missionFuelCalc").textContent=missionFuel.toLocaleString()+" lb";
 $("landingFuelCalc").textContent=landingFuel.toLocaleString()+" lb";
 $("fuelReserveCalc").textContent=reserve.toLocaleString()+" lb";
 $("zfw").textContent=Math.round(zfw).toLocaleString()+" lb";
 $("rampWt").textContent=Math.round(ramp).toLocaleString()+" lb";
 $("takeoffWt").textContent=Math.round(tow).toLocaleString()+" lb";
 $("landingWt").textContent=Math.round(landing).toLocaleString()+" lb";
 $("cgarm").textContent=arm.toFixed(2)+'"';
 $("cgmac").textContent=pct.toFixed(2)+"%";
 $("cgLimits").textContent=`${fl.toFixed(2)}–${al.toFixed(2)}%`;
 $("cgZeroFuel").textContent=pct.toFixed(2)+"%";
 $("cgZeroFuelArm").textContent=arm.toFixed(2)+'"';
 $("cgTakeoff").textContent=takeoffPct.toFixed(2)+"%";
 $("cgTakeoffArm").textContent=takeoffArm.toFixed(2)+'"';
 $("cgLanding").textContent=landingPct.toFixed(2)+"%";
 $("cgLandingArm").textContent=landingArm.toFixed(2)+'"';
 $("cgTraceStatus").textContent="DTM912 FUEL MOMENT";
 $("cgTraceStatus").className="ok";
 $("cgTraceNote").textContent="Rev 13 • Section 2 • interpolated within published fuel points";
 const env=$("envStatus");env.textContent=wbOK?"WITHIN LIMITS":(!fobVerified?"VERIFY FOB — DELIBERATE CHECK":(!seatMatch?"PAX SEATING INCOMPLETE":"CHECK LIMITS"));env.className=wbOK?"ok":"bad";
 $("limZFW").textContent=`${Math.round(zfw).toLocaleString()} / ${maxZFW.toLocaleString()} lb`;
 $("limRamp").textContent=`${Math.round(ramp).toLocaleString()} / ${maxRamp.toLocaleString()} lb`;
 $("limTO").textContent=`${Math.round(tow).toLocaleString()} / ${maxTO.toLocaleString()} lb`;
 $("limLand").textContent=`${Math.round(landing).toLocaleString()} / ${maxLand.toLocaleString()} lb`;
 $("sumPax").textContent=`${seatedCount} / ${requested}`;
 $("sumFuel").textContent=fob.toLocaleString()+" lb";
 $("sumMissionFuel").textContent=missionFuel.toLocaleString()+" lb";
 $("sideFOB").textContent=fob.toLocaleString()+" lb";$("sideMission").textContent=missionFuel.toLocaleString()+" lb";
 $("sideTaxi").textContent=taxi.toLocaleString()+" lb";$("sideLanding").textContent=landingFuel.toLocaleString()+" lb";
 $("sideReserve").textContent=reserve.toLocaleString()+" lb";
 const lowBox=$("lowFuelConfirmBox"),lowGate=$("landingFuelGuardStatus");
 if(lowLandingFuel){
   lowBox.style.display="block";
   lowGate.textContent=lowLandingFuelConfirmed?"CONFIRMED BELOW 3,000":"CONFIRM REQUIRED";
   lowGate.className=lowLandingFuelConfirmed?"warn":"bad";
 }else{
   lowBox.style.display="none";
   if($("lowFuelConfirm"))$("lowFuelConfirm").checked=false;
   lowGate.textContent="≥ 3,000 lb";
   lowGate.className="ok";
 }
 const fs=$("fuelStatusSide");
 fs.textContent=!fuelOK?"INSUFFICIENT":(!lowLandingFuelConfirmed?"CONFIRM LOW LANDING FUEL":"SUFFICIENT");
 fs.className=!fuelOK||!lowLandingFuelConfirmed?"bad":"ok";

 const tb=$("autoLoadTable");tb.innerHTML="";
 loadRows.forEach(r=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${r.name}</td><td>${r.desc}</td><td>${r.arm.toFixed(2)} in</td><td>${Math.round(r.load).toLocaleString()} lb</td><td>${Math.round(r.moment).toLocaleString()}</td>`;tb.appendChild(tr)});
 if(bd.overflow>0){const tr=document.createElement("tr");tr.innerHTML=`<td class="bad"><b>BAGGAGE OVERFLOW</b></td><td>Over approved compartments</td><td>—</td><td class="bad">${Math.round(bd.overflow)} lb</td><td>—</td>`;tb.appendChild(tr)}

 if(!perfIsManual())$("perfTOW").value=Math.round(tow);$("landWt").value=Math.round(landing);
 selectedRunwayChanged();
 syncTakeoffSection();
 syncLandingSection();
 updateVSpeedCard(tow,landing);
 drawTrace(zfw,pct,burnPath,tow,takeoffPct,landing,landingPct);
 updateFOBVerifyLabel();
 updateToldCard();
}
function airportName(x){const a=x.airport||{};return a.name||a.siteName||a.nameFull||x.icao}
function fmtUtc(v){if(v==null||v==="")return"time unavailable";const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"})}
function firstVal(o,ks){for(const k of ks){if(o&&o[k]!=null&&o[k]!=="")return o[k]}return null}
function windTextObj(o){const dir=firstVal(o,["wind_dir","wdir","windDir","wind_direction"]);const spd=Number(firstVal(o,["wind_kt","wspd","windSpeed","wind_speed_kt"]));const gust=Number(firstVal(o,["wind_gust_kt","wgst","windGust","wind_gust"]));if(!Number.isFinite(spd)||spd===0)return"Wind calm";let d="variable";if(dir!=null&&String(dir).toUpperCase()!=="VRB"&&Number.isFinite(Number(dir)))d=`${String(Math.round(Number(dir))).padStart(3,"0")}°`;return`Wind ${d} at ${Math.round(spd)} kt${Number.isFinite(gust)&&gust>0?`, gusting ${Math.round(gust)} kt`:""}`}
function visibilityText(v){if(v==null||v==="")return"Visibility not reported";const n=Number(v);return Number.isFinite(n)?`Visibility ${n} statute mile${n===1?"":"s"}`:`Visibility ${v}`}
function cloudText(c){if(!Array.isArray(c)||!c.length)return"Clouds not reported";const n={SKC:"clear",CLR:"clear",FEW:"few",SCT:"scattered",BKN:"broken",OVC:"overcast",VV:"vertical visibility"};return c.map(x=>{const cov=firstVal(x,["cover","coverage","skyCover","amount"])||"";const base=firstVal(x,["base","base_ft_agl","baseFtAgl","altitude"]);const label=n[String(cov).toUpperCase()]||String(cov).toLowerCase();return base!=null?`${label} at ${Number(base).toLocaleString()} ft AGL`:label}).join(", ")}
function formatMetarDecoded(m,altInHg){if(!m)return'<span class="warn">METAR unavailable</span>';const obs=firstVal(m,["obs_time","reportTime","obsTime","time"]);const cat=firstVal(m,["flight_category","fltCat","category"])||"METAR";const vis=firstVal(m,["visibility_sm","visib","visibility"]);const wx=firstVal(m,["wx","wxString","weather"]);const t=Number(firstVal(m,["temp_c","temp","temperature"]));const d=Number(firstVal(m,["dewpoint_c","dewp","dewpoint"]));const clouds=firstVal(m,["clouds","sky"])||[];const alt=altInHg??firstVal(m,["altimeter_inhg","altimeter"]);const lines=[];lines.push(`<div class="decoded-line"><b>${cat}</b> • observed ${fmtUtc(obs)}</div>`);lines.push(`<div class="decoded-line">${windTextObj(m)}</div>`);lines.push(`<div class="decoded-line">${visibilityText(vis)}</div>`);if(wx)lines.push(`<div class="decoded-line">Weather: ${wx}</div>`);lines.push(`<div class="decoded-line">${cloudText(clouds)}</div>`);if(Number.isFinite(t)||Number.isFinite(d))lines.push(`<div class="decoded-line">Temperature ${Number.isFinite(t)?t+"°C":"—"} • Dew point ${Number.isFinite(d)?d+"°C":"—"}</div>`);if(alt!=null&&Number.isFinite(Number(alt)))lines.push(`<div class="decoded-line">Altimeter ${Number(alt).toFixed(2)} inHg</div>`);return lines.join("")}
function formatTafDecoded(t){if(!t)return'<span class="warn">TAF unavailable</span>';const vf=firstVal(t,["valid_from","validTimeFrom","fcstTimeFrom","startTime"]);const vt=firstVal(t,["valid_to","validTimeTo","fcstTimeTo","endTime"]);let out=`<div class="decoded-line"><b>Valid</b> ${fmtUtc(vf)} to ${fmtUtc(vt)}</div>`;const fc=firstVal(t,["forecast","forecasts","fcsts","periods"]);if(!Array.isArray(fc)||!fc.length)return out+'<div class="decoded-line">Forecast periods unavailable from decoded feed; raw TAF retained below.</div>';out+=fc.map(f=>{const from=firstVal(f,["timeFrom","validTimeFrom","valid_from","fcstTimeFrom","startTime"]);const to=firstVal(f,["timeTo","validTimeTo","valid_to","fcstTimeTo","endTime"]);const ch=firstVal(f,["changeIndicator","change_indicator","fcstChange","change"])||"Forecast";const vis=firstVal(f,["visib","visibility","visibility_sm"]);const wx=firstVal(f,["wxString","wx","weather"]);const clouds=firstVal(f,["clouds","sky"])||[];const bits=[windTextObj(f),visibilityText(vis)];if(wx)bits.push(`Weather: ${wx}`);bits.push(cloudText(clouds));return`<div class="decoded-period"><b>${ch}</b> • ${fmtUtc(from)} to ${fmtUtc(to)}<br>${bits.join(" • ")}</div>`}).join("");return out}



function populatePoint(prefix,x){
 $(prefix+"Airport").textContent=`${airportName(x)} • ${esc((x.airport||{}).elevation_ft||(x.airport||{}).elev||(x.airport||{}).elevation)} ft`;
 $(prefix+"PA").textContent=esc(x.pressure_altitude_ft)+" ft";
 $(prefix+"DA").textContent=esc(x.density_altitude_ft)+" ft";
 $(prefix+"Metar").innerHTML=formatMetarDecoded(x.metar,x.altimeter_inhg);
 $(prefix+"Taf").innerHTML=formatTafDecoded(x.taf);
 const mr=$(prefix+"MetarRaw"),tr=$(prefix+"TafRaw");
 if(mr)mr.textContent=esc(firstVal(x.metar||{},["raw","rawOb","raw_text"])||"—");
 if(tr)tr.textContent=esc(firstVal(x.taf||{},["raw","rawTAF","raw_text"])||"—");
 const s=$("weatherDecodeStatus");if(s)s.innerHTML='<span class="ok">Decoded METAR/TAF loaded.</span> Raw reports remain available below.';
}

function runwayEndHeading(id){
 const m=String(id||"").trim().toUpperCase().match(/^(\d{1,2})/);
 if(!m)return null;
 let h=Number(m[1])*10;
 if(h===360)h=0;
 return h;
}
function runwayWindComponents(point,heading){
 const wx=point?.metar||{};
 const dirRaw=firstVal(wx,["wind_dir","wdir","windDir","wind_direction"]);
 const spd=Number(firstVal(wx,["wind_kt","wspd","windSpeed","wind_speed_kt"]));
 const dir=Number(dirRaw);
 if(!Number.isFinite(dir)||!Number.isFinite(spd)||!Number.isFinite(heading)){
   return{headwind_kt:null,tailwind_kt:null,crosswind_kt:null};
 }
 const rad=(dir-heading)*Math.PI/180;
 const h=spd*Math.cos(rad),x=Math.abs(spd*Math.sin(rad));
 return{
   headwind_kt:Number(Math.max(0,h).toFixed(1)),
   tailwind_kt:Number(Math.max(0,-h).toFixed(1)),
   crosswind_kt:Number(x.toFixed(1))
 };
}
function directionalRunwayOptions(runways,point){
 const out=[];
 (runways||[]).forEach((rw,i)=>{
   const raw=String(rw.runway_id||"").trim().toUpperCase();
   const ends=raw.includes("/")?raw.split("/").map(x=>x.trim()).filter(Boolean):[raw];
   ends.forEach((end,j)=>{
     let heading=runwayEndHeading(end);
     if(!Number.isFinite(heading)){
       const base=Number(rw.heading);
       if(Number.isFinite(base))heading=j===0?base:(base+180)%360;
     }
     const wc=runwayWindComponents(point,heading);
     out.push({
       source_index:i,
       runway_end:end||raw,
       heading,
       runway:{...rw,runway_id:end||raw,heading,wind_components:wc,paired_runway_id:raw}
     });
   });
 });
 return out;
}
function autoSelectBestRunwayEnd(selectId,point){
 const sel=$(selectId);if(!sel||!sel.options.length)return;
 let best=0,bestScore=-1e9;
 [...sel.options].forEach((opt,i)=>{
   const [src,end]=String(opt.value).split("|");
   const rw=(point?.runways||[])[Number(src)];
   if(!rw)return;
   const heading=runwayEndHeading(end);
   const wc=runwayWindComponents(point,heading);
   // Favor headwind, penalize tailwind heavily, then crosswind.
   const score=(Number(wc.headwind_kt)||0)*10-(Number(wc.tailwind_kt)||0)*30-(Number(wc.crosswind_kt)||0);
   if(score>bestScore){bestScore=score;best=i}
 });
 sel.selectedIndex=best;
}

function fillRunwaySelect(id,runways){
 const sel=$(id);sel.innerHTML="";
 if(!runways||!runways.length){sel.innerHTML='<option value="">No runway data</option>';return}
 const which=id==="depRunway"?"dep":"dest";
 const point=which==="dep"?missionData?.departure:missionData?.destination;
 const dirs=directionalRunwayOptions(runways,point);
 dirs.forEach(x=>{
   const opt=document.createElement("option");
   opt.value=`${x.source_index}|${x.runway_end}`;
   const wc=x.runway.wind_components||{};
   const wind=wc.headwind_kt!=null?` • HW ${wc.headwind_kt} / TW ${wc.tailwind_kt} / XW ${wc.crosswind_kt}`:"";
   opt.textContent=`${x.runway_end} • ${esc(x.runway.length_ft)} ft${wind}`;
   sel.appendChild(opt);
 });
 syncAssessmentRunwaySelectors();
}
function syncAssessmentRunwaySelectors(){
 [["depRunway","depNotamRunwaySelect"],["destRunway","destNotamRunwaySelect"]].forEach(([srcId,dstId])=>{
   const src=$(srcId),dst=$(dstId);if(!src||!dst)return;
   const prior=dst.value;dst.innerHTML="";
   [...src.options].forEach(o=>{const n=document.createElement("option");n.value=o.value;n.textContent=o.textContent;dst.appendChild(n)});
   dst.value=src.value||prior||"";
 });
}
function assessmentRunwayChanged(which,value){
 const main=$(which==="dep"?"depRunway":"destRunway");if(!main)return;
 main.value=value;selectedRunwayChanged(which);
 if(which==="dep")refreshDepartureNotams(true).catch(()=>{});else refreshNotams().catch(()=>{});
 scheduleDraftSave();
}
function selectedRunwayChanged(whichChanged=null){
 if(whichChanged==="dest")currentNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
 if(whichChanged==="dep"){
   departureNotams={status:"NOT_CHECKED",source:"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:null};
   departureObstacleReview={status:"NOT_CHECKED",airport:null,items:[],checked_at:null,message:"FAA NMS departure NOTAM scan only — not a clearance analysis."};
 }
 if(!missionData)return;
 const depRw=selectedRunwayObj("dep"),destRw=selectedRunwayObj("dest");
 if(depRw){
   $("depRwySummary").textContent=`RWY ${depRw.runway_id} • ${esc(depRw.length_ft)} ft`;
   const w=depRw.wind_components||{};
   $("depWindSummary").textContent=`HW ${esc(w.headwind_kt)} • TW ${esc(w.tailwind_kt)} • XW ${esc(w.crosswind_kt)} kt`;
   $("sumDepRwy").textContent=depRw.runway_id;
   if(!perfIsManual())$("perfRwyLen").value=depRw.length_ft||"";
 }
 if(destRw){
   $("destRwySummary").textContent=`RWY ${destRw.runway_id} • ${esc(destRw.length_ft)} ft`;
   const w=destRw.wind_components||{};
   $("destWindSummary").textContent=`HW ${esc(w.headwind_kt)} • TW ${esc(w.tailwind_kt)} • XW ${esc(w.crosswind_kt)} kt`;
   $("sumDestRwy").textContent=destRw.runway_id;
   $("landRwyLen").value=destRw.length_ft||"";
 }
 syncAssessmentRunwaySelectors();
 if(valueOrNull("perfTOW")){
   autoTO();autoLDG();
   updateVSpeedCard(perfTakeoffWeightLb()||0,valueOrNull("landWt")||0);
 }
 updateDepartureRunwayAssessment();
 updateLandingRunwayAssessment();
 updateToldCard();
}

async function loadMission(options={}){
 const dep=$("dep").value.toUpperCase().trim(),dest=$("dest").value.toUpperCase().trim(),alt=$("alt").value.toUpperCase().trim();
 const preserveManualWeather=!!options.preserveManualWeather,quiet=!!options.quiet;
 const savedManual=preserveManualWeather?JSON.parse(JSON.stringify(manualWeather)):null;
 $("dep").value=dep;$("dest").value=dest;$("alt").value=alt;if(!quiet)$("missionStatus").textContent="Loading airport and weather data...";
 try{
   const altQuery=alt?`&alt=${encodeURIComponent(alt)}`:"";
   const r=await fetch(apiUrl(`/api/mission?dep=${encodeURIComponent(dep)}&dest=${encodeURIComponent(dest)}${altQuery}&_=${Date.now()}`),{cache:"no-store"});if(!r.ok)throw new Error(await r.text());missionData=await r.json();
   manualWeather=savedManual||{dep:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null},dest:{mode:"LIVE",applied:false,entered_at:null,note:"",live:null,manual_values:null}};
   if(savedManual){
     ["dep","dest"].forEach(which=>{const p=which==="dep"?missionData.departure:missionData.destination,st=manualWeather[which];st.live={metar:p?.metar?JSON.parse(JSON.stringify(p.metar)):null,pressure_altitude_ft:p?.pressure_altitude_ft??null,density_altitude_ft:p?.density_altitude_ft??null,altimeter_inhg:p?.altimeter_inhg??null};st.mode="LIVE";st.applied=false;});
   }
   $("depTitle").textContent=dep;$("destTitle").textContent=dest;$("sumDep").textContent=dep;$("sumDest").textContent=dest;$("depWxIdent").textContent=dep;$("depWxIdent2").textContent=dep;$("destWxIdent").textContent=dest;$("destWxIdent2").textContent=dest;
   populatePoint("dep",missionData.departure);populatePoint("dest",missionData.destination);
   if(alt&&missionData.alternate){
     $("altMetarPanel").style.display="block";$("altTafPanel").style.display="block";
     $("altTitle").textContent=alt;$("altTitle2").textContent=alt;
     $("altMetar").innerHTML=formatMetarDecoded(missionData.alternate.metar,missionData.alternate.altimeter_inhg);
     $("altTaf").innerHTML=formatTafDecoded(missionData.alternate.taf);
     $("altMetarRaw").textContent=esc(firstVal(missionData.alternate.metar||{},["raw","rawOb","raw_text"])||"—");
     $("altTafRaw").textContent=esc(firstVal(missionData.alternate.taf||{},["raw","rawTAF","raw_text"])||"—");
   }else{
     $("altMetarPanel").style.display="none";$("altTafPanel").style.display="none";
     $("altTitle").textContent="—";$("altTitle2").textContent="—";
     $("altMetar").innerHTML="—";$("altTaf").innerHTML="—";$("altMetarRaw").textContent="—";$("altTafRaw").textContent="—";
   }
   fillRunwaySelect("depRunway",missionData.departure.runways);fillRunwaySelect("destRunway",missionData.destination.runways);
   if((missionData.departure.runways||[]).length)autoSelectBestRunwayEnd("depRunway",missionData.departure);
   if((missionData.destination.runways||[]).length)autoSelectBestRunwayEnd("destRunway",missionData.destination);
   const tb=$("runways");tb.innerHTML="";
   for(const [code,x] of [[dep,missionData.departure],[dest,missionData.destination]]){
     for(const d of directionalRunwayOptions(x.runways||[],x)){
       const rw=d.runway,wc=rw.wind_components||{},tr=document.createElement("tr");
       tr.innerHTML=`<td>${code}</td><td>${esc(rw.runway_id)}</td><td>${esc(rw.heading)}°</td><td>${esc(rw.length_ft)} ft</td><td>${esc(rw.width_ft)}</td><td>${esc(rw.surface)}</td><td>${esc(wc.headwind_kt)}</td><td>${esc(wc.tailwind_kt)}</td><td>${esc(wc.crosswind_kt)}</td>`;
       tb.appendChild(tr);
     }
   }
   const depCount=(missionData.departure.runways||[]).length,destCount=(missionData.destination.runways||[]).length;
   const depSrc=missionData.departure.runway_source||"none",destSrc=missionData.destination.runway_source||"none";
   const liveUsed=[depSrc,destSrc].includes("faa_nasr_live");
   const sourceLabel=liveUsed?"FAA NASR LIVE":(depCount&&destCount?"PACKAGED CACHE":(depCount||destCount?"PARTIAL":"NO RUNWAY DATA"));
   $("sumWX").textContent=(missionData.departure.metar||missionData.destination.metar)?"LIVE":"NO REPORT";$("sumWX").className=(missionData.departure.metar||missionData.destination.metar)?"ok":"warn";
   $("sumFAA").textContent=depCount&&destCount?"LOADED":(depCount||destCount?"PARTIAL":"NO RUNWAY DATA");$("sumFAA").className=depCount&&destCount?"ok":"warn";
   $("sumRunwaySource").textContent=sourceLabel;$("sumRunwaySource").className=depCount||destCount?"ok":"warn";
   selectedRunwayChanged();recalculate();populateFallbackRunwayOptions();updateWeatherSourceBadges();loadManualWeatherForm();
   setTimeout(()=>{refreshDepartureNotams(true).catch(()=>{});refreshNotams().catch(()=>{});},150);
   if(!quiet)$("missionStatus").innerHTML=depCount||destCount?`<span class="ok">Mission loaded.</span> Runway data: ${dep} ${depCount} (${depSrc}) • ${dest} ${destCount} (${destSrc}). First available runway auto-selected.`:`<span class="warn">Weather request completed, but no runway data was returned from the packaged cache or the nationwide FAA NASR-derived lookup for ${dep} or ${dest}. Use the manual runway fallback and verify current airport data.</span>`;
 }catch(e){if(!quiet)$("missionStatus").innerHTML='<span class="bad">'+e+'</span>';throw e}
}

function enableFastNumericEntry(){
 const numericInputs=[...document.querySelectorAll('input[type="number"]')];
 numericInputs.forEach(el=>{
   if(el.readOnly||el.disabled)return;
   // iOS/iPadOS/Android: request the numeric keypad while preserving decimal support.
   el.setAttribute("inputmode","decimal");
   el.setAttribute("enterkeyhint","done");

   // A single tap/click/focus selects the current value so the next keystroke
   // replaces it rather than appending or requiring manual deletion.
   const selectAll=()=>{
     requestAnimationFrame(()=>{
       try{el.select()}catch(e){}
       try{
         if(typeof el.setSelectionRange==="function"){
           el.setSelectionRange(0,String(el.value||"").length);
         }
       }catch(e){}
     });
   };

   if(!el.dataset.fastNumericEntry){
     el.addEventListener("focus",selectAll);
     el.addEventListener("click",selectAll);
     el.addEventListener("touchend",selectAll,{passive:true});
     el.dataset.fastNumericEntry="1";
   }
 });

 // Some operational numeric fields were historically rendered without type=number.
 // Explicitly convert known editable weight/fuel/distance fields to numeric entry.
 const knownNumericIds=[
   "paxRequested","captWeight","foWeight","homeFOB","homeMissionFuel","taxiFuel","emerReturnBurn",
   "bagComp0","bagComp1","bagComp2","manualUsableLda",
   "perfManualPA","perfManualTemp","perfManualWt","perfManualRwyLen"
 ];
 knownNumericIds.forEach(id=>{
   const el=$(id);
   if(!el||el.readOnly||el.disabled)return;
   el.setAttribute("type","number");
   el.setAttribute("inputmode","decimal");
   el.setAttribute("enterkeyhint","done");
   if(!el.dataset.fastNumericEntry){
     const selectAll=()=>requestAnimationFrame(()=>{try{el.select()}catch(e){}});
     el.addEventListener("focus",selectAll);
     el.addEventListener("click",selectAll);
     el.addEventListener("touchend",selectAll,{passive:true});
     el.dataset.fastNumericEntry="1";
   }
 });
}

document.addEventListener("DOMContentLoaded",enableFastNumericEntry);
document.addEventListener("DOMContentLoaded",()=>{checkNotamConnection().catch(()=>{});});

document.addEventListener("DOMContentLoaded",()=>{
 const pax=$("paxRequested");
 if(pax){
   pax.setAttribute("inputmode","numeric");
   pax.setAttribute("enterkeyhint","done");
   pax.setAttribute("step","1");
   const replaceReady=()=>{
     requestAnimationFrame(()=>{
       try{pax.focus({preventScroll:true})}catch(e){}
       try{pax.select()}catch(e){}
     });
   };
   pax.addEventListener("focus",replaceReady);
   pax.addEventListener("click",replaceReady);
   pax.addEventListener("touchend",replaceReady,{passive:true});
 }
});


function valueOrNull(id){const v=$(id).value;return v===""?null:+v}

function perfIsManual(){return $("perfInputMode") && $("perfInputMode").value==="MANUAL"}
let whatIfDirty=true;
function markWhatIfDirty(){
 if(!perfIsManual())return;
 whatIfDirty=true;
 const b=$("processWhatIfBtn"),s=$("whatIfProcessStatus");
 if(b){b.classList.add("dirty");b.classList.remove("ready");}
 if(s){s.textContent="INPUTS CHANGED — PROCESS WHAT-IF REQUIRED";s.className="small whatif-dirty-note";}
 const g=$("whatIfGate"),n=$("whatIfGateNote"),box=$("whatIfGateBox");
 if(g)g.textContent="PROCESS REQUIRED";
 if(n)n.textContent="Hypothetical inputs changed. Process the point before using the result.";
 if(box)box.className="whatif-gate warn";
}
function restoreLivePerformance(){
 if($("perfInputMode"))$("perfInputMode").value="LIVE";
 whatIfDirty=true;
 setPerformanceInputMode();
 recalculate();
 const s=$("whatIfProcessStatus");
 if(s){s.textContent="LIVE MISSION DATA RESTORED";s.className="small ok";}
 const g=$("whatIfGate"),n=$("whatIfGateNote"),box=$("whatIfGateBox");
 if(g)g.textContent="LIVE DATA";
 if(n)n.textContent="Section 6 is using actual mission weather, runway and calculated aircraft weight.";
 if(box)box.className="whatif-gate ok";
}
function processWhatIf(){
 if(!perfIsManual()){
   alert("Select WHAT-IF / HYPOTHETICAL mode first.");
   return;
 }
 const pa=valueOrNull("manualTOPA"),temp=valueOrNull("manualTOTemp"),wt=valueOrNull("manualTOWeight"),rwy=valueOrNull("manualTORwyLen");
 if(!Number.isFinite(pa)||!Number.isFinite(temp)||!Number.isFinite(wt)||!Number.isFinite(rwy)||rwy<=0){
   alert("Enter pressure altitude, OAT, aircraft weight and runway length before processing.");
   return;
 }
 $("perfTOW").value=Math.round(wt);
 $("perfRwyLen").value=Math.round(rwy);
 syncTakeoffSection();
 updateWhatIfPlanner(true);
 updateToldCard();
 whatIfDirty=false;
 const b=$("processWhatIfBtn"),s=$("whatIfProcessStatus");
 if(b){b.classList.remove("dirty");b.classList.add("ready");}
 if(s){s.textContent=`PROCESSED ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;s.className="small ok";}
}

function perfTakeoffPA(){
 if(perfIsManual())return valueOrNull("manualTOPA");
 return missionData?Number(missionData.departure.pressure_altitude_ft):null;
}
function perfTakeoffTemp(){
 if(perfIsManual())return valueOrNull("manualTOTemp");
 return depTempC();
}
function perfTakeoffWeightLb(){
 return perfIsManual()?valueOrNull("manualTOWeight"):valueOrNull("perfTOW");
}
function perfTakeoffRunwayLen(){
 return perfIsManual()?valueOrNull("manualTORwyLen"):valueOrNull("perfRwyLen");
}
function perfLandingPA(){
 return missionData?Number(missionData.destination.pressure_altitude_ft):null;
}
function setPerformanceInputMode(){
 const manual=perfIsManual();
  $("perfModeStatus").textContent=manual?"WHAT-IF / HYPOTHETICAL":"LIVE / ACTUAL MISSION";
 $("perfModeStatus").className=manual?"warn":"ok";
 $("perfModeNote").textContent=manual
  ?"Edit OAT and aircraft weight directly below to test a hypothetical takeoff point. Actual W&B is unchanged."
  :"Uses current mission weather, selected runway, and calculated aircraft weight.";
 if(manual){
   $("perfTOW").value=valueOrNull("manualTOWeight")||"";
   $("perfRwyLen").value=valueOrNull("manualTORwyLen")||"";
   markWhatIfDirty();
 }else{
   if(latestCalc&&Number.isFinite(latestCalc.tow))$("perfTOW").value=Math.round(latestCalc.tow);
   selectedRunwayChanged();
 }
 ["manualTOPA","manualTOTemp","manualTOWeight","manualTORwyLen"].forEach(id=>$(id).disabled=!manual);
 syncTakeoffSection();
 updateWhatIfPlanner();
 updateToldCard();
}
function takeoffAt(cfg,pa,temp,weightLb){
 const d=FS_PERF.takeoff[cfg];
 if(!d||!Number.isFinite(pa)||!Number.isFinite(temp)||!Number.isFinite(weightLb))return null;
 let lookupPA=pa;
 const minPA=Math.min(...kN(d.tables));
 if(pa<minPA&&minPA===0&&pa>=-1000)lookupPA=0;
 return fsTakeoff(cfg,lookupPA,temp,weightLb/1000);
}
function solveMaxWeightForRunway(cfg,pa,temp,rwy){
 if($("toRunwayCondition").value!=="DRY")return null;
 const d=FS_PERF.takeoff[cfg], weights=kN(d.vr).map(x=>x*1000);
 const lo=Math.max(weights[0],18000),hi=Math.min(weights[weights.length-1],maxTO);
 let best=null;
 for(let w=lo;w<=hi;w+=50){
   const r=takeoffAt(cfg,pa,temp,w);
   if(r&&r.bfl<=rwy)best=w;
 }
 return best;
}
function solveMaxTempForRunway(cfg,pa,weight,rwy){
 if($("toRunwayCondition").value!=="DRY")return null;
 const d=FS_PERF.takeoff[cfg];
 if(!d)return null;
 const temps=new Set();
 Object.values(d.tables).forEach(wm=>Object.values(wm).forEach(tm=>Object.keys(tm).forEach(t=>temps.add(Number(t)))));
 const ts=[...temps].sort((a,b)=>a-b);
 if(!ts.length)return null;
 let best=null;
 for(let t=ts[0];t<=ts[ts.length-1];t+=0.5){
   const r=takeoffAt(cfg,pa,t,weight);
   if(r&&r.bfl<=rwy)best=t;
 }
 return best;
}
function updateWhatIfPlanner(force=false){
 if(!$("whatIfGate"))return;
 const manual=perfIsManual();
 if(!manual){
   $("whatIfGate").textContent="LIVE MODE";
   $("whatIfGateNote").textContent="Select WHAT-IF / HYPOTHETICAL to test temperature and weight.";
   $("whatIfGateBox").className="whatif-gate";
   ["whatIfMaxWeight","whatIfMaxTemp","whatIfBFL","whatIfMargin","whatIfV1","whatIfVR","whatIfVF","whatIfStructural","whatIfOps"].forEach(id=>$(id).textContent="—");
   return;
 }
 if(whatIfDirty && !force){
   $("whatIfGate").textContent="PROCESS REQUIRED";
   $("whatIfGateNote").textContent="Enter or revise the hypothetical point, then press PROCESS WHAT-IF.";
   $("whatIfGateBox").className="whatif-gate warn";
   return;
 }
 const cfg=$("toConfig").value;
 const pa=valueOrNull("manualTOPA"),temp=valueOrNull("manualTOTemp"),wt=valueOrNull("manualTOWeight"),rwy=valueOrNull("manualTORwyLen");
 const structuralOK=Number.isFinite(wt)&&wt<=maxTO;
 $("whatIfStructural").textContent=structuralOK?"PASS":"NO-GO";
 $("whatIfStructural").className=structuralOK?"ok":"bad";

 if($("toRunwayCondition").value==="WET"){
   $("whatIfMaxWeight").textContent="SOURCE LOCKED";
   $("whatIfMaxTemp").textContent="SOURCE LOCKED";
   $("whatIfBFL").textContent="SOURCE LOCKED";
   $("whatIfMargin").textContent="—";
   $("whatIfV1").textContent="SOURCE LOCKED";
   const d=FS_PERF.takeoff[cfg],wk=(wt||0)/1000;
   const vr=d?interpScalarN(d.vr,wk):null,vfr=d?interpScalarN(d.vfr,wk):null,v15=d?interpScalarN(d.v15vs,wk):null;
   $("whatIfVR").textContent=vr==null?"—":`${vr.toFixed(1)} kt`;
   $("whatIfVF").textContent=`${vfr==null?"—":vfr.toFixed(1)+" kt"} / ${v15==null?"—":v15.toFixed(1)+" kt"}`;
   $("whatIfOps").textContent="WET DATA PENDING";
   $("whatIfOps").className="warn";
   $("whatIfGate").textContent="NOT FULLY EVALUATED";
   $("whatIfGateNote").textContent="Wet BFL/V1 curves are source-locked pending aircraft-specific applicability validation.";
   $("whatIfGateBox").className="whatif-gate warn";
   return;
 }

 const r=takeoffAt(cfg,pa,temp,wt);
 const mw=solveMaxWeightForRunway(cfg,pa,temp,rwy);
 const mt=solveMaxTempForRunway(cfg,pa,wt,rwy);
 const d=FS_PERF.takeoff[cfg],wk=(wt||0)/1000;
 const vr=d?interpScalarN(d.vr,wk):null,vfr=d?interpScalarN(d.vfr,wk):null,v15=d?interpScalarN(d.v15vs,wk):null;

 $("whatIfBFL").textContent=r?`${Math.round(r.bfl).toLocaleString()} ft`:"SOURCE LOCKED";
 $("whatIfV1").textContent=r?`${r.v1.toFixed(1)} kt`:"SOURCE LOCKED";
 $("whatIfVR").textContent=vr==null?"—":`${vr.toFixed(1)} kt`;
 $("whatIfVF").textContent=`${vfr==null?"—":vfr.toFixed(1)+" kt"} / ${v15==null?"—":v15.toFixed(1)+" kt"}`;
 $("whatIfMargin").textContent=r&&Number.isFinite(rwy)?`${Math.round(rwy-r.bfl).toLocaleString()} ft`:"—";
 $("whatIfMaxWeight").textContent=mw==null?"SOURCE LOCKED":`${Math.round(mw).toLocaleString()} lb`;
 $("whatIfMaxTemp").textContent=mt==null?"SOURCE LOCKED":`${mt.toFixed(1)} °C`;

 const fieldOK=!!r&&Number.isFinite(rwy)&&r.bfl<=rwy;
 const sourceOK=!!r;
 const climb=valueOrNull("perfClimbWt");
 const climbKnown=Number.isFinite(climb);
 const climbOK=!climbKnown||wt<=climb;
 const brakePending=cfg==="SLATS"; // explicit until VMBE schedule digitized
 const obstaclePending=true;       // explicit until obstacle analysis integrated

 let opsText=[];
 if(climbKnown)opsText.push(climbOK?"AFMS CLIMB PASS":"AFMS CLIMB NO-GO"); else opsText.push("AFMS CLIMB SOURCE COVERAGE PENDING");
 if(brakePending)opsText.push("BRAKE PENDING");
 if(obstaclePending)opsText.push("OBSTACLE CLEARANCE NOT EVALUATED");
 $("whatIfOps").textContent=opsText.join(" • ");
 $("whatIfOps").className=(climbKnown&&!climbOK)?"bad":"warn";

 let gate, note, cls;
 if(!structuralOK){
   gate="NO-GO"; note="Hypothetical weight exceeds structural MTOW."; cls="bad";
 }else if(!sourceOK){
   gate="NOT FULLY EVALUATED"; note="Hypothetical point requires a BFL/V1 table value that is not present in the currently digitized source grid. No extrapolation is permitted."; cls="warn";
 }else if(!fieldOK){
   gate="NO-GO"; note=`Calculated BFL exceeds available runway by ${Math.abs(Math.round(rwy-r.bfl)).toLocaleString()} ft.`; cls="bad";
 }else if(climbKnown&&!climbOK){
   gate="NO-GO"; note="Hypothetical weight exceeds climb-limited takeoff weight."; cls="bad";
 }else if(!climbKnown||brakePending||obstaclePending){
   gate="NOT FULLY EVALUATED"; note="Field length passes, but one or more operational limits remain unavailable or unchecked."; cls="warn";
 }else{
   gate="GO"; note="All implemented performance gates pass for this hypothetical point."; cls="ok";
 }
 $("whatIfGate").textContent=gate;
 $("whatIfGateNote").textContent=note;
 $("whatIfGateBox").className=`whatif-gate ${cls}`;
}

function fallbackPoint(){
 if(!missionData)return null;
 return $("manualRunwayTarget").value==="DEP"?missionData.departure:missionData.destination;
}

function populateFallbackRunwayOptions(){
 const sel=$("fallbackRunwaySelect");
 if(!sel)return;
 sel.innerHTML="";
 const point=fallbackPoint();

 if(point && Array.isArray(point.runways) && point.runways.length){
   const dirs=directionalRunwayOptions(point.runways,point);
   dirs.forEach(x=>{
     const opt=document.createElement("option");
     opt.value=`${x.source_index}|${x.runway_end}`;
     const wc=x.runway.wind_components||{};
     const wind=wc.headwind_kt!=null
       ?` • HW ${wc.headwind_kt} / TW ${wc.tailwind_kt} / XW ${wc.crosswind_kt}`
       :"";
     opt.textContent=`RWY ${x.runway_end} • ${Number(x.runway.length_ft||0).toLocaleString()} ft${wind}`;
     sel.appendChild(opt);
   });
   const manual=document.createElement("option");
   manual.value="MANUAL";
   manual.textContent="MANUAL ENTRY";
   sel.appendChild(manual);

   // Preselect the runway currently active in the mission if possible.
   const which=$("manualRunwayTarget").value==="DEP"?"dep":"dest";
   const active=selectedRunwayObj(which);
   if(active){
     const ix=[...sel.options].findIndex(o=>{
       const e=String(o.value||"").split("|")[1]||"";
       return e.toUpperCase()===String(active.runway_id||"").toUpperCase();
     });
     if(ix>=0)sel.selectedIndex=ix;
   }
   fallbackRunwaySelectionChanged();
   return;
 }

 const opt=document.createElement("option");
 opt.value="MANUAL";
 opt.textContent="MANUAL ENTRY — NO AIRPORT RUNWAY DATA";
 sel.appendChild(opt);
 fallbackRunwaySelectionChanged();
}

function fallbackSelectedRunway(){
 const point=fallbackPoint(),sel=$("fallbackRunwaySelect");
 if(!point||!sel||sel.value==="MANUAL"||!sel.value)return null;
 const [idxTxt,end]=String(sel.value).split("|");
 const base=(point.runways||[])[Number(idxTxt)];
 if(!base)return null;
 const heading=runwayEndHeading(end) ?? Number(base.heading);
 return{
   ...base,
   runway_id:end||String(base.runway_id||""),
   paired_runway_id:String(base.runway_id||""),
   heading,
   wind_components:runwayWindComponents(point,heading)
 };
}

function fallbackRunwaySelectionChanged(){
 const rw=fallbackSelectedRunway();
 const manualMode=$("fallbackRunwaySelect")?.value==="MANUAL";

 if(rw){
   $("manualRunwayId").value=rw.runway_id||"";
   $("manualRunwayLength").value=Number.isFinite(Number(rw.length_ft))?Number(rw.length_ft):"";
   $("manualRunwayHeading").value=Number.isFinite(Number(rw.heading))?Math.round(Number(rw.heading)):"";
   $("manualRunwayWidth").value=Number.isFinite(Number(rw.width_ft))?Number(rw.width_ft):100;
   $("manualRunwaySurface").value=rw.surface||"Unknown";
 }
 ["manualRunwayId","manualRunwayLength","manualRunwayHeading","manualRunwayWidth","manualRunwaySurface"].forEach(id=>{
   const e=$(id); if(e)e.readOnly=!manualMode;
 });

 const box=$("manualRunwayStatusBox");
 $("manualRunwayStatus").textContent="NOT EVALUATED";
 $("manualRunwayStatus").className="bad";
 if(box)box.className="wx";
 $("manualRunwayStatusNote").textContent="Press PROCESS RUNWAY / WEATHER.";
 $("fallbackWind").textContent="—";
 $("fallbackWeather").textContent="—";
 $("fallbackFieldRequirement").textContent="—";
 $("fallbackFieldMargin").textContent="—";
}

function buildManualFallbackRunway(){
 const id=$("manualRunwayId").value.trim().toUpperCase()||"MANUAL";
 const len=valueOrNull("manualRunwayLength");
 const hdg=valueOrNull("manualRunwayHeading");
 const width=valueOrNull("manualRunwayWidth");
 const surface=$("manualRunwaySurface").value.trim()||"Unknown";
 if(!Number.isFinite(len)||len<=0||!Number.isFinite(hdg)){
   return null;
 }
 const point=fallbackPoint();
 return{
   runway_id:id,
   length_ft:len,
   width_ft:width||null,
   surface,
   heading:hdg,
   manual:true,
   wind_components:runwayWindComponents(point,hdg)
 };
}

function fallbackSetStatus(status,note){
 const b=$("manualRunwayStatus"),box=$("manualRunwayStatusBox");
 if(!b)return;
 b.textContent=status;
 b.className=status==="GO"?"ok":"bad";
 if(box)box.className=status==="GO"?"wx ok":"wx bad";
 $("manualRunwayStatusNote").textContent=note||"";
}

function processFallbackRunway(){
 const target=$("manualRunwayTarget").value;
 const point=fallbackPoint();
 if(!point){
   fallbackSetStatus("NO-GO / NOT EVALUATED","Mission airport/weather data are not loaded.");
   return;
 }

 let rw=fallbackSelectedRunway();
 if(!rw)rw=buildManualFallbackRunway();
 if(!rw){
   fallbackSetStatus("NO-GO / NOT EVALUATED","Runway ID, length and heading are required.");
   return;
 }

 const wc=rw.wind_components||runwayWindComponents(point,Number(rw.heading));
 const hw=Number(wc.headwind_kt),tw=Number(wc.tailwind_kt),xw=Number(wc.crosswind_kt);
 $("fallbackWind").textContent=
   `HW ${Number.isFinite(hw)?hw.toFixed(1):"—"} • TW ${Number.isFinite(tw)?tw.toFixed(1):"—"} • XW ${Number.isFinite(xw)?xw.toFixed(1):"—"} kt`;

 const metar=point.metar||{};
 const oat=Number(firstVal(metar,["temp_c","temperature_c","temp","temperature"]));
 const pa=Number(point.pressure_altitude_ft);
 $("fallbackWeather").textContent=
   `${Number.isFinite(oat)?oat.toFixed(1)+"°C":"OAT —"} • ${Number.isFinite(pa)?Math.round(pa).toLocaleString()+" ft PA":"PA —"}`;

 const weatherLoaded=!!point.metar;
 $("fallbackWindNote").textContent=weatherLoaded
   ?`Calculated for RWY ${rw.runway_id} from current loaded METAR wind.`
   :"No current METAR loaded; wind evaluation unavailable.";

 // Apply selected fallback runway to the active mission runway selector so the
 // rest of FlightOps and TOLD use the same runway end.
 if($("fallbackRunwaySelect")?.value==="MANUAL"){
   point.runways=[rw];
   fillRunwaySelect(target==="DEP"?"depRunway":"destRunway",point.runways);
   const mainSel=$(target==="DEP"?"depRunway":"destRunway");
   if(mainSel)mainSel.selectedIndex=0;
 }else{
   const mainSel=$(target==="DEP"?"depRunway":"destRunway");
   if(mainSel){
     const activeEnd=rw.runway_id;
     const ix=[...mainSel.options].findIndex(o=>{
       const end=String(o.value||"").split("|")[1]||"";
       return end.toUpperCase()===String(activeEnd).toUpperCase();
     });
     if(ix>=0)mainSel.selectedIndex=ix;
   }
 }
 selectedRunwayChanged();

 // Departure fallback: current actual takeoff point and BFL.
 if(target==="DEP"){
   const wt=perfTakeoffWeightLb();
   const cfg=$("toConfig")?.value||"S20";
   const condition=$("toRunwayCondition")?.value||"DRY";
   if(condition!=="DRY"){
     $("fallbackFieldRequirement").textContent="WET SOURCE LOCKED";
     $("fallbackFieldMargin").textContent="No validated wet BFL method loaded.";
     fallbackSetStatus("NO-GO / NOT EVALUATED","Wet-runway takeoff performance is not validated in the current source set.");
     return;
   }
   if(!weatherLoaded||!Number.isFinite(oat)||!Number.isFinite(pa)||!Number.isFinite(wt)||wt<=0){
     $("fallbackFieldRequirement").textContent="DATA REQUIRED";
     $("fallbackFieldMargin").textContent="Weather / PA / TOW incomplete.";
     fallbackSetStatus("NO-GO / NOT EVALUATED","Current weather, pressure altitude and takeoff weight are required.");
     return;
   }

   const r=takeoffAt(cfg,pa,oat,wt);
   if(!r||!Number.isFinite(r.bfl)){
     $("fallbackFieldRequirement").textContent="SOURCE LOCKED";
     $("fallbackFieldMargin").textContent="Selected point outside digitized BFL coverage.";
     fallbackSetStatus("NO-GO / NOT EVALUATED","No extrapolation permitted for the selected runway/weather/weight point.");
     return;
   }

   const margin=Number(rw.length_ft)-r.bfl;
   $("fallbackFieldRequirement").textContent=`BFL ${Math.round(r.bfl).toLocaleString()} ft`;
   $("fallbackFieldMargin").textContent=`Runway margin ${Math.round(margin).toLocaleString()} ft`;

   if(margin<0){
     fallbackSetStatus("NO-GO",`BFL exceeds RWY ${rw.runway_id} available length by ${Math.abs(Math.round(margin)).toLocaleString()} ft.`);
     return;
   }

   // No invented crosswind/tailwind limit: wind components are displayed, but
   // only published/implemented performance gates determine GO.
   fallbackSetStatus("GO",`RWY ${rw.runway_id} field-length check passes for current loaded conditions. Review displayed wind components and all remaining operational gates.`);
   return;
 }

 // Destination fallback: current landing field length against selected runway.
 const land=autoLDG();
 const condition=$("landRunwayCondition")?.value||"DRY";
 if(condition!=="DRY"){
   $("fallbackFieldRequirement").textContent="WET SOURCE LOCKED";
   $("fallbackFieldMargin").textContent="No validated wet landing method loaded.";
   fallbackSetStatus("NO-GO / NOT EVALUATED","Wet-runway landing performance is not validated in the current source set.");
   return;
 }
 if(!weatherLoaded||!Number.isFinite(pa)){
   $("fallbackFieldRequirement").textContent="DATA REQUIRED";
   $("fallbackFieldMargin").textContent="Destination weather / PA incomplete.";
   fallbackSetStatus("NO-GO / NOT EVALUATED","Current destination weather and pressure altitude are required.");
   return;
 }
 if(!land||!Number.isFinite(land.lfl)){
   $("fallbackFieldRequirement").textContent="SOURCE LOCKED";
   $("fallbackFieldMargin").textContent="Landing field length unavailable.";
   fallbackSetStatus("NO-GO / NOT EVALUATED","Landing performance is outside the current digitized source coverage.");
   return;
 }

 const margin=Number(rw.length_ft)-land.lfl;
 $("fallbackFieldRequirement").textContent=`LFL ${Math.round(land.lfl).toLocaleString()} ft`;
 $("fallbackFieldMargin").textContent=`Runway margin ${Math.round(margin).toLocaleString()} ft`;

 if(margin<0){
   fallbackSetStatus("NO-GO",`LFL exceeds RWY ${rw.runway_id} available length by ${Math.abs(Math.round(margin)).toLocaleString()} ft.`);
   return;
 }

 fallbackSetStatus("GO",`RWY ${rw.runway_id} landing field-length check passes for current loaded conditions. Review displayed wind components and NOTAM/runway availability separately.`);
}

// Backward-compatible handler for any older markup/bookmarks.
function applyManualRunway(){processFallbackRunway();}



function selectedDepartureRunway(){return selectedRunwayObj("dep")}
function departurePublishedLength(){const r=selectedDepartureRunway();return r&&Number.isFinite(Number(r.length_ft))?Number(r.length_ft):null}
function effectiveDepartureRunwayAssessment(){
 const runway=selectedDepartureRunway(),published=departurePublishedLength();let state="OPEN",usable=published,source="PUBLISHED",parsed=null;
 if(departureNotams.status==="CHECKED"){parsed=parseRunwayClosureFromNotams(departureNotams.items||[],runway?runway.runway_id:null);departureNotams.runway_parse=parsed;departureNotams.runway_state=parsed.state;departureNotams.usable_length_ft=parsed.usable;state=parsed.state||"OPEN";if(Number.isFinite(parsed.usable))usable=parsed.usable;source=departureNotams.source||"FAA NMS";}
 return{runway,published,usable,state,source,parsed};
}
function updateDepartureRunwayAssessment(){
 const a=effectiveDepartureRunwayAssessment(),r=a.runway,bfl=valueOrNull("perfBFL");
 if($("depNotamRunwayState"))$("depNotamRunwayState").textContent=a.state||"—";
 if($("depPublishedTora"))$("depPublishedTora").textContent=Number.isFinite(a.published)?`${Math.round(a.published).toLocaleString()} ft`:"—";
 if($("depUsableTora"))$("depUsableTora").textContent=Number.isFinite(a.usable)?`${Math.round(a.usable).toLocaleString()} ft`:"—";
 if($("depNotamImpact")&&departureNotams.status==="CHECKED")$("depNotamImpact").textContent=runwayImpactSummary(a.parsed,r?r.runway_id:null);
 if(r&&!perfIsManual()&&Number.isFinite(a.usable))$("perfRwyLen").value=Math.round(a.usable);
 const box=$("takeoffRunwayGateBox"),gate=$("takeoffRunwayGate"),note=$("takeoffRunwayGateNote");if(!box||!gate||!note)return;
 if(!r||!Number.isFinite(a.usable)){gate.textContent="NOT EVALUATED";note.textContent="Departure runway/usable length unavailable.";box.className="runway-gate warn";}
 else if(a.state==="CLOSED"){gate.textContent="NO-GO";note.textContent=`Selected runway ${r.runway_id} is CLOSED.`;box.className="runway-gate bad";}
 else if(Number.isFinite(bfl)&&bfl>a.usable){gate.textContent="NO-GO";note.textContent=`BFL exceeds usable runway by ${Math.round(bfl-a.usable).toLocaleString()} ft.`;box.className="runway-gate bad";}
 else if(departureNotams.status==="CHECKED"){const margin=Number.isFinite(bfl)?Math.round(a.usable-bfl).toLocaleString():"—";gate.textContent="PASS";note.textContent=`FAA NMS checked • RWY ${r.runway_id} ${a.state} • usable ${Math.round(a.usable).toLocaleString()} ft${margin!=="—"?` • margin ${margin} ft`:""}`;box.className="runway-gate ok";}
 else{gate.textContent="NOTAM REVIEW REQUIRED";note.textContent="Runway data loaded; FAA NMS departure review is not complete.";box.className="runway-gate warn";}
}
async function refreshDepartureNotams(force=false){
 await checkNotamConnection();const dep=cleanICAO($("dep")?.value||""),r=selectedDepartureRunway();if(!dep)return;
 if($("depNotamStatus")){$("depNotamStatus").textContent="CHECKING…";$("depNotamStatus").className="warn"}if($("depNotamList"))$("depNotamList").textContent="Requesting current departure NOTAM data…";
 try{const res=await fetch(`/api/notams?icao=${encodeURIComponent(dep)}`),j=await res.json();if(!res.ok||!j.ok)throw new Error(j.message||"FAA NMS unavailable");
   const items=Array.isArray(j.items)?j.items:[],parsed=parseRunwayClosureFromNotams(items,r?r.runway_id:null);departureNotams={status:"CHECKED",source:j.source||"FAA NMS",items,runway_state:parsed.state,usable_length_ft:parsed.usable,runway_parse:parsed,checked_at:j.checked_at||new Date().toISOString()};
   if($("depNotamStatus")){$("depNotamStatus").textContent="CHECKED";$("depNotamStatus").className="ok"}if($("depNotamSource"))$("depNotamSource").textContent=departureNotams.source;
   if($("depNotamImpact"))$("depNotamImpact").textContent=runwayImpactSummary(parsed,r?r.runway_id:null);
   if($("depNotamList"))$("depNotamList").innerHTML=items.length?items.slice(0,50).map(n=>`<div class="notam-item">${esc(n.raw||n.text||n.message||String(n))}</div>`).join(""):"No NOTAMs returned for this airport.";
   const hits=classifyObstacleNotams(items);departureObstacleReview={status:hits.length?"FLAGGED":"REVIEWED",airport:dep,items:hits,checked_at:departureNotams.checked_at,message:null};renderDepartureObstacleReview();
 }catch(e){departureNotams={status:"UNAVAILABLE",source:"ERROR",items:[],runway_state:null,usable_length_ft:null,checked_at:new Date().toISOString()};if($("depNotamStatus")){ $("depNotamStatus").textContent="NOT AVAILABLE";$("depNotamStatus").className="warn"}if($("depNotamSource"))$("depNotamSource").textContent=String(e.message||e);if($("depNotamList"))$("depNotamList").textContent="Manual departure NOTAM verification required.";}
 updateDepartureRunwayAssessment();syncTakeoffSection();updateToldCard();scheduleDraftSave();return departureNotams;
}

function selectedLandingRunway(){return selectedRunwayObj("dest")}
function runwayPublishedLength(){
 const r=selectedLandingRunway();
 return r&&Number.isFinite(Number(r.length_ft))?Number(r.length_ft):null;
}
function normRunwayId(v){
 return String(v||"").toUpperCase().trim().replace(/^0(?=\d)/,"");
}
function selectedRunwayMention(raw,runwayId){
 const id=normRunwayId(runwayId);if(!id)return /\bRWY\b|\bRUNWAY\b/.test(raw);
 const padded=/^\d$/.test(id)?`0${id}`:id;
 const ids=[id,padded].filter((v,i,a)=>a.indexOf(v)===i).map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
 const token=ids.join("|");
 return new RegExp(`\\b(?:RWY|RUNWAY)\\s+(?:${token})(?=\\b|/|\\s)`).test(raw) ||
        new RegExp(`\\b(?:RWY|RUNWAY)\\s+[0-9]{1,2}[LCR]?/(?:${token})\\b`).test(raw);
}
function notamOperationalBody(raw){
 let body=String(raw||"").toUpperCase().replace(/\s+/g," ").trim();
 // Strip standard domestic NOTAM prefix, e.g. !BPT 11/004 BPT ...
 body=body.replace(/^!?[A-Z0-9]{3,4}\s+\d{2}\/\d{3,4}\s+/,"");
 // Most domestic NOTAMs repeat the location after the number.
 body=body.replace(/^[A-Z0-9]{3,4}\s+/,"");
 return body.trim();
}
function runwayIdsFromSubject(subject){
 const ids=[];
 for(const m of String(subject||"").matchAll(/\b(?:RWY|RUNWAY)\s+([0-9]{1,2}[LCR]?(?:\s*\/\s*[0-9]{1,2}[LCR]?)?)/g)){
   String(m[1]||"").split("/").map(normRunwayId).forEach(x=>{if(x&&!ids.includes(x))ids.push(x)});
 }
 return ids;
}
function explicitSelectedRunwayClosure(raw,runwayId){
 const id=normRunwayId(runwayId);if(!id)return false;
 const body=notamOperationalBody(raw);
 // Critical safety rule: only the facility that is the SUBJECT of the NOTAM may be closed.
 // Example that must NOT close RWY 12/30:
 //   TWY E BTN TWY D AND RWY 12/30 CLSD
 // The closed subject there is TWY E, not the runway.
 if(!/^(?:RWY|RUNWAY)\s+/.test(body))return false;
 const clsd=body.search(/\bCLSD\b/);if(clsd<0)return false;
 const subject=body.slice(0,clsd);
 return runwayIdsFromSubject(subject).includes(id);
}
function explicitSelectedRunwayRestriction(raw,runwayId){
 const id=normRunwayId(runwayId);if(!id)return null;
 const body=notamOperationalBody(raw);
 if(!/^(?:RWY|RUNWAY)\s+/.test(body))return null;
 if(!runwayIdsFromSubject(body).includes(id))return null;
 let usable=null;
 for(const p of [
   /(?:LDA|USABLE|AVBL|AVAILABLE|TORA)\D{0,16}(\d{3,5})\s*FT/,
   /(\d{3,5})\s*FT\D{0,16}(?:USABLE|AVBL|AVAILABLE)/
 ]){
   const m=body.match(p);if(m){const v=Number(m[1]);if(Number.isFinite(v))usable=usable==null?v:Math.min(usable,v)}
 }
 const restricted=/\bRSTR\b|\bRESTRICTED\b/.test(body);
 return Number.isFinite(usable)||restricted?{usable,restricted}:null;
}
function parseRunwayClosureFromNotams(items, runwayId){
 let state="OPEN",usable=null,matched=[],closureMatches=[],restrictionMatches=[],advisoryMatches=[];
 for(const n of items||[]){
   const raw=String(n.raw||n.text||n.message||n||"").toUpperCase().replace(/\s+/g," ").trim();
   if(!raw||!selectedRunwayMention(raw,runwayId))continue;
   matched.push(raw);
   if(explicitSelectedRunwayClosure(raw,runwayId)){
     state="CLOSED";closureMatches.push(raw);continue;
   }
   const rr=explicitSelectedRunwayRestriction(raw,runwayId);
   if(rr){
     if(Number.isFinite(rr.usable))usable=usable==null?rr.usable:Math.min(usable,rr.usable);
     if(state!=="CLOSED")state="RESTRICTED";
     restrictionMatches.push(raw);
   }else{
     // ILS/LOC/GP, lighting, taxiway, procedure, obstacle, and other notices that
     // merely mention the runway are advisories unless the runway itself is the subject.
     advisoryMatches.push(raw);
   }
 }
 return{state,usable,matched,closureMatches,restrictionMatches,advisoryMatches};
}
function runwayImpactSummary(parsed,runwayId){
 const id=runwayId||"—";
 if(!parsed)return`RWY ${id}: NOTAM impact not evaluated.`;
 if(parsed.state==="CLOSED"){const t=parsed.closureMatches[0]||"";return`RWY ${id}: CLOSED by ${parsed.closureMatches.length} explicit runway-subject closure NOTAM${parsed.closureMatches.length===1?"":"s"}${t?` • Trigger: ${t.slice(0,180)}`:""}.`;}
 if(parsed.state==="RESTRICTED")return`RWY ${id}: RESTRICTED by ${parsed.restrictionMatches.length} runway-specific NOTAM${parsed.restrictionMatches.length===1?"":"s"}${Number.isFinite(parsed.usable)?` • usable ${Math.round(parsed.usable).toLocaleString()} ft`:""}.`;
 if(parsed.advisoryMatches.length)return`RWY ${id}: OPEN • ${parsed.advisoryMatches.length} runway-related advisory NOTAM${parsed.advisoryMatches.length===1?"":"s"} • no explicit closure/usable-length reduction identified.`;
 return`RWY ${id}: OPEN • no runway-specific closure or usable-length restriction identified.`;
}
function effectiveLandingRunwayAssessment(){
 const runway=selectedLandingRunway(),published=runwayPublishedLength();
 const manualStatus=$("manualRunwayStatusOverride")?.value||"";
 const manualLen=valueOrNull("manualUsableLda");
 let state="OPEN",usable=published,source="PUBLISHED",parsed=null;
 if(currentNotams.status==="CHECKED"){
   parsed=parseRunwayClosureFromNotams(currentNotams.items||[],runway?runway.runway_id:null);currentNotams.runway_parse=parsed;currentNotams.runway_state=parsed.state;currentNotams.usable_length_ft=parsed.usable;
   state=parsed.state||"OPEN";
   if(Number.isFinite(parsed.usable))usable=parsed.usable;
   source=currentNotams.source||"NOTAM";
 }
 if(manualStatus){state=manualStatus;source="MANUAL OVERRIDE";}
 if(Number.isFinite(manualLen)&&manualLen>0){usable=manualLen;source=manualStatus?source:"MANUAL LENGTH";}
 return{runway,published,usable,state,source,parsed};
}
function updateLandingRunwayAssessment(){
 const a=effectiveLandingRunwayAssessment(),r=a.runway,lfl=valueOrNull("landFieldLen");
 if($("notamRunwayState"))$("notamRunwayState").textContent=a.state||"—";
 if($("publishedLda"))$("publishedLda").textContent=Number.isFinite(a.published)?`${Math.round(a.published).toLocaleString()} ft`:"—";
 if($("usableLda"))$("usableLda").textContent=Number.isFinite(a.usable)?`${Math.round(a.usable).toLocaleString()} ft`:"—";
 if($("landUsableLen"))$("landUsableLen").value=Number.isFinite(a.usable)?Math.round(a.usable):"";
 if($("notamRunwayImpact")&&currentNotams.status==="CHECKED")$("notamRunwayImpact").textContent=runwayImpactSummary(a.parsed,r?r.runway_id:null);
 const box=$("landingRunwayGateBox"),gate=$("landingRunwayGate"),note=$("landingRunwayGateNote");
 if(!box||!gate||!note)return;
 if(!r||!Number.isFinite(a.usable)){gate.textContent="NOT EVALUATED";note.textContent="Destination runway/usable length unavailable.";box.className="runway-gate warn";}
 else if(a.state==="CLOSED"){gate.textContent="NO-GO";note.textContent=`Selected runway ${r.runway_id} is CLOSED.`;box.className="runway-gate bad";}
 else if(!Number.isFinite(lfl)){gate.textContent="NOT FULLY EVALUATED";note.textContent="Landing field length required is not available.";box.className="runway-gate warn";}
 else if(lfl>a.usable){gate.textContent="NO-GO";note.textContent=`LFL exceeds usable runway by ${Math.round(lfl-a.usable).toLocaleString()} ft.`;box.className="runway-gate bad";}
 else{
   const margin=Math.round(a.usable-lfl).toLocaleString();
   if(currentNotams.status==="CHECKED"){
     gate.textContent="PASS";
     note.textContent=`Runway length + NOTAM check pass • Margin ${margin} ft • ${a.state}`;
     box.className="runway-gate ok";
   }else{
     gate.textContent="NOTAM REVIEW REQUIRED";
     note.textContent=`Runway length passes by ${margin} ft, but the FAA NMS review is unavailable or incomplete.`;
     box.className="runway-gate warn";
   }
 }
}
async function checkNotamConnection(){
 const e=$("notamConnectionState");
 try{
   const r=await fetch("/api/notams/config",{cache:"no-store"});
   const ct=String(r.headers.get("content-type")||"").toLowerCase();
   if(!ct.includes("application/json")){
     if(e){e.textContent="BACKEND BUILD MISMATCH — REDEPLOY SERVER";e.className="small bad";}
     return false;
   }
   const j=await r.json();
   if(j.configured&&j.authenticated){
     const env=String(j.environment||"STAGING").toUpperCase();
     if(e){e.textContent="AUTHENTICATED";e.className="small ok";}
     return true;
   }
   if(j.configured&&!j.authenticated){
     const msg=String(j.message||"OAuth2 authentication failed").replace(/NMS OAuth2 token request failed:\s*/i,"");
     if(e){e.textContent=`FAA NMS AUTH FAILED — ${msg}`;e.className="small bad";}
     return false;
   }
   if(e){e.textContent="FAA NMS OAUTH2 NOT CONFIGURED";e.className="small warn";}
   return false;
 }catch(err){
   if(e){e.textContent="BACKEND NOTAM ENDPOINT UNAVAILABLE — REDEPLOY";e.className="small bad";}
   return false;
 }
}


function obstacleNotamText(n){
 return String((n&&(n.raw||n.text||n.message||n.featureText||n.description))||"").toUpperCase();
}
function classifyObstacleNotams(items){
 const rx=/\b(OBST|OBSTACLE|TOWER|CRANE|MAST|STACK|POLE|ANTENNA)\b/;
 return (Array.isArray(items)?items:[]).filter(n=>rx.test(obstacleNotamText(n)));
}
function renderDepartureObstacleReview(){
 const b=$("autoObstacleReview"),n=$("autoObstacleReviewNote"); if(!b||!n)return;
 const r=departureObstacleReview||{status:"NOT_CHECKED",items:[]};
 if(r.status==="FLAGGED"){
   b.textContent=`ATTENTION • ${r.items.length} OBSTACLE NOTAM${r.items.length===1?"":"S"}`;b.className="warn";
   n.textContent="FAA NMS departure NOTAM scan found obstacle-related text. Pilot review required; this is not a takeoff obstacle-clearance analysis.";
 }else if(r.status==="REVIEWED"){
   b.textContent="NO OBSTACLE NOTAMS IDENTIFIED";b.className="ok";
   n.textContent="FAA NMS departure NOTAM scan complete. This does not evaluate terrain, surveyed obstacles, departure path, or certified obstacle clearance.";
 }else if(r.status==="UNAVAILABLE"){
   b.textContent="AUTO REVIEW UNAVAILABLE";b.className="warn";
   n.textContent=r.message||"FAA NMS departure NOTAM scan unavailable — manual review required.";
 }else{
   b.textContent="NOT CHECKED";b.className="warn";
   n.textContent="FAA NMS departure NOTAM scan only — not a clearance analysis.";
 }
}
async function refreshDepartureObstacleReview(force=false){
 const dep=cleanICAO($("dep")?.value||"");
 if(!dep){departureObstacleReview={status:"UNAVAILABLE",airport:null,items:[],checked_at:new Date().toISOString(),message:"Departure airport unavailable."};renderDepartureObstacleReview();return departureObstacleReview;}
 const age=departureObstacleReview.checked_at?Date.now()-new Date(departureObstacleReview.checked_at).getTime():Infinity;
 if(!force&&departureObstacleReview.airport===dep&&age<300000&&["REVIEWED","FLAGGED"].includes(departureObstacleReview.status)){renderDepartureObstacleReview();return departureObstacleReview;}
 try{
   const res=await fetch(`/api/notams?icao=${encodeURIComponent(dep)}`),j=await res.json();
   if(!res.ok||!j.ok)throw new Error(j.message||"FAA NMS unavailable");
   const items=Array.isArray(j.items)?j.items:[],hits=classifyObstacleNotams(items);
   departureObstacleReview={status:hits.length?"FLAGGED":"REVIEWED",airport:dep,items:hits,checked_at:j.checked_at||new Date().toISOString(),message:null};
 }catch(e){
   departureObstacleReview={status:"UNAVAILABLE",airport:dep,items:[],checked_at:new Date().toISOString(),message:`FAA NMS departure obstacle review unavailable — ${String(e.message||e)}`};
 }
 renderDepartureObstacleReview();
 return departureObstacleReview;
}

async function refreshNotams(){
 await checkNotamConnection();
 const dest=cleanICAO($("dest").value),r=selectedLandingRunway();
 if(!dest){alert("Enter/load a destination first.");return}
 $("notamStatus").textContent="CHECKING…";$("notamStatus").className="warn";$("notamList").textContent="Requesting current NOTAM data…";
 try{
   const res=await fetch(`/api/notams?icao=${encodeURIComponent(dest)}`),j=await res.json();
   if(!res.ok||!j.ok){
     currentNotams={status:"UNAVAILABLE",source:j.source||"NONE",items:[],runway_state:null,usable_length_ft:null,checked_at:new Date().toISOString()};
     $("notamStatus").textContent="NOT AVAILABLE";$("notamStatus").className="warn";$("notamSource").textContent=j.message||"FAA NMS unavailable.";if($("notamConnectionState")){const m=String(j.message||"");$("notamConnectionState").textContent=j.configured===false?"FAA NMS OAUTH2 NOT CONFIGURED":(m?`FAA NMS ERROR — ${m.replace(/NMS OAuth2 token request failed:\s*/i,"")}`:"FAA NMS UNAVAILABLE");$("notamConnectionState").className="small bad";}
     $("notamList").textContent="Manual NOTAM verification required.";updateLandingRunwayAssessment();updateToldCard();return;
   }
   const items=Array.isArray(j.items)?j.items:[],parsed=parseRunwayClosureFromNotams(items,r?r.runway_id:null);
   currentNotams={status:"CHECKED",source:j.source||"FAA NMS",items,runway_state:parsed.state,usable_length_ft:parsed.usable,runway_parse:parsed,checked_at:j.checked_at||new Date().toISOString()};
   $("notamStatus").textContent="CHECKED";$("notamStatus").className="ok";$("notamSource").textContent=currentNotams.source;if($("notamConnectionState")){ $("notamConnectionState").textContent="AUTHENTICATED"; $("notamConnectionState").className="small ok";}
   if($("notamRunwayImpact"))$("notamRunwayImpact").textContent=runwayImpactSummary(parsed,r?r.runway_id:null);
   $("notamList").innerHTML=items.length?items.slice(0,50).map(n=>`<div class="notam-item">${esc(n.raw||n.text||n.message||String(n))}</div>`).join(""):"No NOTAMs returned for this airport.";
   updateLandingRunwayAssessment();applyLandingRunwayGateToStatus();updateToldCard();scheduleDraftSave();
 }catch(e){
   currentNotams={status:"UNAVAILABLE",source:"ERROR",items:[],runway_state:null,usable_length_ft:null,checked_at:new Date().toISOString()};
   $("notamStatus").textContent="NOT AVAILABLE";$("notamStatus").className="warn";$("notamSource").textContent="NOTAM request failed.";
   $("notamList").textContent="Manual NOTAM verification required.";updateLandingRunwayAssessment();applyLandingRunwayGateToStatus();updateToldCard();
 }
}
function applyLandingRunwayGateToStatus(){
 if(!$("landStatus"))return;
 const a=effectiveLandingRunwayAssessment(),lfl=valueOrNull("landFieldLen"),existing=textOf("landStatus");
 if(a.state==="CLOSED"){$("landStatus").textContent="NO-GO • SELECTED RUNWAY CLOSED";$("landStatus").className="bad";return}
 if(Number.isFinite(lfl)&&Number.isFinite(a.usable)&&lfl>a.usable){$("landStatus").textContent="NO-GO • LFL EXCEEDS USABLE RUNWAY";$("landStatus").className="bad";return}
 if(currentNotams.status!=="CHECKED"&&!existing.includes("NO-GO")){$("landStatus").textContent=(existing==="—"?"TABLE DATA READY":existing)+" • NOTAM VERIFY";$("landStatus").className="warn"}
}

function depTempC(){if(!missionData)return null;const m=missionData.departure.metar||{};for(const v of [m.temp_c,m.temperature_c,m.temp,m.temperature]){if(v===null||v===undefined||v==="")continue;const n=Number(v);if(Number.isFinite(n))return n}return null}
function destTempC(){if(!missionData)return null;const m=missionData.destination.metar||{};for(const v of [m.temp_c,m.temperature_c,m.temp,m.temperature]){if(v===null||v===undefined||v==="")continue;const n=Number(v);if(Number.isFinite(n))return n}return null}
function autoTO(){
 const cfg=$("toConfig").value,d=FS_PERF.takeoff[cfg],weightLb=perfTakeoffWeightLb(),wk=(weightLb||0)/1000;
 const vr=d?interpScalarN(d.vr,wk):null;
 const vfr=d?interpScalarN(d.vfr,wk):null;
 const v15vs=d?interpScalarN(d.v15vs,wk):null;
 if(vr!=null)$("perfVR").value=vr.toFixed(1);else $("perfVR").value="";
 const runwayCondition=$("toRunwayCondition")?$("toRunwayCondition").value:"DRY";
 let pa=perfTakeoffPA(),t=perfTakeoffTemp(),r=null,reason="";
 if(runwayCondition==="WET"){
   reason=cfg==="S20"?"Wet runway selected — DTM813 5.46A wet BFL/V1 curves identified but not yet digitized/validated":"Wet runway selected — DTM813 5.51A wet BFL/V1 curves identified but not yet digitized/validated";
 }else if(!Number.isFinite(pa))reason=perfIsManual()?"Enter manual pressure altitude":"Departure pressure altitude unavailable";
 else if(t==null||!Number.isFinite(t))reason=perfIsManual()?"Enter manual temperature":"Departure temperature unavailable";
 else if(d){
   let lookupPA=pa,paBasis="actual";const minPA=Math.min(...kN(d.tables));
   if(pa<minPA&&minPA===0&&pa>=-1000){lookupPA=0;paBasis="SEA LEVEL row"}
   r=fsTakeoff(cfg,lookupPA,t,wk);
   if(!r)reason="V1/BFL outside digitized FlightSafety table range";else r.paBasis=paBasis
 }
 if(r){$("perfV1").value=r.v1.toFixed(1);$("perfBFL").value=Math.round(r.bfl)}else{$("perfV1").value="";$("perfBFL").value=""}
 return{ok:vr!=null||vfr!=null||v15vs!=null||!!r,cfg,runwayCondition,vr,vfr,v15vs,v1:r?r.v1:null,bfl:r?r.bfl:null,paBasis:r?r.paBasis:null,msg:reason,pa,temp:t,weightLb}
}
function autoLDG(){
 if(!missionData)return{ok:false,msg:"Load mission first",vref:null,lfl:null,ld:null};
 const cfg=$("landConfig").value,d=FS_PERF.landing[cfg],wk=(valueOrNull("landWt")||0)/1000;
 const published=d?interpScalarN(d.speed,wk):null;const vref=published==null?null:(cfg==="S20"?published-5:published);
 if(vref!=null)$("landVref").value=vref.toFixed(1);else $("landVref").value="";
 let pa=Number(missionData.destination.pressure_altitude_ft),r=null,reason="";
 if(!Number.isFinite(pa))reason="Destination pressure altitude unavailable";else if(d){
   let lookupPA=pa,paBasis="actual";const minPA=Math.min(...kN(d.tables));if(pa<minPA&&minPA===0&&pa>=-1000){lookupPA=0;paBasis="SEA LEVEL row"}
   r=fsLanding(cfg,lookupPA,wk);if(!r)reason="Landing distance outside digitized FlightSafety table range";else r.paBasis=paBasis
 }
 if(r)$("landFieldLen").value=Math.round(r.lfl);else $("landFieldLen").value="";
 return{ok:vref!=null||!!r,cfg,vref,speed:published,speedLabel:d?.speedLabel||"VREF",ld:r?r.ld:null,lfl:r?r.lfl:null,paBasis:r?r.paBasis:null,msg:reason}
}

function syncLandingSection(){
 updateRunwayConditionWarnings();
 const surface=$("landRunwayCondition").value;
 const cfg=$("landConfig").value,d=FS_PERF.landing[cfg],a=autoLDG();
 const ai=$("landAntiIce")?.value||"OFF";
 const pa=missionData?Number(missionData.destination.pressure_altitude_ft):null;
 const oat=destTempC();
 const afms=afmsRevCLandingClimbLimit(cfg,ai,pa,oat);
 if(Number.isFinite(afms.limit))$("landClimbWt").value=Math.round(afms.limit);else $("landClimbWt").value="";
 const wt=valueOrNull("landWt"),rwy=valueOrNull("landUsableLen")||valueOrNull("landRwyLen"),climb=valueOrNull("landClimbWt");
 const structural=maxLand;
 const maxAllow=climb==null?structural:Math.min(structural,climb);
 const limiting=climb!=null&&climb<structural?"AFMS landing climb":"Structural landing";
 const wtMargin=wt==null?null:maxAllow-wt;
 const rwyMargin=(rwy==null||a.lfl==null)?null:rwy-a.lfl;

 $("landMax").textContent=maxAllow.toLocaleString()+" lb";
 $("landLimit").textContent=climb==null?`AFMS landing climb not evaluated • ${afms.basis||"source coverage pending"}`:(afms.noLimitation?"Structural landing • AFMS climb not limiting":`${limiting} • ${afms.source}`);
 $("landWtMargin").textContent=wtMargin==null?"—":`${Math.round(wtMargin).toLocaleString()} lb`;
 $("landRwyMargin").textContent=rwyMargin==null?"—":`${Math.round(rwyMargin).toLocaleString()} ft`;

 const parts=[];
 if(a.vref!=null)parts.push(`VREF ${a.vref.toFixed(1)} kt`);
 if(a.lfl!=null)parts.push(`LFL ${Math.round(a.lfl).toLocaleString()} ft`);
 $("landDataSummary").textContent=parts.length?`${surface} • ${d.label} • ${parts.join(" • ")}`:"—";

 if(!missionData){
   $("landStatus").textContent="LOAD MISSION";$("landStatus").className="warn";
   $("landConfigNote").textContent="Load mission airport and weather data to calculate destination landing performance.";
   return a;
 }
 const hardFail=(wtMargin!=null&&wtMargin<0)||(rwyMargin!=null&&rwyMargin<0);
 if(surface==="WET"){
   $("landStatus").textContent="WET SELECTED • FACTOR/METHOD PENDING";$("landStatus").className="warn";
   $("landConfigNote").textContent="WET runway selected. Dry landing table values are displayed as source reference only; no wet factor is applied until the operator-specific wet landing method is defined.";
 }else if(hardFail){
   $("landStatus").textContent="NO-GO";$("landStatus").className="bad";
 }else if(a.vref!=null&&a.lfl!=null&&climb!=null){
   $("landStatus").textContent=afms.noLimitation?"GO • AFMS CLIMB NOT LIMITING":"GO • AFMS LANDING CLIMB PASS";$("landStatus").className="ok";
 }else if(a.vref!=null&&a.lfl!=null){
   $("landStatus").textContent=ai!=="OFF"?"PENDING • LANDING A/I CLIMB SOURCE":"PENDING • AFMS LANDING CLIMB SOURCE COVERAGE";$("landStatus").className="warn";
 }else if(a.vref!=null){
   $("landStatus").textContent="PARTIAL AUTO DATA";$("landStatus").className="warn";
 }else{
   $("landStatus").textContent="SOURCE LOCKED";$("landStatus").className="warn";
 }
 const note=[`${d.label} selected`,`A/I ${ai}`];
 if(Number.isFinite(oat))note.push(`OAT ${oat.toFixed(1)}°C`);
 if(Number.isFinite(pa))note.push(`PA ${Math.round(pa).toLocaleString()} ft`);
 if(a.vref!=null)note.push(`VREF ${a.vref.toFixed(1)} kt`);
 if(a.lfl!=null)note.push(`LFL ${Math.round(a.lfl).toLocaleString()} ft`);
 if(climb!=null)note.push(`${afms.noLimitation?"AFMS climb not limiting":`AFMS climb limit ${Math.round(climb).toLocaleString()} lb`}`);
 else note.push(afms.basis||"AFMS landing climb source coverage pending");
 if(a.msg)note.push(a.msg);
 $("landConfigNote").textContent=note.join(" • ");
 updateLandingRunwayAssessment();
 applyLandingRunwayGateToStatus();
 return a;
}

async function evaluateTakeoff(){
 await refreshDepartureObstacleReview(false);
 const a=syncTakeoffSection();
 const fieldWt=autoFieldLimitedWeight(),climb=autoClimbAssessment();
 const sourceCeiling=takeoffFieldSourceCeilingLb(a.cfg,perfTakeoffPA(),perfTakeoffTemp());
 const fieldBasis=Number.isFinite(fieldWt)&&Number.isFinite(sourceCeiling)&&Math.abs(fieldWt-sourceCeiling)<75?"SOURCE_CEILING":"FIELD_LENGTH";
 const body={
   runway_length_ft:perfTakeoffRunwayLen(),
   actual_takeoff_weight_lb:perfTakeoffWeightLb(),
   climb_limited_weight_lb:Number.isFinite(climb.limit)?climb.limit:null,
   field_limited_weight_lb:Number.isFinite(fieldWt)?fieldWt:null,
   field_limit_basis:fieldBasis,
   balanced_field_length_ft:valueOrNull("perfBFL"),
   v1_kt:valueOrNull("perfV1"),
   vr_v2_kt:valueOrNull("perfVR"),
   obstacle_clearance_verified:$("perfObs").value===""?null:$("perfObs").value==="true"
 };
 try{
   const r=await fetch(apiUrl("/api/performance/takeoff"),{
     method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
   });
   const j=await r.json();
   if(j.error)throw new Error(j.error);

   $("toMax").textContent=(j.source_evaluated_max_takeoff_weight_lb??j.max_allowable_takeoff_weight_lb).toLocaleString()+" lb";
   $("toMax").title=`Structural MTOW ${Number(j.structural_mtow_lb||40780).toLocaleString()} lb • ${j.limiting_factor?.[0]||"source-evaluated limit"}`;
   $("toWtMargin").textContent=`${j.weight_margin_lb.toLocaleString()} lb`;
   $("toRwyMargin").textContent=j.runway_margin_ft==null?"—":`${j.runway_margin_ft.toLocaleString()} ft`;
   if(j.limiting_factor?.[0]==="Field source coverage")
     $("toLimit").textContent=`FIELD SOURCE EVALUATED THROUGH ${j.max_allowable_takeoff_weight_lb.toLocaleString()} lb • STRUCTURAL MTOW 40,780 lb`;

   if(climb.pass===false){
     $("toStatus").textContent="NO-GO • SECOND-SEGMENT CLIMB";$("toStatus").className="bad";
     $("toLimit").textContent=Number.isFinite(climb.gradient)
       ?`QRH REF GCLB2 ${climb.gradient.toFixed(2)}% < ${QRH_CLIMB_MIN_GROSS.toFixed(1)}% minimum`
       :"AFMS SECOND-SEGMENT CLIMB LIMIT FAIL";
     return;
   }
   if(j.status==="NO-GO"){
     $("toStatus").textContent="NO-GO";$("toStatus").className="bad";
     return;
   }

   const pending=[];
   const depAssessment=effectiveDepartureRunwayAssessment();
   if(depAssessment.state==="CLOSED"){
     $("toStatus").textContent="NO-GO • SELECTED DEPARTURE RUNWAY CLOSED";$("toStatus").className="bad";updateDepartureRunwayAssessment();updateToldCard();return;
   }
   if(departureNotams.status!=="CHECKED")pending.push("DEPARTURE NOTAM REVIEW");
   if(!Number.isFinite(fieldWt))pending.push("FIELD LIMIT");
   if(!Number.isFinite(climb.limit))pending.push("AFMS CLIMB SOURCE COVERAGE PENDING");
   const obs=departureObstacleReview||{status:"NOT_CHECKED",items:[]};
   if($("perfObs").value==="false"){
     $("toStatus").textContent="NO-GO • OBSTACLE CLEARANCE NOT CONFIRMED";$("toStatus").className="bad";return;
   }
   if(obs.status==="FLAGGED")pending.push("AUTO OBSTACLE REVIEW FLAGGED");
   else if(obs.status==="UNAVAILABLE")pending.push("AUTO OBSTACLE REVIEW UNAVAILABLE");
   else if(obs.status!=="REVIEWED")pending.push("AUTO OBSTACLE REVIEW PENDING");

   if(j.status==="GO"&&!pending.length){
     $("toStatus").textContent=climb.noLimitation?"PASS • TAKEOFF PERFORMANCE • AUTO OBSTACLE REVIEW COMPLETE":"PASS • TAKEOFF PERFORMANCE / CLIMB • AUTO OBSTACLE REVIEW COMPLETE";
     $("toStatus").className="ok";
   }else if(j.status==="GO"&&Number.isFinite(fieldWt)&&Number.isFinite(climb.limit)){
     $("toStatus").textContent=obs.status==="FLAGGED"?"PERFORMANCE PASS • OBSTACLE NOTAM REVIEW REQUIRED":"PERFORMANCE PASS • AUTO OBSTACLE REVIEW INCOMPLETE";
     $("toStatus").className="warn";
   }else{
     $("toStatus").textContent=pending.length?`PENDING • ${pending.join(" • ")}`:"TABLE DATA READY";
     $("toStatus").className="warn";
   }
   updateDepartureRunwayAssessment();
   const depGate=effectiveDepartureRunwayAssessment();
   if(Number.isFinite(depGate.usable)&&Number.isFinite(valueOrNull("perfBFL"))&&valueOrNull("perfBFL")>depGate.usable){$("toStatus").textContent="NO-GO • BFL EXCEEDS USABLE DEPARTURE RUNWAY";$("toStatus").className="bad";}
   const gradText=Number.isFinite(climb.gradient)?`QRH REF GCLB2 ${climb.gradient.toFixed(2)}%`:`QRH GRADIENT REFERENCE UNAVAILABLE`;
   $("toConfigNote").textContent=`${FS_PERF.takeoff[a.cfg].label} field data calculated • ${gradText} • climb limit ${Math.round(climb.limit).toLocaleString()} lb • A/I ${climb.ai} • FAA NMS automated obstacle NOTAM review: ${obs.status}; not a certified obstacle-clearance analysis.`;
 }catch(e){
   $("toStatus").textContent="EVALUATION ERROR";$("toStatus").className="bad";
   $("toLimit").textContent=String(e.message||e);
 }
}

async function evaluateLanding(){
 const a=syncLandingSection();
 if(!a.ok){$("landStatus").textContent="SOURCE LOCKED";$("landStatus").className="warn";return}
 const body={runway_length_ft:valueOrNull("landUsableLen")||valueOrNull("landRwyLen"),actual_landing_weight_lb:valueOrNull("landWt"),climb_limited_weight_lb:valueOrNull("landClimbWt"),landing_field_length_ft:valueOrNull("landFieldLen"),vref_kt:valueOrNull("landVref")};
 try{
   const r=await fetch(apiUrl("/api/performance/landing"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),j=await r.json();
   if(j.error)throw new Error(j.error);
   $("landMax").textContent=j.max_allowable_landing_weight_lb.toLocaleString()+" lb";
   $("landLimit").textContent=j.limiting_factor;
   $("landWtMargin").textContent=`${j.weight_margin_lb.toLocaleString()} lb`;
   $("landRwyMargin").textContent=j.runway_margin_ft==null?"—":`${j.runway_margin_ft.toLocaleString()} ft`;
   if(j.status==="NO-GO"){$("landStatus").textContent="NO-GO";$("landStatus").className="bad"}
   else{syncLandingSection();}
   applyLandingRunwayGateToStatus();
   $("landStatus").title=`${FS_PERF.landing[a.cfg].label} • A/I ${$("landAntiIce")?.value||"OFF"} • ${a.speedLabel} ${a.speed==null?"—":a.speed.toFixed(1)} kt • LFL ${a.lfl==null?"—":Math.round(a.lfl)} ft • AFMS ${AFMS_REVC_LDG_CLIMB_SOURCE[a.cfg]||"landing climb source"}`;
   updateVSpeedCard(perfTakeoffWeightLb()||0,valueOrNull("landWt")||0);updateToldCard();scheduleDraftSave();
 }catch(e){$("landStatus").textContent="EVALUATION ERROR";$("landStatus").className="bad";$("landConfigNote").textContent=String(e.message||e)}
}
async function startupCheck(){
 const expected="5.23.4",bs=$("startupBuildStatus"),bn=$("startupBuildNote"),rs=$("startupRunwayStatus"),rn=$("startupRunwayNote"),ls=$("startupLiveStatus"),ln=$("startupLiveNote"),notice=$("startupDataNotice");
 try{
   const r=await fetch(apiUrl("/api/diagnostics?_="+Date.now()),{cache:"no-store"}),j=await r.json();
   const buildOk=String(j.build||"")===expected;
   if(bs){bs.textContent=buildOk?"MATCHED":"UPDATE / REDEPLOY REQUIRED";bs.className=buildOk?"ok":"bad"}if(bn)bn.textContent=`Browser ${expected} • Server ${j.build||"unknown"}`;
   const runwayCount=Number(j.runway_airports_loaded||0);if(rs){rs.textContent=runwayCount>0?"READY":"PACKAGED DATA MISSING";rs.className=runwayCount>0?"ok":"bad"}if(rn)rn.textContent=`${runwayCount.toLocaleString()} packaged airport entr${runwayCount===1?"y":"ies"} • FAA NASR live fallback ${j.nasr_live?"enabled":"unavailable"}`;
   const wx=!!j.awc_metar,nms=!!j.nms?.authenticated;if(ls){ls.textContent=(wx&&nms)?"ONLINE":(wx||nms)?"PARTIAL":"OFFLINE";ls.className=(wx&&nms)?"ok":(wx||nms)?"warn":"bad"}if(ln)ln.textContent=`Weather ${wx?"online":"unavailable"} • FAA NMS ${nms?"authenticated":"unavailable"}`;
   if(notice){if(!buildOk||runwayCount<1){notice.innerHTML='<span class="bad"><b>DATA ACTION REQUIRED.</b> Required packaged data or app/server version is not ready. Redeploy/update before relying on mission calculations.</span>';}else if(!wx||!nms){notice.innerHTML='<span class="warn"><b>LOCAL DATA READY.</b> One or more live services are unavailable. Manual weather / manual review may be required. No manual data download is needed unless a required packaged dataset is reported missing.</span>';}else{notice.innerHTML='<span class="ok"><b>LOCAL DATA READY • LIVE SERVICES ONLINE.</b></span> No manual data download is required.';}}
   if($("missionStatus"))$("missionStatus").innerHTML=`<span class="${wx?'ok':'warn'}">FlightOps server online — ${wx?'weather connected':'weather unavailable'}</span>`;
 }catch(e){
   if(bs){bs.textContent="SERVER UNAVAILABLE";bs.className="bad"}if(rs){rs.textContent="LOCAL APP ONLY";rs.className="warn"}if(ls){ls.textContent="OFFLINE";ls.className="warn"}if(ln)ln.textContent="Live weather / FAA NMS unavailable";if(notice)notice.innerHTML='<span class="warn"><b>OFFLINE MODE.</b> Embedded Performance + W&amp;B logic remains available after the app is loaded, but live weather, NOTAM, and FAA NASR requests are unavailable. Use manual inputs and independent source verification.</span>';if($("missionStatus"))$("missionStatus").innerHTML='<span class="warn">FlightOps live server unavailable — manual/offline inputs may be used.</span>';}
}

document.querySelectorAll(".tap-seat[data-seat-index]").forEach(btn=>btn.addEventListener("click",()=>seatTapped(+btn.dataset.seatIndex)));
$("paxRequested").addEventListener("change",setPassengerCount);
$("paxRequested").addEventListener("blur",setPassengerCount);
$("applyPaxEditor").addEventListener("click",updatePassengerData);
$("perfInputMode").addEventListener("change",setPerformanceInputMode);
["manualTOPA","manualTOTemp","manualTOWeight","manualTORwyLen"].forEach(id=>$(id).addEventListener("input",()=>{
 if(perfIsManual()){
   $("perfTOW").value=valueOrNull("manualTOWeight")||"";
   $("perfRwyLen").value=valueOrNull("manualTORwyLen")||"";
   markWhatIfDirty();
 }
}));
$("toConfig").addEventListener("change",()=>{if(perfIsManual())markWhatIfDirty();recalculate()});
$("toAntiIce").addEventListener("change",()=>{if(perfIsManual())markWhatIfDirty();recalculate();});
$("toRunwayCondition").addEventListener("change",()=>{if(perfIsManual())markWhatIfDirty();recalculate();updateWhatIfPlanner()});
$("landConfig").addEventListener("change",recalculate);
$("landAntiIce").addEventListener("change",recalculate);
$("landRunwayCondition").addEventListener("change",recalculate);

["manualUsableLda","manualNotamNote"].forEach(id=>$(id).addEventListener("input",()=>{updateLandingRunwayAssessment();syncLandingSection();updateToldCard()}));
$("manualRunwayStatusOverride").addEventListener("change",()=>{updateLandingRunwayAssessment();syncLandingSection();updateToldCard()});

$("totalBag").addEventListener("input",onTotalBagInput);
["bagComp0","bagComp1","bagComp2"].forEach(id=>$(id).addEventListener("input",onBaggageCompInput));
["captWt","foWt","taxiFuel","fuel","missionFuel","perfV1","perfVR","landVref","perfClimbWt","perfFieldWt","perfGrad","landClimbWt"].forEach(id=>$(id).addEventListener("input",recalculate));
$("perfObs").addEventListener("change",recalculate);

setBaggageFromTotal(num("totalBag"));
setPassengerCount();
setPerformanceInputMode();
initializeMenuLanding();
// A fresh app launch/reload always lands on the MENU. Drafts remain available under Flight Plans.
window.addEventListener("pageshow",()=>{if(!openSharedToldFromHash()&&!window.currentMissionMeta)showPlatformView("home")});
window.addEventListener("load",()=>{if(!openSharedToldFromHash()&&!window.currentMissionMeta)showPlatformView("home")});
// Debounced local draft persistence for active, incomplete missions.
document.addEventListener("input",e=>{if(window.currentMissionMeta&&!window.currentMissionMeta.completed&&e.target.closest("#opsView"))scheduleDraftSave()});
document.addEventListener("change",e=>{if(window.currentMissionMeta&&!window.currentMissionMeta.completed&&e.target.closest("#opsView"))scheduleDraftSave()});
window.addEventListener("beforeunload",()=>{try{saveCurrentDraft()}catch(e){}});
startupCheck();
updateHomeArchiveCount();
updateHomeDraftCount();
addEventListener("resize",()=>{recalculate();requestAnimationFrame(redrawCgEnvelope)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&$("opsView")?.style.display!=="none")requestAnimationFrame(redrawCgEnvelope)});
