let map;
const dataElement = document.getElementById('map-data');

if (dataElement) {
     const mapData = JSON.parse(dataElement.textContent);
     const { lat, lng, location_name } = mapData;
     function waitForGoogleMaps(callback) {
          if (window.google && window.google.maps && typeof google.maps.Map === "function") {
               callback();
          } else {
               setTimeout(() => waitForGoogleMaps(callback), 100);
          }
     }

     function initMap() {
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

     // Optional marker
     new google.maps.Marker({
          position: { lat: lat, lng: lng },
          map: map,
          title: location_name,
     });
     }

     document.addEventListener("DOMContentLoaded", () => {
          waitForGoogleMaps(initMap);
     });
}     