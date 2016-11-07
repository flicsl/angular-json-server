/**
 * The factory for creation of CRUDResources.
 * A CRUDResource is a generated service object that allows easy creation
 * of resource lists, since it contains all the query and sync to view-model logic.
 * @namespace CRUDResourceFactory
 */
(function() {
	angular.module("angular-json-server")
	.factory("CRUDResourceFactory", function($q) {
		const defaultOptions = {
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
			this.crudService = crudService;
			this.vm = vm;
			this.options = angular.extend({}, defaultOptions, options);
			this.vm.currentPage = 0;

			var watcher = options.watcher;

			watcher && watcher.scope && watcher.scope.$watch(() => {
				return watcher.expression ? this.vm[watcher.expression] : this.vm.query;
			}, (newVal, oldVal) => {
				if (watcher.customLoadFunction)
					watcher.customLoadFunction(newVal);
				else
					watcher.loadOne ? this.loadOne(newVal) : this.load(newVal);
			}, true);

			/**
			 * Load more objects of the resource into view model.
			 * @param {Object} query The query to be sent to service.
			 * @param {String} query.union Whether the response should be united with the already loaded resources.
			 * @param {number} page The page to load.
			 * @param {number} pageSize The page size.
			 * @return {Promise} The promise to be resolved once the request resolves and the view model is updated.
			 */
			CRUDResource.prototype.load = (query, page = 0, pageSize = this.options.pageSize) => {
				this.vm.loading = true;
				query = angular.extend({}, this.options.query, query);
				this.vm.loadedAll = false;
				return this.crudService.find(query, {page: page, pageSize: pageSize})
				.then(response => {
					// Processes union queries
					if (query.union) {
						var loadedResources = this.vm[this.options.resourceName];
						this.vm[this.options.resourceName] = union(loadedResources, response.data);
					} else {
						this.vm[this.options.resourceName] = response.data;
						this.vm.currentPage = 0;
					}

					// Updates the vm whenever all elements have loaded
					var totalCount = response.headers("X-Total-Count");
					if (totalCount && (page * pageSize + pageSize) >= totalCount) {
						this.vm.loadedAll = true;
					}

					// Calls onLoad method, if any
					this.options.onLoad && this.options.onLoad(response);
					return response.data;
				},
				err => {
					this.vm.loadingError = true;
					this.options.onLoadError && this.options.onLoadError(err);
					return err;
				})
				.finally(() => {
					this.vm.loading = false;
				});
			};

			/**
			 * Loads more items of a resource, increasing current page at view-model.
			 * @param {Object} query The query to be sent to service.
			 * @param {number} [pageSize] The size of the page to load.
			 * @return {Promise} The promise to be resolved once the request is resolved and the view-model is updated.
			 */
			CRUDResource.prototype.loadMore = (query, pageSize = this.options.pageSize) => {
				query = angular.extend({}, query, {union: true});
				this.vm.currentPage = this.vm.currentPage || 0;
				this.vm.currentPage++;
				if (this.vm.loadedAll)
					throw new Error("There are no more resources to load.");
				return this.load(query, this.vm.currentPage, pageSize);
			};

			/**
			 * Loads a single instance of a resource.
			 * @param {string} id The id of the instance.
			 * @return {Promise} Promise to be resolved once request is resolved and view-model is updated.
			 */
			CRUDResource.prototype.loadOne = id => {
				this.vm.loading = true;
				return $q((resolve, reject) => {
					this.crudService.findOne(id)
					.then(response => {
						this.vm[this.options.instanceName] = response;
						this.options.onLoad && this.options.onLoad(response.data);
						resolve(response);
						return response;
					}, err => {
						this.vm.loadingError = true;
						this.options.onLoadError && this.options.onLoadError(err);
						return err;
					})
					.finally(() => {
						this.vm.loading = false;
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
			if (!crudService || !vm)
				throw new Error("createInstance missing required parameters");
			return new CRUDResource(crudService, vm, options);
		}
	});

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
				if (a[i] === a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	}
})();
