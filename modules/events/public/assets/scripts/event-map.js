var MapView = (function () {
     let map;
 
     function waitForGoogleMaps(callback) {
         if (window.google && window.google.maps && typeof google.maps.Map === "function") {
             callback();
         } else {
             setTimeout(() => waitForGoogleMaps(callback), 100);
         }
     }
 
     function initMap(data) {
         const { lat, lng, location_name } = data;
         const mapContainer = document.getElementById("map-container");
 
         map = new google.maps.Map(mapContainer, {
             scrollwheel: false,
             draggable: true,
             disableDoubleClickZoom: true,
             zoomControl: false,
             zoom: 16,
             center: { lat: lat, lng: lng },
             styles: InsitesUtil.getTheme(),
         });
 
         new google.maps.Marker({
             position: { lat: lat, lng: lng },
             map: map,
             title: location_name,
         });
     }
 
     return {
         methods: {},
         events: {
             initEventListeners: function () {
                 const dataElement = document.getElementById('map-data');
 
                 if (dataElement) {
                     const mapData = JSON.parse(dataElement.textContent);
                     waitForGoogleMaps(() => initMap(mapData));
                 }
             }
         }
     };
 })();
 
 window.MapView = MapView;
 
 setTimeout(() => {
     MapView.events.initEventListeners();
 }, 200); 