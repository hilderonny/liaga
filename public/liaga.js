/* global L, io */

/**
 * Cache for mapping DIVs to tiles for effective
 * updates of the UI
 */
var DivCache = {}

/**
 * Persistable game stats for the current player
 */
var Game = {
  // Position of the player
  position: {
    // Initial latitude when the game starts
    lat: 50.9905,
    // Initial longitude when the game starts
    lon: 11.063,
  },
  // Tiles the player already unlocked. The attribute names are latitude
  tiles: {}
}

/**
 * Settings for application initialization.
 * Used by Liaga and Locator
 */
var InitOptions = {
  // Zoom level, for which the card tiles are calculated.
  // The higher the level, the more tiles per square kilometer are rendered
  tileZoomLevel: 21,
  // Maximum zoom level the player can zoom into the map. 19 is a good choice.
  maxZoomLevel: 19,
  // Used by Locator to define whether the position change should be in high
  // accuracy or not
  highLocationAccuracy: true,
}

/**
 * Root data container for entire application
 */
var Liaga = {
  // Player stats
  game: Game,
  // Rendered map
  map: null,
  // Application settings
  settings: Settings,
  
  // Start the application
  init: function() {
    // Force redirection to HTTPS to enable location watching
    if (location.href.indexOf("http://") === 0) {
      location.href = location.href.replace("http://", "https://");
    }
    // Initialize the map
    Liaga.map = L.map("map", { // "map" is the ID of the div where the map should be rendered into.
      // Center the map at the initial coordinates
      center: [Game.position.lat, Game.position.lon],
      // Default minimum zoom level
      minZoom: InitOptions.maxZoomLevel,
      // Maximum zoom level
      maxZoom: InitOptions.maxZoomLevel,
      // Initial zoom level
      zoom: InitOptions.maxZoomLevel
    });
    // Create the geographical map layer
    MapHelper.mapLayer.addTo(Liaga.map);
    // Create the tile layer and its pane
    Liaga.map.createPane('tileLayerPane').style.zIndex = 450;
    Liaga.map.addLayer(MapHelper.tileLayer);
    // Create the player marker
    MapHelper.playerMarker.addTo(Liaga.map);
    // Load the previous player stats
    Liaga.load();
    // Enable GPS location updates
    Locator.start();
    // Connect websocket for keepalives
    // SocketClient.connect();
  },
  // Load stats from persistence layer
  load: function() {
    // Load stats from persistence, currently only from localStorage
    var storedGame = JSON.parse(localStorage.getItem("Game"));
    if (!storedGame) return;
    Game = storedGame;
    // Update map settings (allowed zoom levels)
    //   currently nothing to do here
    // Force reloading the tiles which were already visited and update player position
    Liaga.map.setView([Game.position.lat, Game.position.lon], InitOptions.maxZoomLevel);
    MapHelper.tileLayer.redraw();
    // Update player position
    MapHelper.playerMarker.setLatLng([Game.position.lat, Game.position.lon]);
  },
  // Reset all tile stats to initial state, used for development only
  reset: function() {
    Game.tiles = {};
    DivCache = {};
    Liaga.save();
    Liaga.load();
  },
  // Save current stats to persistence layer
  save: function() {
    // Currently the stats are stored only loccaly in the localStorage.
    // Later on it will be synchronized with a server
    localStorage.setItem("Game", JSON.stringify(Game));
  },
}

/**
 * Helper for watching GPS position
 */
var Locator = {
  // Start watching for GPS changes
  start: function() {
    navigator.geolocation.watchPosition(Locator.onLocationUpdate, function(error) {}, {
      enableHighAccuracy: InitOptions.highLocationAccuracy,
    });
  },
  
  // Callback for when the player changed its GPS location
  onLocationUpdate: function(location) {
    // Update player position
    Game.position.lat = location.coords.latitude;
    Game.position.lon = location.coords.longitude;
    MapHelper.playerMarker.setLatLng([Game.position.lat, Game.position.lon]);
    // Find tile at position and mark it as visited
    var factor = Math.pow(2, 8 - (InitOptions.tileZoomLevel - Liaga.map.getZoom())); // 2 ^8 = 256 = TileSize in pixels
    var coords = Liaga.map.project([Game.position.lat, Game.position.lon]).divideBy(factor).floor(); // From https://github.com/Leaflet/Leaflet/issues/2490#issuecomment-36104437
    MapHelper.selectTileAtCoords(coords);
    // Move map to player when player following is set
    if (Settings.followLocation) {
      Liaga.map.setView([Game.position.lat, Game.position.lon], Liaga.map.getZoom());
    }
    // Save stats
    Liaga.save();
  },
}

/**
 * Helper functions for manipulating the map
 */
var MapHelper = {
  // Layer for the geographical map
  mapLayer: L.mapboxGL({
    accessToken: 'not-needed',
    style: 'https://maps.tilehosting.com/styles/basic/style.json?key=gmrAs6PJFWurGzzNpy49',
  }),
  // Layer for interactive tiles
  tileLayer: new (L.GridLayer.extend({
    // Generate a tile for specific coordinates. Called by LeafletJS on demand
    createTile: function (coords) {
      // Create an interactive DIV for the tile
      var div = document.createElement("div");
      div.classList.add("card");
      // Remember the div in the cache for the Locator
      if (!DivCache[coords.x]) DivCache[coords.x] = {};
      if (!DivCache[coords.x][coords.y]) DivCache[coords.x][coords.y] = div;
      // Check whether the player already visited the tile
      if (Game.tiles[coords.x] && Game.tiles[coords.x][coords.y]) {
        div.classList.add("checked");
      }
      // // Clicking a tile will mark it as visited
      // div.addEventListener("click", function() {
      //   MapHelper.selectTileAtCoords(coords);
      // });
      return div;
    },
  }))({
    // Pane where to put the layer. Relevant for Z-Indexing of the layers
    pane: 'tileLayerPane', // Needs to be generated by hand in Liaga.init()
    // The zoom levels are set to define, how fine the tiles are calculated
    // The higher this value, the more tiles per square kilometers are used
    minNativeZoom: InitOptions.tileZoomLevel,
    maxNativeZoom: InitOptions.tileZoomLevel,
    // Force the layer to update even when the player is still dragging the map around
    updateWhenIdle: false,
    // Update the layer as fast as possible. It is okay because the data does not come over the network
    updateInterval: 1,
  }),
  // Marker for the player wo that he can see himself on the map
  playerMarker: L.marker([Game.position.lat, Game.position.lon]),
  // Marks a tile with the given coordinates as selected
  selectTileAtCoords: function(coords) {
    // Mark the tile in persistence
    if (!Game.tiles[coords.x]) Game.tiles[coords.x] = {};
    if (!Game.tiles[coords.x][coords.y]) Game.tiles[coords.x][coords.y] = {};
    // Store the changes in the persyistence
    Liaga.save();
    // Update the corresponding div
    if (DivCache[coords.x] && DivCache[coords.x][coords.y]) DivCache[coords.x][coords.y].classList.add("checked");
  },
}

/**
 * Device specific current settings
 */
var Settings = {
  // Define wheter the map should be centered on the player or not
  followLocation: true,
}

/**
 * Client for socket.io websockets
 */
var SocketClient = {
  // connect to the socket server
  connect: function() {
    SocketClient.socket = io();
    SocketClient.socket.on("myping", SocketClient.onPing);
  },
  // Triggered by the server to keep the page alive even in background
  onPing: function() {
    SocketClient.socket.emit("mypong", Game.position);
  },
  // Socket object
  socket: null
}

// Initialize the app as soon as the entire page is loaded
window.addEventListener("load", Liaga.init);