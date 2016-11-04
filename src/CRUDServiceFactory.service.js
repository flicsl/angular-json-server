/**
 * Set of classes that implement API manipulation based on [json-server](https://github.com/typicode/json-server) specs.
 * @namespace CRUDServiceFactory
 */
(function() {
	angular.module("angular-json-server")
	.factory("CRUDServiceFactory", function(SERVER_URL,
											CRUD_SERVICE,
											$q,
											$http) {
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
		CRUDService.prototype.find = function(query, options) {
			// Default values
			query = angular.extend({}, query);
			options = angular.extend({
				page: CRUD_SERVICE.FIND.DEFAULT_PAGE,
				pageSize: CRUD_SERVICE.FIND.DEFAULT_PAGE_SIZE
			}, options);

			// Build params object
			var params = {
				q: query.textSearch,
				_start: options.page * options.pageSize,
				_limit: options.pageSize
			};

			// Query server and respond
			return $q((resolve, reject) => {
				$http.get(SERVER_URL + this.resourcePath, {params: params})
				.then(response => {
					resolve(response);
				}, err => {
					reject(err.data);
				});
			});
		};

		/**
		 * Finds a single instance of a resource.
		 * @param {Number} id The id of the resource.
		 * @return {Promise<Value>} Promise to be resolved with the data.
		 */
		CRUDService.prototype.findOne = function(id) {
			return $q((resolve, reject) => {
				$http.get(`${SERVER_URL}${this.resourcePath}/${id}`)
				.then(response => {
					resolve(response.data);
				}, err => reject(err.data));
			});
		};

		/**
		 * Creates or updates a resource.
		 * @param {Object} value The resource data.
		 * @return {Promise<Value>} Standard promise with created/update value data.
		 */
		CRUDService.prototype.put = function(value) {
			value = angular.extend({}, value);

			return $q((resolve, reject) => {
				$http.put(SERVER_URL + this.resourcePath, value)
				.then(response => {
					resolve(response.data);
				}, err => {
					reject(err.data);
				});
			});
		};

		/**
		 * Destroys a resource instance.
		 * @param {String} id The resource id.
		 * @return {Promise} Standard promise with success field.
		 */
		CRUDService.prototype.destroy = function(id) {
			return $q((resolve, reject) => {
				$http.delete(SERVER_URL + this.resourcePath + "/" + id)
				.then(response => {
					resolve(response.data);
				}, err => {
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
			if (!resourcePath)
				throw new Error("resourcePath missing on CRUDServiceFactory");
			return new CRUDService(resourcePath);
		}
	});
})();
