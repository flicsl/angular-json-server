"use strict";

describe("CRUDServiceFactory", function() {
	var $httpBackend;
	var CRUDServiceFactoryProvider;
	var CRUDServiceFactory;
	var ServiceInstance;
	var CRUD_SERVICE;
	var SERVER_URL;
	var PLAYER_LIST;

	beforeEach(module("angular-json-server", _CRUDServiceFactoryProvider_ => {
		SERVER_URL = "http://serverurl.com/";
		CRUDServiceFactoryProvider = _CRUDServiceFactoryProvider_;
		CRUDServiceFactoryProvider.setServerUrl(SERVER_URL);
	}));

	beforeEach(inject(function($injector) {
		PLAYER_LIST = [{
			id: 0,
			name: "A"
		}, {
			id: 1,
			name: "B"
		}]; // FIXME
		$httpBackend = $injector.get("$httpBackend");
		CRUD_SERVICE = $injector.get("CRUD_SERVICE");
		CRUDServiceFactory = CRUDServiceFactoryProvider.$get[3](CRUD_SERVICE, $injector.get("$q"), $injector.get("$http"));
		ServiceInstance = CRUDServiceFactory.createInstance("players");
	}));

	it("should be a valid service instance", function() {
		ServiceInstance.should.be.an("object");
	});

	it("should throw error if falsy resourcePath given to createInstance", function() {
		CRUDServiceFactory.createInstance.should.throw(Error);
	});

	it("should expose standard service methods", function() {
		ServiceInstance.find.should.be.a("function");
		ServiceInstance.findOne.should.be.a("function");
		ServiceInstance.put.should.be.a("function");
		ServiceInstance.destroy.should.be.a("function");
	});

	describe("find", function() {
		describe("querying", function(done) {
			it("correctly queries fullText according to API spec", function(done) {
				var TEXT_SEARCH_KEY = "ozymandias";
				var PAGE = CRUD_SERVICE.FIND.DEFAULT_PAGE;
				var PAGE_SIZE = CRUD_SERVICE.FIND.DEFAULT_PAGE_SIZE;
				var START = PAGE * PAGE_SIZE;
				var EXPECTED_GET_URL = SERVER_URL +
										"players?_limit=" + PAGE_SIZE +
										"&_start=" + START +
										"&q=" + TEXT_SEARCH_KEY;

				$httpBackend.expectGET(EXPECTED_GET_URL).respond({});
				ServiceInstance.find({textSearch: TEXT_SEARCH_KEY})
				.then(response => {
					response.should.have.property("data").to.deep.equal({});
					done();
				});
				$httpBackend.flush();
			});
		});

		describe("pagination", function(done) {
			it("paginates results if both arguments are given", function(done) {
				testPagination(done, {page: 7, pageSize: 9});
			});

			it("paginates results if only pageSize is given", function(done) {
				testPagination(done, {pageSize: 8});
			});

			it("paginates results if only page is given", function(done) {
				testPagination(done, {page: 9});
			});

			it("paginates results when no params are given", function(done) {
				testPagination(done);
			});

			/**
			 * Simple pagination test, ignoring queries.
			 * @param {done} done Callback once test completes.
			 * @param {Object} [opts] The result options.
			 * @param {number} [options.page=0] The desired page.
			 * @param {number} [options.pageSize=10] The desired pageSize.
			 */
			function testPagination(done, opts) {
				opts = angular.extend({}, opts);
				var FIND_CONSTANTS = CRUD_SERVICE.FIND;
				var PAGE = opts.page || FIND_CONSTANTS.DEFAULT_PAGE;
				var PAGE_SIZE = opts.pageSize || FIND_CONSTANTS.DEFAULT_PAGE_SIZE;
				var START = PAGE * PAGE_SIZE;
				var END = START + PAGE_SIZE;
				var EXPECTED_GET_URL = SERVER_URL +
										"players?_limit=" + PAGE_SIZE +
										"&_start=" + START;

				$httpBackend.when("GET", EXPECTED_GET_URL)
				.respond(PLAYER_LIST.slice(START, END));

				$httpBackend.expectGET(EXPECTED_GET_URL);
				ServiceInstance.find({}, opts).then(response => {
					response.should.have.property("data").to.deep.equal(PLAYER_LIST.slice(START, END));
					done();
				});
				$httpBackend.flush();
			}
		});
	});

	describe("put", function() {
		it("should resolve the created / modified player data", function(done) {
			var EXPECTED_PUT_URL = SERVER_URL + "players";
			$httpBackend.when("PUT", EXPECTED_PUT_URL).respond(PLAYER_LIST[0]);

			$httpBackend.expectPUT(EXPECTED_PUT_URL);
			ServiceInstance.put(PLAYER_LIST[0])
			.then(response => {
				response.should.eql(PLAYER_LIST[0]);
				done();
			});
			$httpBackend.flush();
		});

		it("should reject with server message", function(done) {
			var EXPECTED_PUT_URL = SERVER_URL + "players";
			var SERVER_REJECTION = {
				message: "INVALID_EMAIL"
			};
			$httpBackend.when("PUT", EXPECTED_PUT_URL).respond(401, SERVER_REJECTION);

			$httpBackend.expectPUT(EXPECTED_PUT_URL);
			ServiceInstance.put(PLAYER_LIST[0])
			.catch(err => {
				err.should.eql(SERVER_REJECTION);
				done();
			});
			$httpBackend.flush();
		});
	});

	describe("destroy", function() {
		it("should call correct URL with player id", function(done) {
			var PLAYER_ID = PLAYER_LIST[0].id;
			var EXPECTED_DELETE_URL = SERVER_URL + "players/" + PLAYER_ID;
			var SERVER_RESPONSE = {success: true};
			$httpBackend.when("DELETE", EXPECTED_DELETE_URL).respond(SERVER_RESPONSE);

			$httpBackend.expectDELETE(EXPECTED_DELETE_URL);
			ServiceInstance.destroy(PLAYER_ID)
			.then(response => {
				response.should.eql(SERVER_RESPONSE);
				done();
			});
			$httpBackend.flush();
		});

		it("should reject with server message", function(done) {
			var PLAYER_ID = PLAYER_LIST[0].Id;
			var EXPECTED_DELETE_URL = SERVER_URL + "players/" + PLAYER_ID;
			var SERVER_REJECTION = {
				success: false
			};

			$httpBackend.when("DELETE", EXPECTED_DELETE_URL)
			.respond(401, SERVER_REJECTION);

			$httpBackend.expectDELETE(EXPECTED_DELETE_URL);
			ServiceInstance.destroy(PLAYER_ID)
			.catch(err => {
				err.should.eql(SERVER_REJECTION);
				done();
			});
			$httpBackend.flush();
		});
	});
});
