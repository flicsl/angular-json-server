"use strict";

describe("CRUDResourceFactory", function() {
	var CRUDResourceFactory;
	var PlayerService;
	var PlaceService;
	var $rootScope;

	beforeEach(module("angular-json-server"));
	beforeEach(inject(function($injector) {
		CRUDResourceFactory = $injector.get("CRUDResourceFactory");
		const SERVER_RESPONSE = {
			headers: () => {},
			data: []
		};
		const BaseService = {
			find: sinon.stub().returnsPromise().resolves(SERVER_RESPONSE),
			findOne: sinon.stub().returnsPromise().resolves(SERVER_RESPONSE)
		};
		PlayerService = angular.extend({}, BaseService);
		PlaceService = angular.extend({}, BaseService);
		$rootScope = $injector.get("$rootScope");
	}));

	it("calls service with given pageSize", function() {
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, {pageSize: 8});
		PlayerResource.load();
		PlayerService.find.should.have.been.calledWith({}, {page: 0, pageSize: 8});
	});

	it("loads a single resource into vm instance name", function() {
		var vm = this;
		var PLAYER = {name: "name"};
		var ID = "0SPS2-11102";
		var stub = PlayerService.findOne = sinon.stub().returnsPromise().resolves(PLAYER);
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, {instanceName: "player"});
		PlayerResource.loadOne(ID);
		stub.should.have.been.calledWith(ID);
		vm.player.should.eql(PLAYER);
	});

	describe("callback", function() {
		var loadCallback;
		var SERVER_RESPONSE;

		describe("onLoad", function() {
			beforeEach(function() {
				SERVER_RESPONSE = {headers: sinon.spy(), data: []};
				PlayerService.find = sinon.stub().returnsPromise().resolves(SERVER_RESPONSE);
				loadCallback = sinon.spy();
			});

			it("is called on load", function() {
				var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, {
					onLoad: loadCallback
				});
				PlayerResource.load();
				loadCallback.should.have.been.calledWith(SERVER_RESPONSE);
			});

			it("is called on load one", function() {
				var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, {
					onLoad: loadCallback
				});
				PlayerResource.load();
				loadCallback.should.have.been.calledWith(SERVER_RESPONSE);
			});
		});

		describe("onLoadError", function() {
			beforeEach(function() {
				SERVER_RESPONSE = {data: {message: "error message"}};
				PlayerService.find = sinon.stub().returnsPromise().rejects(SERVER_RESPONSE);
				loadCallback = sinon.spy();
			});

			it("is called on load", function() {
				var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, {
					onLoadError: loadCallback
				});
				PlayerResource.load();
				loadCallback.should.have.been.calledWith(SERVER_RESPONSE);
			});

			it("is called on load one", function() {
				var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, {
					onLoadError: loadCallback
				});
				PlayerResource.load();
				loadCallback.should.have.been.calledWith(SERVER_RESPONSE);
			});
		});
	});

	it("correctly calls onLoadError", function() {
		var loadingErrorCallback = sinon.spy();
		var RESOURCE_OPTIONS = {onLoadError: loadingErrorCallback};

		var SERVER_ERROR = {code: 500};

		PlayerService.find = sinon.stub().returnsPromise().rejects(SERVER_ERROR);
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, RESOURCE_OPTIONS);
		PlayerResource.load();
		loadingErrorCallback.should.have.been.calledWith(SERVER_ERROR);
	});

	it("should increase the current page number on vm after loading more", function() {
		var vm = {};
		var RESOURCE_OPTIONS = {resourceName: "players"};
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
		PlayerResource.load();
		vm.currentPage.should.equal(0);
		PlayerResource.loadMore();
		vm.currentPage.should.equal(1);
	});

	it("should union resources at load more, instead of replacing them", function() {
		var vm = {
			players: ["a", "b", "c"]
		};
		var RESOURCE_OPTIONS = {resourceName: "players"};
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
		PlayerService.find = sinon.stub().returnsPromise().resolves({data: ["d", "e"]});
		PlayerResource.loadMore();
		vm.players.should.deep.equal(["a", "b", "c", "d", "e"]);
	});

	it("should setup loadedAll if all resources are loaded", function() {
		var vm = {};
		var RESOURCE_OPTIONS = {resourceName: "players", pageSize: 12};
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
		var headers = sinon.stub().returns(8);
		var RESPONSE = {headers: headers, data: []};
		PlayerService.find = sinon.stub().returnsPromise().resolves(RESPONSE);
		PlayerResource.load();
		expect(vm.loadedAll).to.be.ok;
	});

	it("should throw error if loadedAll", function() {
		var vm = {
			loadedAll: true
		};
		var RESOURCE_OPTIONS = {resourceName: "players", pageSize: 12};
		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
		expect(function() {
			PlayerResource.loadMore({}, 8);
		}).to.throw(Error);
	});

	describe("watcher", function() {
		var scope;
		var customLoadFunction;
		var vm;

		beforeEach(function() {
			scope = $rootScope.$new();
			customLoadFunction = sinon.spy();
			vm = {};
		});

		it("should load custom function, if any", function() {
			var RESOURCE_OPTIONS = {
				resourceName: "players",
				pageSize: 8,
				watcher: {
					scope: scope,
					customLoadFunction: customLoadFunction
				}
			};
			CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
			scope.query = {};
			$rootScope.$digest();
			customLoadFunction.should.have.been.called;
		});

		it("should watch custom expression instead of default \"query\"", function() {
			var RESOURCE_OPTIONS = {
				resourceName: "players",
				pageSize: 16,
				watcher: {
					scope: scope,
					expression: "playerId"
				}
			};
			var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
			var stub = sinon.stub(PlayerResource, "load").returnsPromise().resolves({});
			vm.playerId = "123";
			$rootScope.$digest();
			stub.should.have.been.called;
			stub.restore();
		});

		it("should call standard load function if no custom function is passed", function() {
			var RESOURCE_OPTIONS = {
				resourceName: "players",
				pageSize: 4,
				watcher: {
					scope: scope
				}
			};
			var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
			scope.query = {};
			var stub = sinon.stub(PlayerResource, "load").returnsPromise().resolves({});
			$rootScope.$digest();
			stub.should.have.been.called;
			stub.restore();
		});

		it("should call loadOne function if loadOne is true in resource options", function() {
			var RESOURCE_OPTIONS = {
				resourceName: "players",
				pageSize: 4,
				watcher: {
					scope: scope,
					loadOne: true
				}
			};
			var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, vm, RESOURCE_OPTIONS);
			vm.query = {};
			var stub = sinon.stub(PlayerResource, "loadOne").returnsPromise().resolves({});
			$rootScope.$digest();
			stub.should.have.been.called;
			stub.restore();
		});
	});

	it("every instance has isolated properties", function() {
		var PLAYERS_RESOURCE_OPTIONS = {
			pageSize: 3,
			resourceName: "players"
		};
		var PLACES_RESOURCE_OPTIONS = {
			pageSize: 4,
			resourceName: "places"
		};

		var PlayerResource = CRUDResourceFactory.createInstance(PlayerService, {}, PLAYERS_RESOURCE_OPTIONS);
		var PlaceResource = CRUDResourceFactory.createInstance(PlaceService, {}, PLACES_RESOURCE_OPTIONS);

		PlayerResource.options.resourceName.should.not.eql(PlaceResource.options.resourceName);
		PlayerResource.options.pageSize.should.not.eql(PlaceResource.options.pageSize);
	});

	it("throws error if missing parameters", function() {
		CRUDResourceFactory.createInstance.should.throw(Error);
	});
});
