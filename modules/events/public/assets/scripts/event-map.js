var MapView = (function () {
     let map;

     function waitForGoogleMaps(callback) {
         if (window.google && window.google.maps && typeof google.maps.Map === "function") {
             callback();
         } else {
             setTimeout(() => waitForGoogleMaps(callback), 100);
         }
     }

     async function initMap(data) {
         const { lat, lng, location_name, map_id } = data;
         const mapContainer = document.getElementById("map-container");

         map = new google.maps.Map(mapContainer, {
             scrollwheel: false,
             draggable: true,
             disableDoubleClickZoom: true,
             zoomControl: false,
             zoom: 16,
             center: { lat: lat, lng: lng },
             mapId: map_id,
         });

         const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
         new AdvancedMarkerElement({
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
                 const mapContainer = document.getElementById('map-container');

                 if (!dataElement || !mapContainer) return;

                 const mapData = JSON.parse(dataElement.textContent);

                 // Defer map initialisation until the container is near the viewport so
                 // Google Maps reflows don't happen on the critical rendering path.
                 const observer = new IntersectionObserver((entries, obs) => {
                     if (!entries[0].isIntersecting) return;
                     obs.disconnect();
                     waitForGoogleMaps(() => initMap(mapData));
                 }, { rootMargin: '200px' });

                 observer.observe(mapContainer);
             }
         }
     };
 })();

 window.MapView = MapView;

 document.addEventListener('DOMContentLoaded', () => {
     MapView.events.initEventListeners();
 });
