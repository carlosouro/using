//START TESTS
var assert = require('assert');
var usingFactory, using;

//blanket to test nature.js file coverage
if(process.env.YOURPACKAGE_COVERAGE) require('blanket')({"data-cover-only":'src', "data-cover-never":'node_modules'});

describe('using-stubs', function(){

	it('should not have syntax errors', function(){
		usingFactory = require('../src/index.js')
	});
	it('should initialise an instance', function(){
		using = usingFactory();
	});

	describe('basic functionality', function(){

		var obj = {};

		it('should fail if an expectation is not met', function(){

			using(obj)('test').expect(2, obj.test());

			obj.test();

			assert.throws(function(){using.verify();}, Error, 'it should fail');
		});

		it('should using(obj)(prop).restore() original value', function(){
			//add another to the mix to make sure it is not removed
			using(obj)('test5').expect(1, obj.test5());

			//restore test and run checks
			using(obj)('test').restore();
			assert(typeof obj.test === 'undefined', 'obj.test should have restored to undefined');
			assert(typeof obj.test5 !== 'undefined', 'obj.test5 should not have been restored');

			//verify we can still work with test5
			obj.test5();
			using.verify();

			//restore test5 - verify object resets
			using(obj)('test5').restore();
			assert(Object.keys(obj).length===0, 'reset object size');
		});

		it('should validate an expectation', function(){

			using(obj)('test2').expect(1, obj.test2());

			obj.test2();

			using.verify();
		});

		it('should allow stubbing', function(){
			var passed = false;

			using(obj)('test2').expect(obj.test2("hi!"), function(){
				passed = true;
			});

			obj.test2("hi!");

			assert(passed, 'stubbing works');
		});

		it('should fail verify when it is executed too many times', function(){
			obj.test2();

			assert.throws(function(){using.verify();}, Error, 'it should fail');
		});

		it('should verify ok after using(obj).restore()', function(){
			using(obj).restore();
			assert(Object.keys(obj).length===0, 'reset object size');
			using.verify();
		});

		it('should verify while stubbing', function(){
			var passed = false;

			using(obj)('test').expect(1, obj.test(), function(){
				passed = true;
			});

			obj.test();

			using.verify();

			assert(passed, 'stubbing works');
		});

		it('should using.restore() correctly', function(){
			using.restore();

			assert(Object.keys(obj).length===0, 'reset object size');
			using.verify();
		})

		var tempRef = {};
		it('should verify multiple expectations/executions', function(){
			var passedEmpty = false, passedHello = false, passedHi = false, passedNumber = false;

			obj.test = tempRef;

			using(obj)('test').expect(1, obj.test(), function(){
				passedEmpty = true;
			});
			using(obj)('test').expect(using.atLeast(2), obj.test("hello!"), function(){
				passedHello = true;
			});
			using(obj)('test').expect(using.atMost(1), obj.test("hi"), function(){
				passedHi = true;
			});
			using(obj)('test').expect(3, obj.test(using.typeOf('number')), function(){
				passedNumber = true;
			});
			using(obj)('test').expect(0, obj.test(using.aCallback));

			obj.test("hello!");
			obj.test(1);
			obj.test("hi");
			obj.test(2);
			obj.test();
			obj.test(3);
			obj.test("hello!");

			using.verify();

			assert(passedEmpty && passedHello && passedHi && passedNumber, 'stubs did not execute')
		});

		it('should fail on too many multiple expectations/executions', function(){

			//only set to be expected 1
			obj.test();

			assert.throws(function(){using.verify();}, Error, 'it should fail');
		});

		it('should restore previous references correctly', function(){
			using.restore();

			assert(obj.test === tempRef, 'it should fail');
		});

		it('should .fail()', function(){
			using(obj)('test').fail();

			obj.test();

			assert.throws(function(){using.verify();}, Error, 'it should fail');

			using.restore();
		});

		it('should match context call (.apply())', function(){
			var passed = false;

			using(obj)('test').expect(
				1,
				obj.test.apply(using.anObjectLike({foo:'bar'}), [using.aBoolean]),
				function(val){
					passed = val;
				}
			);

			obj.test.apply({foo:'bar'}, [true]); //matches
			obj.test(false); //does not match

			using.verify();

			assert(passed, 'it should have executed stub');

			using.restore();
		});

		it('should validate the case given on documentation', function(){
			var foo = {
				bar: function(someone){
					return someone+" goes into a bar";
				}
			}

			using(foo)('bar').expect(
				foo.bar(using.aString),	//call match clause
				function(someone){	//stub
					return someone+" stayed at home";
				}
			);

			using(foo)('bar').expect(1, foo.bar("John"));

			var someScope = {};

			using(foo)('bar').expect(
				1, //countMatcher
				foo.bar.apply(someScope, ["Anna"]),	//call match clause w/ context
				function(){	//stub
					return "Anna was the only one going to the bar";
				}
			);

			//Running the test
			assert(foo.bar("John")==='John stayed at home', 'John failed'); //John goes into a bar
			assert(foo.bar.call(someScope, "Anna")==='Anna was the only one going to the bar', 'Anna failed') //Anna also went to the bar
			assert(foo.bar("Peter")==='Peter stayed at home', 'Peter failed') //Peter stayed at home

			using.verify();

			using.restore();
		})

		//it('should reset counters on using(foo)(bar).reset()');

		//it('should reset counters on using(foo).reset()');

		//it('should reset counters on using.reset()');

	})



	describe('internal checks', function(){
		it('should verify params on .expect()', function(){
			assert.throws(function(){
				using(obj)('test3').expect(1, obj.test3(), "test");
			}, Error);
			assert.throws(function(){
				using(obj)('test3').expect(obj.test3(), 1, function(){});
			}, Error);
			assert.throws(function(){
				using(obj)('test3').expect(1, function(){}, obj.test3());
			}, Error);
			assert.throws(function(){
				using(obj)('test3').expect(function(){}, obj.test3(), 1);
			}, Error);
		});
	})

	describe('require', function(){

		it('should return a reference function on .require()', function(){
			var obj = using.require('./requires/include.js');
			assert(typeof obj === 'function', 'is a function');
			assert(Object.keys(obj).length===0, 'it is empty');
		})

		it('should allow us to set expectations', function(){
			var obj = using.require('./requires/include.js');

			using(obj)('test').expect(1, obj.test());
			using(obj)('testTrue').expect(1, obj.testTrue("hello"));
			using(obj)('testFalse').expect(1, obj.testFalse(), function(){
				return true;
			});
			//require external test
			require('./requires/test-include-overriden.js');
		});

		it('should verify set expectations', function(){
			//verify
			using.verify();
		})

		it('should using.require.restore(module)', function(){
			using.require.restore('./requires/include.js');
			//require external test
			require('./requires/folder/test-include-default.js');
			//verify
			using.verify();
		});

		it('should allow stubbing', function(){
			//some expectation before
			var obj = using.require('./requires/include.js');
			using(obj)('test').expect(1, obj.test());
			//a stub
			using.require.stub('./requires/include.js', {
				testTrue:function(){return false},
				testFalse:function(){return true}
			});
			//some more expectations after
			obj = using.require('./requires/include.js');
			using(obj)('testTrue').expect(1, obj.testTrue(using.everything), function(){
				return true;
			});
			using(obj)('testFalse').expect(1, obj.testFalse());

			//require external test
			require('./requires/test-include-overriden2.js');
			//verify
			using.verify();
		});

		it('should restore also stubs using.restore()', function(){
			using.restore();
			//require external test
			require('./requires/folder/test-include-default2.js');
			//verify
			using.verify();
		});

	});

	describe('classes and instances', function(){
		it('should override class instance', function(){

			var Cat = using.require('./requires/folder/Cat.js');

			//override Class
			var StubClass = function(){
				this.name = "Snowball";
			}
			StubClass.prototype.hello = function(){
				return this.name +' says hi';
			}
			var snuffles = using(Cat).instance(1, new Cat("Snuffles"), StubClass);

			//stub snuffles.pet("Snuffles")
			using(snuffles)('pet').expect(1, snuffles.pet("Snuffles"), function(){
				return 'Cat screams: "call me '+this.name+' - I like it better"';
			});
			//verify snuffles.pet()
			using(snuffles)('pet').expect(1, snuffles.pet());


			var furrball = using(Cat).instance(new Cat("Furrball"));
			//stub furrball.pet("hard")
			using(furrball)('pet').expect(
				1,
				furrball.pet("hard"),
				function(){
					return "Furrball runs away";
				}
			);


			//run our tests
			require('./requires/test-class-overriden');

			//verify all
			using.verify();
		});

		it('should restore any later use of class, even if already loaded', function(){
			//before restore, load the Cat class
			var runner = require('./requires/test-class-default-preloaded.js');

			//restore class
			using.restore();

			//run default test on preloaded Cat class
			runner();

			//verify (nothing)
			using.verify();
		});

		it('any further require of class works as default', function(){
			//before restore, load the Cat class
			require('./requires/test-class-default.js');
		})
	})

	describe('matchers', function(){
		//TO-DO
	})

});