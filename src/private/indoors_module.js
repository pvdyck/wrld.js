var MapModule = require("./map_module");
var IndoorMap = require("./indoor_map");
var IndoorMapFloor = require("./indoor_map_floor");
var IndoorMapEntrance = require("./indoor_map_entrance");

var IndoorsModule = function(emscriptenApi, mapController) {

    var _emscriptenApi = emscriptenApi;
    var _mapController = mapController;

    var _activeIndoorMap = null;
    var _entrances = {};

    var _this = this;

    var _createIndoorMapObject = function() {
        var mapId = _emscriptenApi.indoorsApi.getActiveIndoorMapId();
        var mapName = _emscriptenApi.indoorsApi.getActiveIndoorMapName();
        var floorCount = _emscriptenApi.indoorsApi.getActiveIndoorMapFloorCount();
        var floors = _createFloorsArray(floorCount);
        var exitFunc = _this.exit;
        var indoorMap = new IndoorMap(mapId, mapName, floorCount, floors, exitFunc);
        return indoorMap;
    };

    var _createFloorsArray = function(floorCount) {
        var floors = [];
        for (var i=0; i<floorCount; ++i) {
            var floorId = _emscriptenApi.indoorsApi.getFloorId(i);
            var floorIndex = i;
            var floorName = _emscriptenApi.indoorsApi.getFloorName(i);
            var floorNumber = _emscriptenApi.indoorsApi.getFloorNumber(i);
            var floor = new IndoorMapFloor(floorId, floorIndex, floorName, floorNumber);
            floors.push(floor);
        }
        return floors;
    };

    var _executeIndoorMapEnteredCallbacks = function() {
        _activeIndoorMap = _createIndoorMapObject();
        _this.fire("indoormapenter", {indoorMap: _activeIndoorMap});
    };

    var _executeIndoorMapExitedCallbacks = function() {
        var indoorMap = _activeIndoorMap;
        _activeIndoorMap = null;
        _this.fire("indoormapexit", {indoorMap: indoorMap});
    };

    var _executeIndoorMapEntranceAddedCallbacks = function(indoorMapId, indoorMapName, indoorMapLatLng) {
        var entrance = new IndoorMapEntrance(indoorMapId, indoorMapName, indoorMapLatLng);
        _entrances[entrance.getIndoorMapId()] = entrance;
        _this.fire("indoorentranceadd", {entrance: entrance});
    };

    var _executeIndoorMapEntranceRemovedCallbacks = function(indoorMapId, indoorMapName, indoorMapLatLng) {
        var entrance = new IndoorMapEntrance(indoorMapId, indoorMapName, indoorMapLatLng);
        delete _entrances[entrance.getIndoorMapId()];
        _this.fire("indoorentranceremove", {entrance: entrance});
    };

    var _onCollapseStart = function() {
        _this.fire("collapsestart");
    };

    var _onCollapse = function() {
        _this.fire("collapse");
    };

    var _onCollapseEnd = function() {
        _this.fire("collapseend");
    };

    var _onExpandStart = function() {
        _this.fire("expandstart");
    };

    var _onExpand = function() {
        _this.fire("expand");
    };

    var _onExpandEnd = function() {
        _this.fire("expandend");
    };


    this.onInitialized = function() {
        _emscriptenApi.indoorsApi.registerIndoorMapEnteredCallback(_executeIndoorMapEnteredCallbacks);
        _emscriptenApi.indoorsApi.registerIndoorMapExitedCallback(_executeIndoorMapExitedCallbacks);
        _emscriptenApi.indoorsApi.registerIndoorMapMarkerAddedCallback(_executeIndoorMapEntranceAddedCallbacks);
        _emscriptenApi.indoorsApi.registerIndoorMapMarkerRemovedCallback(_executeIndoorMapEntranceRemovedCallbacks);

        _emscriptenApi.expandFloorsApi.setCollapseStartCallback(_onCollapseStart);
        _emscriptenApi.expandFloorsApi.setCollapseCallback(_onCollapse);
        _emscriptenApi.expandFloorsApi.setCollapseEndCallback(_onCollapseEnd);
        _emscriptenApi.expandFloorsApi.setExpandStartCallback(_onExpandStart);
        _emscriptenApi.expandFloorsApi.setExpandCallback(_onExpand);
        _emscriptenApi.expandFloorsApi.setExpandEndCallback(_onExpandEnd);
    };
    
    this.exit = function() {
        if (_emscriptenApi.ready()) {
            _emscriptenApi.indoorsApi.exitIndoorMap();
        }
    };

    this.isIndoors = function() {
        return _emscriptenApi.indoorsApi.hasActiveIndoorMap();
    };

    this.getActiveIndoorMap = function() {
        return _activeIndoorMap;
    };

    this.getFloor = function() {
        if (this.isIndoors()) {
            var index = _emscriptenApi.indoorsApi.getSelectedFloorIndex();
            return _activeIndoorMap.getFloors()[index];
        }
        return null;
    };

    this.setFloor = function(floor) {
        var index = null;
        if (this.isIndoors()) {
            var floors = _activeIndoorMap.getFloors();

            if (typeof floor === "number") {
                index = floor;
            }
            else if (typeof floor === "object") {
                var floorIndex = floors.indexOf(floor);
                index = (floorIndex >= 0) ? floorIndex : null;
            }
            else if (typeof floor === "string") {
                for (var i=0; i<floors.length; ++i) {
                    if (floors[i].getFloorId() === floor) {
                        index = i;
                        break;
                    }
                }
            }
        }
        if (index !== null) {
            return _emscriptenApi.indoorsApi.setSelectedFloorIndex(index);
        }
        return false;
    };

    this.moveUp = function(numberOfFloors) {
        var delta = (typeof numberOfFloors === "undefined") ? 1 : numberOfFloors;
        var thisFloor = this.getFloor();
        if (thisFloor === null) {
            return false;
        }
        return this.setFloor(thisFloor.getFloorIndex() + delta);
    };

    this.moveDown = function(numberOfFloors) {
        var delta = (typeof numberOfFloors === "undefined") ? -1 : -numberOfFloors;
        return this.moveUp(delta);
    };

    this.enter = function(indoorMap) {
        var indoorMapId = null;
        if (typeof indoorMap === "object" && "getIndoorMapId" in indoorMap && typeof indoorMap["getIndoorMapId"] === "function") {
            indoorMapId = indoorMap.getIndoorMapId();
        }
        else if (typeof indoorMap === "string") {
            indoorMapId = indoorMap;
        }

        var entrance = _entrances[indoorMapId] || null;
        if (entrance === null) {
            return false;
        }

        var latLng = entrance.getLatLng();
        var distance = 400;

        _emscriptenApi.cameraApi.setView({location: latLng, distance: distance, allowInterruption: false});
        _mapController._setIndoorTransitionCompleteEventListener(function() { _emscriptenApi.indoorsApi.enterIndoorMap(indoorMapId); });
        return true;
    };

    this.getFloorInterpolation = function() {
        if (_activeIndoorMap !== null) {
            var floorParam = _emscriptenApi.expandFloorsApi.getFloorParam();
            var normalizedValue = floorParam / _activeIndoorMap.getFloorCount();
            return normalizedValue;
        }
        return 0;
    };

    this.setFloorInterpolation = function(value) {
        if (_activeIndoorMap !== null) {
            var floorParam = value * _activeIndoorMap.getFloorCount();
            _emscriptenApi.expandFloorsApi.setFloorParam(floorParam);
        }
        return this;
    };

    this.setFloorFromInterpolation = function(interpolationParam) {
        if (_activeIndoorMap === null) {
            return false;
        }
        
        var t = (typeof interpolationParam === "undefined") ? this.getFloorInterpolation() : interpolationParam;
        var floorIndex = Math.round(t * _activeIndoorMap.getFloorCount());
        return this.setFloor(floorIndex);
    };

    this.expand = function() {
        _emscriptenApi.expandFloorsApi.expandIndoorMap();
        return this;
    };

    this.collapse = function() {
        _emscriptenApi.expandFloorsApi.collapseIndoorMap();
        return this;
    };
};

var IndoorsPrototype = L.extend({}, MapModule, L.Mixin.Events); 

IndoorsModule.prototype = IndoorsPrototype;

module.exports = IndoorsModule;