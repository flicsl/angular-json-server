"use strict";

(function () {
	angular.module("angular-json-server", []);
})();
"use strict";

/**
 * The factory for creation of CRUDResources.
 * A CRUDResource is a generated service object that allows easy creation
 * of resource lists, since it contains all the query and sync to view-model logic.
 * @namespace CRUDResourceFactory
 */
(function () {
	angular.module("angular-json-server").factory("CRUDResourceFactory", ["$q", function ($q) {
		var defaultOptions = {
			pageSize: 10,
			resourceName: "resource",
			instanceName: "instance"
		};

		/**
   * The constructor for a new CRUDResource.
   * @param {CRUDServiceFactory.CRUDService} crudService The CRUD service to use.
   * @param {Object} vm The controller"s view-model object.
   * @param {Object} [options] The options to use.
   * @param {Number} [options.pageSize] The default page size for the resource.
   * @param {String} [options.resourceName] The default resource name.
   * @param {String} [options.instance] The default resource instance name.
   * @param {function} [options.onLoadError] Function called once the server responds with a load error.
   * @param {function} [options.onLoad] Function called once the server successfuly responds.
   * @param {Object} [options.query] Query to use as default when loading resources.
   * @param {Object} [options.watcher] Object with data to register a watcher.
   * @param {Object} [options.watcher.scope] Registers a watcher in given scope.
   * @param {Object} [options.watcher.expression="query"] Registers a watcher to evaluate given expression in view-model.
   * @param {Object} [options.watcher.loadOne=false] Whether the watcher should call loadOne() instead of load().
   * @param {Object} [options.watcher.customLoadFunction] Registers a custom load function to be called on change.
   * The instances of the resource will be available through this property in the view-model object.
   * @memberof CRUDResourceFactory
   * @constructor
   */
		function CRUDResource(crudService, vm, options) {
			var _this = this;

			this.crudService = crudService;
			this.vm = vm;
			this.options = angular.extend({}, defaultOptions, options);
			this.vm.currentPage = 0;

			var watcher = options.watcher;

			watcher && watcher.scope && watcher.scope.$watch(function () {
				return watcher.expression ? _this.vm[watcher.expression] : _this.vm.query;
			}, function (newVal, oldVal) {
				if (watcher.customLoadFunction) watcher.customLoadFunction(newVal);else watcher.loadOne ? _this.loadOne(newVal) : _this.load(newVal);
			}, true);

			/**
    * Load more objects of the resource into view model.
    * @param {Object} query The query to be sent to service.
    * @param {String} query.union Whether the response should be united with the already loaded resources.
    * @param {number} page The page to load.
    * @param {number} pageSize The page size.
    * @return {Promise} The promise to be resolved once the request resolves and the view model is updated.
    */
			CRUDResource.prototype.load = function (query) {
				var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
				var pageSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _this.options.pageSize;

				_this.vm.loading = true;
				query = angular.extend({}, _this.options.query, query);
				_this.vm.loadedAll = false;
				return _this.crudService.find(query, { page: page, pageSize: pageSize }).then(function (response) {
					// Processes union queries
					if (query.union) {
						var loadedResources = _this.vm[_this.options.resourceName];
						_this.vm[_this.options.resourceName] = union(loadedResources, response.data);
					} else {
						_this.vm[_this.options.resourceName] = response.data;
						_this.vm.currentPage = 0;
					}

					// Updates the vm whenever all elements have loaded
					var totalCount = response.headers("X-Total-Count");
					if (totalCount && page * pageSize + pageSize >= totalCount) {
						_this.vm.loadedAll = true;
					}

					// Calls onLoad method, if any
					_this.options.onLoad && _this.options.onLoad(response);
					return response.data;
				}, function (err) {
					_this.vm.loadingError = true;
					_this.options.onLoadError && _this.options.onLoadError(err);
					return err;
				}).finally(function () {
					_this.vm.loading = false;
				});
			};

			/**
    * Loads more items of a resource, increasing current page at view-model.
    * @param {Object} query The query to be sent to service.
    * @param {number} [pageSize] The size of the page to load.
    * @return {Promise} The promise to be resolved once the request is resolved and the view-model is updated.
    */
			CRUDResource.prototype.loadMore = function (query) {
				var pageSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _this.options.pageSize;

				query = angular.extend({}, query, { union: true });
				_this.vm.currentPage = _this.vm.currentPage || 0;
				_this.vm.currentPage++;
				if (_this.vm.loadedAll) throw new Error("There are no more resources to load.");
				return _this.load(query, _this.vm.currentPage, pageSize);
			};

			/**
    * Loads a single instance of a resource.
    * @param {string} id The id of the instance.
    * @return {Promise} Promise to be resolved once request is resolved and view-model is updated.
    */
			CRUDResource.prototype.loadOne = function (id) {
				_this.vm.loading = true;
				return $q(function (resolve, reject) {
					_this.crudService.findOne(id).then(function (response) {
						_this.vm[_this.options.instanceName] = response;
						_this.options.onLoad && _this.options.onLoad(response.data);
						resolve(response);
						return response;
					}, function (err) {
						_this.vm.loadingError = true;
						_this.options.onLoadError && _this.options.onLoadError(err);
						return err;
					}).finally(function () {
						_this.vm.loading = false;
					});
				});
			};
		}

		return {
			createInstance: createInstance
		};

		/**
   * Creates a new CRUDResource instance for given resource.
   * @param {CRUDServiceFactory.CRUDService} crudService The CRUD service to use.
   * @param {Object} vm The controller view-model object.
   * @param {Object} [options] The options for the CRUDResource. Refer to [CRUDResourceFactory.CRUDResource] constructor.
   * @return {CRUDResource} The new CRUDResource.
   */
		function createInstance(crudService, vm, options) {
			if (!crudService || !vm) throw new Error("createInstance missing required parameters");
			return new CRUDResource(crudService, vm, options);
		}
	}]);

	/**
  * Small helper function to union two arrays.
  * @param {Array} array1 First array to merge.
  * @param {Array} array2 Second array to merge.
  * @return {Array} a Unioned array.
  */
	function union(array1, array2) {
		var a = array1.concat(array2);
		for (var i = 0; i < a.length; ++i) {
			for (var j = i + 1; j < a.length; ++j) {
				if (a[i] === a[j]) a.splice(j--, 1);
			}
		}
		return a;
	}
})();
"use strict";

/**
 * Set of classes that implement API manipulation based on [json-server](https://github.com/typicode/json-server) specs.
 * @namespace CRUDServiceFactory
 */
(function () {
	angular.module("angular-json-server").constant("CRUD_SERVICE", {
		FIND: {
			DEFAULT_PAGE_SIZE: 10,
			DEFAULT_PAGE: 0
		}
	}).provider("CRUDServiceFactory", function () {
		var _this = this;

		this.serverUrl = "";

		this.setServerUrl = function (url) {
			_this.serverUrl = url;
		};

		this.$get = ["CRUD_SERVICE", "$q", "$http", function (CRUD_SERVICE, $q, $http) {
			return new CRUDServiceFactory(_this.serverUrl, CRUD_SERVICE, $q, $http);
		}];
	});

	/**
  * Returns a new CRUDServiceFactory instance.
  * @param {String} SERVER_URL Server URL of the product factories.
  * @param {Object} CRUD_SERVICE Service configuration.
  * @param {Object} $q Angular $q object.
  * @param {Object} $http Angular $http object.
  * @return {CRUDServiceFactory} obj Resulting instance.
  */
	function CRUDServiceFactory(SERVER_URL, CRUD_SERVICE, $q, $http) {
		/**
   * The constructor for a new CRUDService.
   * @param {string} resourcePath The path for the resource.
   * @memberof CRUDServiceFactory
   * @constructor
   */
		function CRUDService(resourcePath) {
			this.resourcePath = resourcePath;
		}

		/**
   * Retrieves a list of given resource.
   * @param {Object} query Query object.
   * @param {String} [query.textSearch] A substring to enable full text search (case-insensitive).
   * @param {Object} [options] The result options.
   * @param {number} [options.page=0] The desired page.
   * @param {number} [options.pageSize=10] The desired pageSize.
   * @return {Promise} Standard promise with matching resource values.
   */
		CRUDService.prototype.find = function (query, options) {
			var _this2 = this;

			// Default values
			query = angular.extend({}, query);
			options = angular.extend({
				page: CRUD_SERVICE.FIND.DEFAULT_PAGE,
				pageSize: CRUD_SERVICE.FIND.DEFAULT_PAGE_SIZE
			}, options);

			// Build params object
			var params = angular.extend({}, query, {
				q: query.textSearch,
				_start: options.page * options.pageSize,
				_limit: options.pageSize
			});

			// Query server and respond
			return $q(function (resolve, reject) {
				$http.get(SERVER_URL + _this2.resourcePath, { params: params }).then(function (response) {
					resolve(response);
				}, function (err) {
					reject(err.data);
				});
			});
		};

		/**
   * Finds a single instance of a resource.
   * @param {Number} id The id of the resource.
   * @return {Promise<Value>} Promise to be resolved with the data.
   */
		CRUDService.prototype.findOne = function (id) {
			var _this3 = this;

			return $q(function (resolve, reject) {
				$http.get("" + SERVER_URL + _this3.resourcePath + "/" + id).then(function (response) {
					resolve(response.data);
				}, function (err) {
					return reject(err.data);
				});
			});
		};

		/**
   * Creates or updates a resource.
   * @param {Object} value The resource data.
   * @return {Promise<Value>} Standard promise with created/update value data.
   */
		CRUDService.prototype.put = function (value) {
			var _this4 = this;

			value = angular.extend({}, value);

			return $q(function (resolve, reject) {
				$http.put(SERVER_URL + _this4.resourcePath, value).then(function (response) {
					resolve(response.data);
				}, function (err) {
					reject(err.data);
				});
			});
		};

		/**
   * Destroys a resource instance.
   * @param {String} id The resource id.
   * @return {Promise} Standard promise with success field.
   */
		CRUDService.prototype.destroy = function (id) {
			var _this5 = this;

			return $q(function (resolve, reject) {
				$http.delete(SERVER_URL + _this5.resourcePath + "/" + id).then(function (response) {
					resolve(response.data);
				}, function (err) {
					reject(err.data);
				});
			});
		};

		return {
			createInstance: createInstance
		};

		/**
   * Creates a new instance of given resource.
   * @param {string} resourcePath The path of the resource.
   * @return {Object} The new CRUD Service.
   */
		function createInstance(resourcePath) {
			if (!resourcePath) throw new Error("resourcePath missing on CRUDServiceFactory");
			return new CRUDService(resourcePath);
		}
	}
})();