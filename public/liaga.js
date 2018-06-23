/* global L */

var GameHelper = {
  game: { 
    tiles: {},
    position: { lat: 50.9905, lon: 11.062 }
  },
  getPosition: function() {
    return GameHelper.game.position;
  },
  getTile: function(x, y) {
    var tiles = GameHelper.game.tiles;
    var tileexists = tiles[x] && tiles[x][y];
    var tile = tileexists ? tiles[x][y] : {
      // Initialize tile with values or leave it empty
    };
    if (!tile.getDiv) {
      // Komische Funktion, um stringify daran zu hindern, das div mit zu serialisieren
      var div = document.createElement('div');
      div.classList.add("card");
      if (!tileexists) {
        var eventListener = function() {
          div.classList.add("checked");
          div.removeEventListener("click", eventListener);
          if (!tiles[x]) tiles[x] = {};
          tiles[x][y] = tile; // Set here at first for storage
          GameHelper.save();
        }
        div.addEventListener("click", eventListener);
      } else {
        div.classList.add("checked");
      }
      tile.getDiv = function() {
        return div;
      }
    }
    return tile;
  },
  load: function() {
    var gameFromStorage = localStorage.getItem("game");
    if (!gameFromStorage) return;
    GameHelper.game = JSON.parse(gameFromStorage);
  },
  save: function() {
    localStorage.setItem("game", JSON.stringify(GameHelper.game));
  },
  setPosition(lat, lon) {
  },
  setTile: function(x, y, tile) {
    // tile.div.classList.add("checked");
    // var tiles = GameHelper.game.tiles;
    // if (!tiles[x]) tiles[x] = [];
    // tiles[x][y] = tile;
  }
};

function createMapLayer(map) {
  return L.mapboxGL({
    accessToken: 'not-needed',
    style: 'https://maps.tilehosting.com/styles/basic/style.json?key=gmrAs6PJFWurGzzNpy49'
  }).addTo(map);
}

function createCardLayer(map) {
  map.createPane('cardPane').style.zIndex = 450;
  // https://leafletjs.com/examples/extending/extending-2-layers.html
  var cardLayer = new (L.GridLayer.extend({
    createTile: function (coords) {
      var tile = GameHelper.getTile(coords.x, coords.y);
      if (tile) return tile.getDiv();
    }
  }))({
    pane: 'cardPane',
    minNativeZoom: 20,
    maxNativeZoom: 20
  });
  map.addLayer(cardLayer);
  return cardLayer;
}

function load() {
  GameHelper.load();
  // Initialize map
  var playerPosition = GameHelper.getPosition();
  var map = L.map("map", {
    center: [playerPosition.lat, playerPosition.lon],
    minZoom: 19,
    maxZoom: 19,
    zoom: 19
  });0
  // Create default map layer
  var mapLayer = createMapLayer(map);
  // Create card overlay
  var cardLayer = createCardLayer(map);
  // Find player position
  var playerMarker = L.marker([playerPosition.lat, playerPosition.lon]).addTo(map);
  map.on('locationfound', function(e) {
    // Update player marker and store it for next load
    playerPosition.lat = e.latlng.lat;
    playerPosition.lon = e.latlng.lng;
    playerMarker.setLatLng([playerPosition.lat, playerPosition.lon]);
    GameHelper.save();
  });
  map.locate({
    watch: true,
    setView: true, 
    maxZoom: 19
  });
}

window.addEventListener("load", load);