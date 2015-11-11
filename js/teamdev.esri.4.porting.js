/* global O */
/* global angular */
angular.module("MapApp", ["teamdev.esri"]).controller("defaultController", function () { });
angular.module("teamdev.esri", [])
.factory("propertyConnector", function () {
  return function (dojoObject, angularObject, propertyname) {
    var _this = this;
    if (dojoObject !== undefined && angularObject !== undefined) {
      _this.changing = false;
      _this._dojoObject = dojoObject;
      _this._angularObject = angularObject;
      _this._watchingHandler = dojoObject.watch(propertyname, function (n, o, v) {
        if (!_this.changing && (o !== v)) {
          _this.changing = true;
          angularObject[name] = v;
          _this.changing = false;
        }
      });
      angularObject.$watch(propertyname, function (n, o) {

        if (!_this.changing && (o !== n)) {
          _this.changing = true;
          _this._dojoObject.set(propertyname, n);
          _this.changing = false;
        };
      });
    }
  }
})
.factory("esriRegistry", function ($window) {
  if (typeof $window.teamdev == 'undefined')
    $window.teamdev = { esri_registry: {} };

  return {
    set: function (name, value) {
      $window.teamdev.esri_registry[name] = value;
    },
    get: function (name) {
      return $window.teamdev.esri_registry[name];
    },
    remove: function (name) {
      $window.teamdev.esri_registry[name] = null;
    }
  };
})
.factory("esriQuery", function ($q, esriRegistry) {
  function setParameter(destination, source, parameter) {
    if (typeof (source && source[parameter]) !== "undefined" && source[parameter]) destination[parameter] = source[parameter];
  }

  return {
    featuresNearPoint: function (layerid, point, tollerance) {
      esriRegistry.get(layerid).features;
    },
    queryTask: function (url, fields, where, options) {
      var _q = $q.defer();

      this.create(fields, where, function (query) {
        require(["esri/tasks/QueryTask"], function (QueryTask) {
          var qt = new QueryTask(url);
          qt.execute(query, function (result) { _q.resolve(result); });
        });
      }, options);
      return _q.promise;
    },
    queryFeatures: function (layerid, fields, where, options) {
      var _q = $q.defer();

      if (!where) {
        where = fields;
        fields = "*";
      }

      this.create(fields, where, function (query) {
        esriRegistry.get(layerid).queryFeatures(query).then(function (result) { _q.resolve(result); });
      }, options);
      return _q.promise;
    },
    selectFeatures: function (layerid, fields, where, options) {
      if (!where) {
        where = fields;
        fields = "*";
      }

      var _q = $q.defer();
      this.create(fields, where, function (query) {
        if (layerid instanceof Object) layerid.selectFeatures(query).then(function (result) { _q.resolve(result); });
        else {
          var olayer = esriRegistry.get(layerid);
          if (olayer) olayer.selectFeatures(query).then(function (result) { _q.resolve(result); });
        }
      }, options);
      return _q.promise;
    },
    identify: function (layeruri, where) {
      var _q = $q.defer();

      require(["esri/tasks/IdentifyTask", "esri/tasks/IdentifyParameters", "dojo/on"], function (IdentifyTask, IdentifyParameters, on) {
        var params = new IdentifyParameters();
        params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
        setParameter(params, where, "dpi");
        setParameter(params, where, "dynamicLayerInfos");
        setParameter(params, where, "geometry");
        setParameter(params, where, "geometryType");
        setParameter(params, where, "height");
        setParameter(params, where, "layerDefinitions");
        setParameter(params, where, "layerIds");
        setParameter(params, where, "layerOption");
        setParameter(params, where, "layerTimeOptions");
        setParameter(params, where, "mapExtent");
        setParameter(params, where, "maxAllowableOffset");
        setParameter(params, where, "returnGeometry");
        setParameter(params, where, "orderByFields");
        setParameter(params, where, "spatialReference");
        setParameter(params, where, "timeExtent");
        setParameter(params, where, "tolerance");
        setParameter(params, where, "width");

        var tsk = new IdentifyTask(layeruri);
        tsk.execute(params, function (results) { _q.resolve(results); });
      });
      return _q.promise;
    },
    create: function (arg1, where, action, options) {
      if (angular.isFunction(arg1) && !action)
        action = arg1;

      if (action)
        require(["esri/tasks/query"], function (Query) {
          var query = new Query();

          setParameter(query, options, "spatialRel");
          setParameter(query, options, "geometry");
          setParameter(query, options, "returnGeometry");
          setParameter(query, options, "orderByFields");
          setParameter(query, options, "returnDistinctValues");
          setParameter(query, options, "distance");

          if (angular.isString(arg1))
            query.outFields = arg1.split(",");
          else if (angular.isArray(arg1))
            query.outFields = arg1;

          if (angular.isString(where)) query.where = where;
          else if (angular.isObject(where))
            query.geometry = where;

          action(query);
        });
    }
  };
})

/// ---------------------------------------------------------------------------------
/// Views Definitions 
/// ---------------------------------------------------------------------------------
.directive("mapView", ["$q", "esriRegistry", "propertyConnector", function ($q, esriRegistry, propertyConnector) {

  function linker(scope, element, attr) {
    scope.prepared = $q.defer();
    scope.isObjectReady = scope.prepared.promise;
    require(["esri/views/MapView", "dojo/domReady!"], function (MapView) {
      new MapView({
        map: scope.map,
        container: attr.container,
        zoom: attr.zoom || 4,
        center: attr.center || [12, 42]
      }).then(function (v) {
        scope.view = v;
        scope.connectors = [];
        scope.connectors.push(new propertyConnector(scope.view, scope, "animation"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "center"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "constraints"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "extent"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "height"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "interacting"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "padding"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "animation"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "width"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "zoom"));
        scope.prepared.resolve();
      });
    });
    scope.isObjectReady.then(function () {
      if (scope.viewId) esriRegistry.set(scope.viewId, scope.view);
      if (scope.onReady()) scope.onReady()(scope.map);
      if (scope.onClick()) scope.view.onClick(function (a, b, c) { scope.onClick()(a, b, c); })
    })
  };

  return {
    restrict: "E",
    scope: {
      animation: "=",
      center: "=",
      constraints: "=",
      extent: "=",
      height: "=",
      interacting: "=",
      padding: "=",
      onClick: "&",
      onReady: "&",
      width: "=",
      zoom: "=",
      viewId: "@"
    },
    controller: ["$scope", function ($scope) {
      this.addMap = function (m) {
        $scope.map = m;
      }
    }],
    compile: function ($element, $attrs) {
      $element.append('<div id=' + $attrs.container + '></div>');
      return {
        post: linker
      };
    }
  }
}])
.directive("sceneView", ["$q", "esriRegistry", "propertyConnector", function ($q, esriRegistry, propertyConnector) {
  function linker(scope, element, attr) {
    scope.prepared = $q.defer();
    scope.isObjectReady = scope.prepared.promise;
    require(["esri/views/SceneView", "dojo/domReady!"], function (SceneView) {
      new SceneView({
        map: scope.map,
        container: attr.container,
        zoom: attr.zoom || 4,
        center: attr.center || [12, 42]
      }).then(function (v) {
        scope.view = v;
        scope.connectors = [];
        scope.connectors.push(new propertyConnector(scope.view, scope, "animation"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "camera"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "center"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "constraints"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "environment"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "extent"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "height"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "heightResizeMode"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "interacting"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "padding"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "position"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "scale"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "stationary"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "updating"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "viewpoint"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "width"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "widthResizeMode"));
        scope.connectors.push(new propertyConnector(scope.view, scope, "zoom"));
        scope.prepared.resolve();
      });
    });
    scope.isObjectReady.then(function () {
      if (scope.viewId) esriRegistry.set(scope.viewId, scope.view);
      if (scope.onReady()) scope.onReady()(scope.map);
      if (scope.onClick()) scope.view.onClick(function (a, b, c) { scope.onClick()(a, b, c); })
    })
  };

  return {
    restrict: "E",
    scope: {
      animation: "=",
      camera: "=",
      center: "=",
      constraints: "=",
      environment: "=",
      extent: "=",
      height: "=",
      heightResizeMode: "=",
      interacting: "=",
      padding: "=",
      position: "=",
      stationary: "=",
      updating: "=",
      viewpoint: "=",
      onClick: "&",
      onReady: "&",
      scale: "=",
      width: "=",
      widthResizeMode: "=",
      zoom: "=",
      viewId: "@"

    },
    controller: ["$scope", function ($scope) {
      this.addMap = function (m) {
        $scope.map = m;
      }
    }],
    compile: function ($element, $attrs) {
      $element.append('<div id=' + $attrs.container + '></div>');
      return {
        post: linker
      };
    }

  }
}])

.directive("esriMap", ["$q", "esriRegistry", "propertyConnector", function ($q, esriRegistry, propertyConnector) {

  function linker(scope, element, attr, parents) {
    scope.prepared = $q.defer();
    scope.isObjectReady = scope.prepared.promise;
    require(["esri/Map", "dojo/domReady!"], function (Map) {
      var view = parents[0] || parents[1];

      var map = new Map({ basemap: scope.basemap });
      map.then(function (m) {
        scope.map = m;
        scope.connectors = [];
        scope.connectors.push(new propertyConnector(scope.map, scope, "basemap"));
        scope.prepared.resolve();
      });
      view.addMap(map);
    })

    scope.isObjectReady.then(function () {
      if (scope.mapId) esriRegistry.set(scope.mapId, scope.map);
      if (scope.onMapReady()) scope.onMapReady()(scope.map);
    })
  };

  return {
    restrict: "E",
    require: ["?^mapView", "?^sceneView"],
    scope: {
      mapId: "@",
      basemap: "=",
      onMapReady: "&"
    },
    link: linker,
    controller: ["$scope", function ($scope) {
      this.addLayer = function (l) {
        $scope.isObjectReady.then(function () {
          $scope.map.add(l);
        });
      };
    }]
  }
}])

.directive("featureLayer", function ($q, esriRegistry, $timeout) {
  return {
    restrict: "E",
    require: "^esriMap",
    replace: true,
    scope: {
      id: "@",
      layerId: "@",
      url: "@",
      visible: "=",
      onClick: "&",
      onDblClick: "&",
      outFields: "@",
      zoomToSelection: "@",
      mode: "@",
      onReady: "&",
      index: "@",
      showInfoWindowOnClick: "=",
      onBeforeApplyEdits: "&",
      onEditsComplete: "&",
      onGraphicAdd: "&",
      onGraphicRemove: "&",
      editable: "@",
    },
    link: {
      pre: function (scope, element, attrs, esriMap) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        require(["esri/layers/FeatureLayer", "esri/identity/IdentityManager"], function (FeatureLayer, esriIm) {
          console.log(esriIm);

          function evaluateOptions(scope) {
            var options = {};

            if (scope.mode)
              switch (scope.mode) {
                case "MODE_SNAPSHOT": options.mode = FeatureLayer.MODE_SNAPSHOT; break;
                case "MODE_ONDEMAND": options.mode = FeatureLayer.MODE_ONDEMAND; break;
                case "MODE_SELECTION": options.mode = FeatureLayer.MODE_SELECTION; break;
                case "MODE_AUTO": options.mode = FeatureLayer.MODE_AUTO; break;

                case "POPUP_HTML_TEXT": options.mode = FeatureLayer.POPUP_HTML_TEXT; break;
                case "POPUP_NONE": options.mode = FeatureLayer.POPUP_NONE; break;
                case "POPUP_URL": options.mode = FeatureLayer.POPUP_URL; break;
                case "SELECTION_ADD": options.mode = FeatureLayer.SELECTION_ADD; break;
                case "SELECTION_NEW": options.mode = FeatureLayer.SELECTION_NEW; break;
                case "SELECTION_SUBTRACT": options.mode = FeatureLayer.SELECTION_SUBTRACT; break;
              }

            if (scope.outFields)
              if (angular.isArray(scope.outFields))
                options.outFields = scope.outFields;
              else
                options.outFields = scope.outFields.split(",");
            return options;
          }

          if (attrs.url) {
            var opts = evaluateOptions(scope);
            opts.url = attrs.url;
            scope.this_layer = new FeatureLayer(opts);
          }
          else
            scope.this_layer = new FeatureLayer({ featureSet: null, layerDefinition: { "geometryType": "esriGeometryPolygon", "fields": [] } }, evaluateOptions(scope));

          esriMap.addLayer(scope.this_layer, scope.index).then(function () {
            if (scope.this_layer.loaded)
              ready.resolve();
            else
              scope.this_layer.on("load", function (r) {
                ready.resolve();
              });
          });

          if (scope.layerId || scope.id) {
            scope.this_layer._layer_id = scope.layerId || scope.id;
            esriRegistry.set(scope.layerId || scope.id, scope.this_layer);
          }

          scope.isObjectReady.then(function () {

            if (scope.editable === "true")
              try { scope.this_layer.setEditable(true); } catch (e) {
                console.log("Setting Editing to Layer failed: " + e);
              }

            if (scope.onReady()) scope.onReady()(scope.this_layer);
          });

          scope.this_layer.on("click", function (r) {
            if (!scope.$$phase && !scope.$root.$$phase) {
              scope.$apply(function () {
                if (scope.onClick()) scope.onClick()(r);
              });
            } else {
              if (scope.onClick()) scope.onClick()(r);
            }

            esriMap.getMap(function (rr) {
              rr.infoWindow.hide();
              rr.infoWindow.clearFeatures();
              rr.infoWindow.setFeatures([r.graphic]);
              if (scope.showInfoWindowOnClick == true)
                $timeout(function () { rr.infoWindow.show(r.mapPoint); });
            });
          });

          if (scope.onDblClick()) scope.this_layer.on("dbl-click", function (r) { scope.onDblClick()(r); });
          if (scope.onBeforeApplyEdits()) scope.this_layer.on("before-apply-edits", function (r) { scope.onBeforeApplyEdits()(r); });
          if (scope.onEditsComplete()) scope.this_layer.on("edits-complete", function (r) { scope.onEditsComplete()(r); });
          if (scope.onGraphicAdd()) scope.this_layer.on("graphic-add", function (r) { scope.onGraphicAdd()(r); });
          if (scope.onGraphicRemove()) scope.this_layer.on("graphic-remove", function (r) { scope.onGraphicRemove()(r); });

          // UNSUPPORTED IN Beta1
          //scope.this_layer.on("selection-complete", function () {
          //  if (scope.zoomToSelection == true) {
          //    scope.isObjectReady.then(function () {
          //      var extent = GraphicsUtils.graphicsExtent(scope.this_layer.getSelectedFeatures());
          //      esriMap.getMap(function (m) { m.setExtent(extent); });
          //    });
          //  }
          //});

        });
        if (scope.visible !== 'undefined') scope.$watch("visible", function (n, o) {
          if (scope.this_layer && n !== o) {
            scope.this_layer.setVisibility(n);
          }
        });

        scope.$on("$destroy", function () {
          scope.isObjectReady.then(function () {
            if ((scope.layerId || scope.id) && esriRegistry.get(scope.layerId || scope.id) === scope.this_layer)
              esriRegistry.remove(scope.layerId || scope.id);
            esriMap.removeLayer(scope.this_layer);
          });
        });
      }
    },
    controller: function ($scope) {
      this.add = function (point) {
        $scope.isObjectReady.then(function () {
          $scope.this_layer.add(point);
        });
      };
      this.setSymbol = function (symbol) {
        $scope.isObjectReady.then(function () {
          require(["esri/renderers/SimpleRenderer"], function (SimpleRenderer) {
            $scope.this_layer.setRenderer(SimpleRenderer(symbol));
          });
        });
      };
      this.remove = function (g) { $scope.this_layer.remove(g); };
      this.getLayer = function (action) {
        if (action)
          $scope.isObjectReady.then(function () { action($scope.this_layer) });
      };
      this.setRenderer = function (renderer) {
        $scope.isObjectReady.then(function () {
          $scope.this_layer.setRenderer(renderer);
        });
      };
      this.setInfoWindow = function (t, c) {
        $scope.isObjectReady.then(function () {
          require(["esri/InfoTemplate"], function (InfoTemplate) {
            var template = new InfoTemplate();
            template.setTitle(t);
            template.setContent(c);
            $scope.this_layer.setInfoTemplate(template);
          });
        });
      };
    }
  };
})
.directive("graphicsLayer", function ($q, esriRegistry) {

  return {
    restrict: "E",
    require: "^esriMap",
    scope: {
      id: "@",
      layerId: "@",
      visible: "=",
      onClick: "&",
      index: "@"
    },
    link: {
      pre: function (scope, element, attrs, esriMap) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;

        require(["esri/layers/GraphicsLayer"], function (GraphicsLayer) {
          scope.this_layer = new GraphicsLayer();
          esriMap.addLayer(scope.this_layer, scope.index);
          if (scope.layerId || scope.id) {
            scope.this_layer._layer_id = scope.layerId || scope.id;
            esriRegistry.set(scope.layerId || scope.id, scope.this_layer);
          }
          ready.resolve();

          scope.this_layer.on("click", function (r) {
            if (!scope.$$phase && !scope.$root.$$phase) scope.$apply(function () {
              if (scope.onClick()) scope.onClick()(r);
            });
          });
        });
        if (scope.visible) scope.$watch("visible", function (n, o) {
          if (scope.this_layer && n !== o) {
            scope.this_layer.setVisibility(n);
          }
        });
        scope.$on("$destroy", function () {
          scope.isObjectReady.then(function () {
            if ((scope.layerId || scope.id) && esriRegistry.get(scope.layerId || scope.id) === scope.this_layer) esriRegistry.remove(scope.layerId || scope.id);
            esriMap.removeLayer(scope.this_layer);
          });
        });
      }
    },
    controller: function ($scope) {
      this.add = function (point) {
        $scope.isObjectReady.then(function () {
          $scope.this_layer.add(point);
        });
      };
      this.setSymbol = function (symbol) {
        $scope.isObjectReady.then(function () {
          require(["esri/renderers/SimpleRenderer"], function (SimpleRenderer) {
            $scope.this_layer.setRenderer(new SimpleRenderer(symbol));
          });
        });
      };
      this.remove = function (g) {
        $scope.isObjectReady.then(function () {
          $scope.this_layer.remove(g);
        });
      };
      this.setInfoWindow = function (t, c) {
        $scope.isObjectReady.then(function () {
          require(["esri/InfoTemplate"], function (InfoTemplate) {
            var template = new InfoTemplate();
            template.setTitle(t);
            template.setContent(c);
            $scope.this_layer.setInfoTemplate(template);
          });
        });
      };
      this.getLayer = function (action) {
        if (action)
          $scope.isObjectReady.then(function () { action($scope.this_layer) });
      };
    }
  };
})

.directive("search", function ($q, esriRegistry) {
  return {
    restrict: "E",
    require: "^esriMap",
    scope: {
      id: "@",
      target: "@"
    },
    link: {
      pre: function (scope, element, attrs, esriMap) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;

        require(["esri/widgets/Search"], function (Search) {
          esriMap.getView(function (v) {

            scope.this_tool = new Search({ view: v }, scope.target);
            scope.this_tool.startup();

            if (scope.id) {
              scope.this_tool._id = scope.id;
              esriRegistry.set(scope.id, scope.this_tool);
            }
            ready.resolve();
          });
          scope.$on("$destroy", function () {
            scope.isObjectReady.then(function () {
              if (scope.id) esriRegistry.remove(scope.id);
              scope.this_tool.destroy();
            });
          });
        });
      }
    }
  };
})

.directive("polyLine", function ($q) {
  return {
    restrict: "E",
    require: ["?^graphicsLayer", "?^featureLayer"],
    scope: {
      json: "=",
      deepWatch: "@"
    },
    link: {
      post: function (scope, element, attrs, layers) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        var layer = layers[0] || layers[1];

        var create = function () {
          require(["esri/geometry/Polyline", "esri/Graphic"], function (Polyline, Graphic) {

            if (scope.json)
              if (scope.json instanceof Object && scope.json.type === "polyline")
                scope.geometry = scope.json;
              else
                scope.geometry = new Polyline(scope.json);
            if (scope.symbol) {
              scope.graphic = new Graphic(scope.geometry, scope.symbol);
              layer.add(scope.graphic);
            }
            else {
              scope.graphic = new Graphic(scope.geometry);
              layer.add(scope.graphic);
            }
            if (scope.extra) scope.graphic.extra = scope.extra;
          });
        };

        create();
        ready.resolve();

        scope.$on("$destroy", function () { scope.isObjectReady.then(function () { layer.remove(scope.graphic); }); });
        scope.$watch('json', function (newVal, oldVal) {
          if (scope.isObjectReady.$$state.status > 0)
            scope.isObjectReady.then(function () {
              if (layer)
                layer.remove(scope.graphic);
              create();
            });
        }, scope.deepWatch === "true");

      }
    },
    controller: function ($scope) {
      this.setSymbol = function (val) {
        $scope.symbol = val;
        if (typeof ($scope.isObjectReady) !== "undefined" && $scope.isObjectReady) {
          $scope.isObjectReady.then(function () {
            $scope.graphic.setSymbol(val);
            $scope.graphic.draw();
          });
        }
      };
    }
  };
})
.directive("polygon", function ($q) {

  return {
    restrict: "E",
    require: ["?^graphicsLayer", "?^featureLayer"],
    scope: {
      json: "=",
      extra: "=",
      deepWatch: "@"
    },
    link: {
      post: function (scope, element, attrs, layers) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        var layer = layers[0] || layers[1];

        var create = function () {
          require(["esri/geometry/Polygon", "esri/Graphic"], function (Polygon, Graphic) {

            if (scope.json)
              if (scope.json instanceof Object && scope.json.type === "polygon")
                scope.geometry = scope.json;
              else
                scope.geometry = new Polygon(scope.json);
            if (scope.symbol) {
              scope.graphic = new Graphic(scope.geometry, scope.symbol);
              layer.add(scope.graphic);
            }
            else {
              scope.graphic = new Graphic(scope.geometry);
              layer.add(scope.graphic);
            }

            if (scope.extra) scope.graphic.extra = scope.extra;

          });
        };

        create();
        ready.resolve();

        scope.$on("$destroy", function () { scope.isObjectReady.then(function () { layer.remove(scope.graphic); }); });
        scope.$watch('json', function (newVal, oldVal) {
          if (scope.isObjectReady.$$state.status > 0)
            scope.isObjectReady.then(function () {
              layer.remove(scope.graphic);
              create();
            });
        }, scope.deepWatch === "true");


      }
    },
    controller: function ($scope) {
      this.setSymbol = function (val) {
        $scope.symbol = val;
        if (typeof ($scope.isObjectReady) !== "undefined" && $scope.isObjectReady) {
          $scope.isObjectReady.then(function () {
            $scope.graphic.setSymbol(val);
            $scope.graphic.draw();
          });
        }
      };
    }
  };
})
.directive("point", function ($q) {
  function renderpoint(scope, layer) {
    var ready = $q.defer();
    scope.isObjectReady = ready.promise;
    require(["esri/geometry/Point", "esri/Graphic", "esri/SpatialReference", "esri/geometry/support/webMercatorUtils"], function (Point, Graphic, SpatialReference, webMercatorUtils) {

      if (scope.json)
        scope.this_point = new Point(scope.json);
      else if (scope.spatialReference)
        scope.this_point = new Point(scope.longitude, scope.latitude, new SpatialReference({ wkid: scope.spatialReference }));
      else
        scope.this_point = new Point(scope.longitude, scope.latitude);

      if (scope.this_point.spatialReference.wkid == "4326")
        scope.this_point = webMercatorUtils.geographicToWebMercator(scope.this_point);

      if (typeof (scope.geometry) !== "undefined")
        scope.geometry = scope.this_point;

      if (scope.symbol) {
        scope.graphic = new Graphic(scope.this_point, scope.symbol);
        layer.add(scope.graphic);
      }
      else {
        scope.graphic = new Graphic(scope.this_point);
        layer.add(scope.graphic);
      }

      if (scope.extra) scope.graphic.extra = scope.extra;

      ready.resolve();
    });
  }

  function redrawpoint(scope, layer) {
    require(["esri/geometry/Point", "esri/Graphic", "esri/geometry/SpatialReference", "esri/geometry/webMercatorUtils"], function (Point, Graphic, SpatialReference, webMercatorUtils) {
      if (scope.graphic) {
        var prevgraphic = scope.graphic;
        if (prevgraphic._layer && prevgraphic._layer.graphics && prevgraphic._layer.graphics.length > 0) {
          var i = prevgraphic._layer.graphics.indexOf(prevgraphic);
          prevgraphic._layer.graphics.splice(i, 1);
        }
        layer.remove(prevgraphic);
        prevgraphic.hide();
        if (scope.symbol)
          scope.graphic = new Graphic(scope.this_point, scope.symbol);
        else
          scope.graphic = new Graphic(scope.this_point);
        layer.add(scope.graphic);
        scope.graphic.draw();

      }
    });
  }

  return {
    restrict: "E",
    require: ["?^graphicsLayer", "?^featureLayer"],
    scope: {
      spatialReference: "@",
      latitude: "=",
      longitude: "=",
      json: "=",
      extra: "=",
      geometry: "="
    },
    link: {
      pre: function (scope, element, attrs, layers) {
        var layer = layers[0] || layers[1];
        renderpoint(scope, layer);
        scope.__layer = layer;
        scope.$on("$destroy", function () { scope.isObjectReady.then(function () { layer.remove(scope.graphic); }) });
        scope.$watch("latitude", function (n, o) {
          if (scope.this_point && n != o) {
            scope.this_point.setY(n);
            redrawpoint(scope, layer);
            if (typeof (scope.geometry) !== "undefined")
              scope.geometry = scope.this_point;

          }
        });
        scope.$watch("longitude", function (n, o) {
          if (scope.this_point && n != o) {
            scope.this_point.setX(n);
            redrawpoint(scope, layer);
            if (typeof (scope.geometry) !== "undefined")
              scope.geometry = scope.this_point;
          }
        });
      }
      /*,
      post: function (scope, element, attrs, layers)
      {
        var layer = layers[0] || layers[1];
       renderpoint(scope, layer);
      }
      */
    },
    controller: function ($scope) {
      this.setSymbol = function (val) {
        $scope.symbol = val;
        $scope.isObjectReady.then(function () {
          $scope.graphic.setSymbol(val);
          $scope.graphic.draw();
        });
      };
    }
  };
})
.directive("circle", function ($q) {
  function renderpoint(scope, layer) {
    var ready = $q.defer();
    scope.isObjectReady = ready.promise;
    require(["esri/geometry/Circle", "esri/geometry/Point", "esri/Graphic", "esri/geometry/SpatialReference", "esri/geometry/support/webMercatorUtils"],
      function (Circle, Point, Graphic, SpatialReference, webMercatorUtils) {

        var center = {};
        if (scope.spatialReference)
          center = new Point(scope.longitude, scope.latitude,
            new SpatialReference({ wkid: scope.spatialReference }));
        else
          center = new Point(scope.longitude, scope.latitude);

        //Check is WebMercator
        if (center.spatialReference.wkid == "4326")
          center = webMercatorUtils.geographicToWebMercator(center);

        scope.this_point = new Circle({
          center: center,
          radius: scope.radius
        });

        if (scope.symbol) {
          scope.graphic = new Graphic(scope.this_point, scope.symbol);
          layer.add(scope.graphic);
        }
        else {
          scope.graphic = new Graphic(scope.this_point);
          layer.add(scope.graphic);
        }
        if (scope.extra) scope.graphic.extra = scope.extra;

        if (typeof (scope.geometry) !== "undefined")
          scope.geometry = scope.this_point;
        ready.resolve();
      });
  }

  return {
    restrict: "E",
    require: ["?^graphicsLayer", "?^featureLayer"],
    scope: {
      spatialReference: "@",
      latitude: "=",
      longitude: "=",
      radius: "=",
      extra: "=",
      geometry: "="
    },
    link: {
      pre: function (scope, element, attrs, layers) {
        var layer = layers[0] || layers[1];
        renderpoint(scope, layer);

        scope.$watchGroup(["latitude", "longitude", "radius"], function () {
          scope.isObjectReady.then(function () {
            layer.remove(scope.graphic);
            renderpoint(scope, layer);
          });
        });
        scope.$on("$destroy", function () { scope.isObjectReady.then(function () { layer.remove(scope.graphic); }); });
      }
    },
    controller: function ($scope) {
      this.setSymbol = function (val) {
        $scope.isObjectReady.then(function () {
          $scope.symbol = val;
          $scope.graphic.setSymbol(val);
          $scope.graphic.draw();
        });
      };
    }
  };
})

.directive("pictureMarkerSymbol", function ($q) {
  return {
    restrict: "EA",
    scope: {
      symbolUrl: "@"
    },
    require: ["?^valueInfo", "^?uniqueValueRenderer", "?point", "?^point", "?^graphicsLayer", "?^featureLayer"],
    link: function (scope, element, attr, parents) {
      var ready = $q.defer();
      scope.isObjectReady = ready.promise;
      require(["esri/symbols/PictureMarkerSymbol"], function (PictureMarkerSymbol) {
        var pSymbol = new PictureMarkerSymbol(attr.symbolUrl || attr.pictureMarkerSymbol, attr.symbolWidth, attr.symbolHeight);
        if (attr.symbolOffsetX || attr.symbolOffsetY)
          pSymbol.setOffset(attr.symbolOffsetX ? attr.symbolOffsetX : 0, attr.symbolOffsetY ? attr.symbolOffsetY : 0)
        scope.this_symbol = pSymbol;
        ready.resolve();
        scope.ctrl = (parents[0] || parents[1] || parents[2] || parents[3] || parents[4] || parents[5]);
        if (scope.ctrl) scope.ctrl.setSymbol(scope.this_symbol);

        if (scope.symbolUrl) scope.$watch("symbolUrl", function (n, o) {
          if (scope.symbolUrl && scope.ctrl && n !== o) {
            var p2Symbol = new PictureMarkerSymbol(scope.symbolUrl, attr.symbolWidth, attr.symbolHeight);
            if (attr.symbolOffsetX || attr.symbolOffsetY)
              p2Symbol.setOffset(attr.symbolOffsetX ? attr.symbolOffsetX : 0, attr.symbolOffsetY ? attr.symbolOffsetY : 0)
            scope.this_symbol = p2Symbol;
            scope.ctrl.setSymbol(scope.this_symbol);
          }
        });
      });
    }
  };
})
.directive("simpleLineSymbol", function ($q) {
  return {
    restrict: "EA",
    require: ["?^pictureFillSymbol", "?^simpleFillSymbol", "?^simpleMarkerSymbol", "?circle", "?^circle", "?point", "?^point", "?polyLine", "?^polyLine", "?^polygon", "?^graphicsLayer", "?^featureLayer"],
    scope: {
      symbolColor: "@"
    },
    link: function (scope, element, attr, parents) {
      var ready = $q.defer();
      scope.isObjectReady = ready.promise;
      require(["esri/symbols/SimpleLineSymbol", "esri/Color"], function (SimpleLineSymbol, Color) {

        var style = SimpleLineSymbol.STYLE_SOLID;
        var sym = attr.symbolStyle || attr.SimpleLineSymbol;
        if (sym) {
          switch (sym) {
            case "STYLE_DASH": style = SimpleLineSymbol.STYLE_DASH; break;
            case "STYLE_DASHDOT": style = SimpleLineSymbol.STYLE_DASHDOT; break;
            case "STYLE_DASHDOTDOT": style = SimpleLineSymbol.STYLE_DASHDOTDOT; break;
            case "STYLE_DOT": style = SimpleLineSymbol.STYLE_DOT; break;
            case "STYLE_LONGDASHDOT": style = SimpleLineSymbol.STYLE_LONGDASHDOT; break;
            case "STYLE_NULL": style = SimpleLineSymbol.STYLE_NULL; break;
            case "STYLE_SOLID": style = SimpleLineSymbol.STYLE_SOLID; break;
            case "STYLE_SHORTDASH": style = SimpleLineSymbol.STYLE_SHORTDASH; break;
            case "STYLE_SHORTDASHDOT": style = SimpleLineSymbol.STYLE_SHORTDASHDOT; break;
            case "STYLE_SHORTDASHDOTDOT": style = SimpleLineSymbol.STYLE_SHORTDASHDOTDOT; break;
            case "STYLE_SHORTDOT": style = SimpleLineSymbol.STYLE_SHORTDOT; break;
            default: style = sym;
          }
        }


        scope.this_symbol = new SimpleLineSymbol(
          style,
          Color.fromString(attr.symbolColor),
          attr.symbolWidth);
        ready.resolve();
        scope.ctrl = (parents[0] || parents[1] || parents[2] || parents[3] || parents[4] || parents[5] || parents[6] || parents[7] || parents[8] || parents[9] || parents[10] || parents[11]);
        if (scope.ctrl) scope.ctrl.setSymbol(scope.this_symbol);

        if (scope.symbolColor) scope.$watch("symbolColor", function (n, o) {
          if (scope.symbolColor && scope.ctrl && n !== o) {
            scope.this_symbol = scope.this_symbol = new SimpleLineSymbol(
              style,
              Color.fromString(attr.symbolColor),
              attr.symbolWidth);
            scope.ctrl.setSymbol(scope.this_symbol);
          }
        });

      });
    }
  };
})
.directive("simpleFillSymbol", function ($q) {
  return {
    restrict: "EA",
    require: ["?circle", "?^circle", "?point", "?^point", "?polyLine", "?^polyLine", "?^polygon", "?^graphicsLayer", "?^featureLayer"],
    link: {
      pre: function (scope, element, attr, parents) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        require(["esri/symbols/SimpleFillSymbol", "esri/Color"], function (SimpleFillSymbol, Color) {
          scope.this_symbol = new SimpleFillSymbol();

          var style = SimpleFillSymbol.STYLE_SOLID;
          var sym = attr.symbolStyle || attr.SimpleFillSymbol;
          if (sym) {
            switch (sym) {
              case "STYLE_BACKWARD_DIAGONAL": style = SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL; break;
              case "STYLE_CROSS": style = SimpleFillSymbol.STYLE_CROSS; break;
              case "STYLE_DIAGONAL_CROSS": style = SimpleFillSymbol.STYLE_DIAGONAL_CROSS; break;
              case "STYLE_FORWARD_DIAGONAL": style = SimpleFillSymbol.STYLE_FORWARD_DIAGONAL; break;
              case "STYLE_HORIZONTAL": style = SimpleFillSymbol.STYLE_HORIZONTAL; break;
              case "STYLE_NULL": style = SimpleFillSymbol.STYLE_NULL; break;
              case "STYLE_SOLID": style = SimpleFillSymbol.STYLE_SOLID; break;
              case "STYLE_VERTICAL": style = SimpleFillSymbol.STYLE_VERTICAL; break;
              default: style = sym;
            }
          }
          scope.this_symbol.setStyle(style);

          if (attr.symbolColor)
            scope.this_symbol.setColor(Color.fromString(attr.symbolColor));

          ready.resolve();
          var ctrl = (parents[0] || parents[1] || parents[2] || parents[3] || parents[4] || parents[5] || parents[6] || parents[7] || parents[8]);
          if (ctrl) ctrl.setSymbol(scope.this_symbol);

          attr.$observe("symbolColor", function (n, o) {
            if (n)
              scope.this_symbol.setColor(Color.fromString(n));
            if (ctrl)
              ctrl.setSymbol(scope.this_symbol);
          });
        });
      }
    },
    controller: function ($scope) {
      this.setSymbol = function (s) {
        $scope.isObjectReady.then(function () {
          $scope.this_symbol.setOutline(s);
        });
      };
    }
  };
})
.directive("pictureFillSymbol", function ($q) {
  return {
    restrict: "EA",
    require: ["?circle", "?^circle", "?point", "?^point", "?polyLine", "?^polyLine", "?^polygon", "?^graphicsLayer", "?^featureLayer"],
    link: {
      pre: function (scope, element, attr, parents) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        require(["esri/symbols/PictureFillSymbol", "esri/Color"], function (PictureFillSymbol, Color) {
          scope.this_symbol = new PictureFillSymbol(attr.symbolUrl);

          if (attr.symbolColor) scope.this_symbol.setColor(Color.fromString(attr.symbolColor));
          if (attr.symbolWidth) scope.this_symbol.setWidth(attr.symbolWidth);
          if (attr.symbolHeight) scope.this_symbol.setHeight(attr.symbolHeight);

          ready.resolve();
          var ctrl = (parents[0] || parents[1] || parents[2] || parents[3] || parents[4] || parents[5] || parents[6] || parents[7] || parents[8]);
          if (ctrl) ctrl.setSymbol(scope.this_symbol);

          attr.$observe("symbolColor", function (n, o) {
            if (n)
              scope.this_symbol.setColor(Color.fromString(n));
            if (ctrl)
              ctrl.setSymbol(scope.this_symbol);
          });
        });
      }
    },
    controller: function ($scope) {
      this.setSymbol = function (s) {
        $scope.isObjectReady.then(function () {
          $scope.this_symbol.setOutline(s);
        });
      };
    }
  };
})
.directive("simpleTextSymbol", function ($q) {
  return {
    restrict: "EA",
    require: ["?point", "?^point", "?^graphicsLayer", "?^featureLayer"],
    scope: {
      textColor: "@",
      text: "@",
      fontSize: "@",
      fontStyle: "@",
      fontVariant: "@",
      fontWeight: "@",
      fontFamily: "@",
      xOffset: "@",
      yOffset: "@"
    },
    link: {
      pre: function (scope, element, attr, parents) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        require(["esri/symbols/TextSymbol", "esri/Color", "esri/symbols/Font"], function (TextSymbol, Color, Font) {

          var fontStyle = Font.STYLE_NORMAL;
          if (scope.fontStyle) {
            switch (scope.fontStyle) {
              case "STYLE_ITALIC": fontStyle = Font.STYLE_ITALIC; break;
              case "STYLE_OBLIQUE": fontStyle = Font.STYLE_OBLIQUE; break;
            }
          }
          var fontVariant = Font.VARIANT_NORMAL;
          if (scope.fontVariant) {
            switch (scope.fontVariant) {
              case "VARIANT_SMALLCAPS": fontVariant = Font.VARIANT_SMALLCAPS; break;
            }
          }
          var fontWeight = Font.WEIGHT_NORMAL
          if (scope.fontWeight) {
            switch (scope.fontWeight) {
              case "WEIGHT_BOLD": fontWeight = Font.WEIGHT_BOLD; break;
              case "WEIGHT_BOLDER": fontWeight = Font.WEIGHT_BOLDER; break;
              case "WEIGHT_LIGHTER": fontWeight = Font.WEIGHT_LIGHTER; break;
            }
          }
          var font = new Font(scope.fontSize || "16", fontStyle, fontVariant, fontWeight, scope.fontFamily);

          scope.this_symbol = new TextSymbol(scope.text || attr.simpleTextSymbol || "", font);


          if (scope.xOffset && scope.yOffset) scope.this_symbol.setOffset(parseInt(scope.xOffset), parseInt(scope.yOffset));
          else if (scope.xOffset) scope.this_symbol.setOffset(parseInt(scope.xOffset), 0);
          else if (scope.yOffset) scope.this_symbol.setOffset(0, parseInt(scope.yOffset));

          if (scope.textColor)
            scope.this_symbol.setColor(Color.fromString(scope.textColor));

          ready.resolve();
          scope.ctrl = (parents[0] || parents[1] || parents[2] || parents[3]);
          if (scope.ctrl) scope.ctrl.setSymbol(scope.this_symbol);
          scope.$watch("text", function (n, o) {
            //             if (scope.text && scope.ctrl && n !== o) {
            //               scope.this_symbol.setText(n);
            //             }
            scope.this_symbol.setText(scope.text);
          });
        });
      }
    }
  };
})
.directive("simpleMarkerSymbol", function ($q) {
  return {
    restrict: "EA",
    require: ["?point", "?^point", "?^graphicsLayer", "?^featureLayer"],
    scope: {
      json: "=",
      color: "@",
      path: "@"
    },
    link: {
      pre: function (scope, element, attr, parents) {
        var ready = $q.defer();
        scope.isObjectReady = ready.promise;
        require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color) {

          var style = SimpleMarkerSymbol.STYLE_CIRCLE;
          var sym = attr.symbolStyle || attr.SimpleMarkerSymbol;
          if (sym) {
            switch (sym) {
              case "STYLE_CIRCLE": style = SimpleMarkerSymbol.STYLE_BACKWARD_DIAGONAL; break;
              case "STYLE_CROSS": style = SimpleMarkerSymbol.STYLE_CROSS; break;
              case "STYLE_DIAMOND": style = SimpleMarkerSymbol.STYLE_DIAMOND; break;
              case "STYLE_PATH": style = SimpleMarkerSymbol.STYLE_PATH; break;
              case "STYLE_SQUARE": style = SimpleMarkerSymbol.STYLE_SQUARE; break;
              case "STYLE_X": style = SimpleMarkerSymbol.STYLE_X; break;
              default: style = sym;
            }
          }

          if (scope.json)
            scope.this_symbol = new SimpleMarkerSymbol(scope.json);
          else
            scope.this_symbol = new SimpleMarkerSymbol();

          if (scope.color != undefined) {
            if (scope.color) scope.this_symbol.setColor(Color.fromString(scope.color));
            scope.$watch("color", function (n, o) {
              if (scope.color && n !== o) {
                scope.this_symbol.setColor(Color.fromString(scope.color));
              }
            });
          }

          if (attr.size != undefined && attr.size) scope.this_symbol.setSize(parseInt(attr.size));
          if (scope.path != undefined && scope.path) scope.this_symbol.setPath(scope.path);

          ready.resolve();
          scope.ctrl = (parents[0] || parents[1] || parents[2] || parents[3]);
          if (scope.ctrl) scope.ctrl.setSymbol(scope.this_symbol);
        });
      }
    },
    controller: function ($scope) {
      $scope.infos = [];
      this.setSymbol = function (s) {
        $scope.isObjectReady.then(function () {
          $scope.this_symbol.setOutline(s);
          $scope.ctrl.setSymbol($scope.this_symbol);
        });
      };
    }
  };
})