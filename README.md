#using-stubs
![using-stubs NPM package information](https://nodei.co/npm/using-stubs.png "using-stubs NPM package information")

![using-stubs travis-CI build](https://travis-ci.org/carlosouro/using-stubs.svg "using-stubs travis-CI build") ![using-stubs test coverage](https://coveralls.io/repos/github/carlosouro/using-stubs/badge.svg?branch=master "using-stubs test coverage")

Stubbing and verification for node.js tests.
Enables you to validate and override behaviour of nested pieces of code such as methods, require() and npm modules or even instances of classes.

This library is inspired on [node-gently](https://github.com/alex-seville/blanket), [MockJS](https://github.com/badoo/MockJS) and [mock-require](https://github.com/boblauer/mock-require).

---
## <a name="gettingStarted"></a>Getting started

```JavaScript
var using = require('using-stubs')(); //an instance of using
```


## <a name="methods"></a>Matching, following and stubbing in-depth code

_using(object, 'method').like( foo.method("example") );_

_using(object, 'method').stub( function(originalFn, args, context){ /\*...\*/ } );_

_using(object, 'method').follow( function(resultingObject){ /\*...\*/ } );_


**Consider the object:**
```JavaScript
//class Baz
function ClassExample(){
  this.test = function(){
    return "";
  }
}

//object foo
var foo = {
  bar: function(){
    return {
      Baz: ClassExample
    }
  },
  getBaz: function(){
    return ClassExample
  }
}
```

**Basics: Dive deep into Baz class, intercept and modify returned instance:**
```JavaScript
//setup using()
using(foo, 'bar').follow(function(obj){

  return using(obj, 'Baz'); //chaining with .follow()

}).follow(function(bazInstance){

  // modify bazInstance however you'd like
  using(bazInstance, 'test').stub(function(){
    return "OK!";
  })

});

//actual test case
var obj = foo.bar();

var instance = new obj.Baz();

console.log(instance.test()); //prints "OK!"
```

**Class constructor: Actually replace bazInstance with your mock entirely when adquired via _foo.bar("test-match").getBaz()_ and constructed via _new Baz(callback)_:**
```JavaScript
//setup using()
using(foo, 'bar').like( foo.bar("test-match") ).follow(function(obj){

  return using(obj, 'getBaz');

}).follow(function(Baz){

  //Notice that because we intercept Baz itself in .follow() we can modify its entire behaviour.

  //This wouldn't be possible if Baz reference hadn't been piped through using.follow(),
  //in that case we would only be able to intercept methods of Baz, but not its instances

  using(Baz).like( new Baz(using.aCallback) ).stub(function(originalFn, args, context){
    var callback = args[0];
    callback("YEAH!");
  });

});

//actual test case
var obj = foo.bar("test-match"); //anything else won't apply
var Baz = new obj.getBaz();

new Baz(function(str){
  console.log(str);
}) //prints "YEAH!"

```

## <a name="require"></a>Node.js require()

**Intercepting require() in Node.js:**

Consider the example object at the top of this documentation is encapsulated in node module _example.js_
```JavaScript
//example.js

// foo code
// ...


module.exports = foo;
```

Let's intercept and modify it
```JavaScript
//
using.require('./example').first().follow(function(foo){

  using(foo, 'bar')
  .follow(function(){

    console.log("HI!")

  });

})

//running the test
var foo = require('./example')

foo.bar(); //prints "HI!"

```
**Notes:**
* The _using.require()_ interface only has a forceful _.first()_ API available (not a direct _.follow()_) - this happens because a _require()_ in node **always returns the same instance** and thus _.first()_ avoids triggering a _.follow()_ every time a _require()_ is called per file and avoids overriding behaviour on that instance over and over
* _using_ will automatically pin the rule (eg. _using.require(path)_) to the target file given by the relative path to the current module path, meaning it will override the target module even if you require it from a different module later located on any other relative path (subfolders, etc)
* _using.require(module)_ also works for any module (eg. 'http' - not necessarily a path) and the match in this case is pinned down to all calls to the given module string exactly (independent of module location or dependecy resolution)

### <a name="clean"></a>Cleaning rules

**Examples on removing all or part of set rules :**
```JavaScript
//clean all rules for a given method
using(obj, 'prop').clean();

//clean all rules for classes / functions
using(obj).clean();

//clean all rules for module
using.require('module').clean();

//clean everything - all rules for all objects and methods, modules, classes, etc
using.clean();

//Note: .clean() only cleans rules that have been set via the given using instance (see first item on documentation)
```

## <a name="matchers"></a>matchers

**parameter matchers**

The simplest way to exactly match a parameter is by specifying it directly.
```JavaScript
using(foo, 'bar').like( foo.bar(5) );

//
foo.bar(5); //matches
foo.bar("5"); //does not match
```

Or, you can use any callback as a matcher (returning true matches)
```JavaScript
function divisibleBy3(param){
  return typeof(param)==='number' && (param % 3) === 0;
}

using(foo, 'bar').like( foo.bar(divisibleBy3) );

//
foo.bar(6); //matches
foo.bar(7); //does not match
```


**Context matchers**

Parameter matching even works on context
```JavaScript
using(foo, 'bar').like( foo.bar.call(using.anObjectLike({'a':'a'}), 5) );

//
foo.bar.apply({'a':'a'}, [5]); //matches
foo.bar(5); //does not match
```

using-stubs provides you a few common matchers for ease of use
```JavaScript
using.aString            //matches any string
using.aStringLike(regex) //matches the regular expression
using.anInt              //matches any integer
using.aNumber            //matches any number
using.anObject           //matches any object (not null)
using.aFunction          //matches any function
using.typeOf(type)       //tests typeOf(parameter)===type
using.instanceOf(Class)  //tests parameter instanceOf Class
using.something          //matches parameter!==undefined
using.anything           //matches any param as long as it is set in the argument list (even undefined)

using.atLeast(x)     //a number > x
using.atMost(x)      //a number < x
using.between(x, y)  //a number > x && < y
using.oneOf(a1, [[a2], ...[aN]])     //matches one of the given parameters
using.otherThan(a1, [[a2], ...[aN]]) //matches if none of the given parameters match

using.anObjectLike(obj, [boolean strict])  //deep compare to given object
                         //strict - defaults to non-strict (==) comparison (false)

using.everything         //special matcher - all arguments from this point onward
                         //will be matched, even if not set in the argument list.
                         //Eg. foo("a", using.everything) will match foo("a"), foo("a", "one")
                         //or even foo("a", 1, 2, 3, 4, 5, 6);
```

---
---

## <a name="full"></a>Putting it all together

**An example using the most relevant API methods all at once:**

```JavaScript

var scope = {};

//using most API methods in one chain
using.require('./example').first().follow(function(foo){

  using(foo, 'bar')
  .like( foo.bar.call(scope, using.aString) ) //only when called like this
  .stub(function(fn, args, context){

    //eg. replace a calling argument but still return the original function result
    return fn.call(context, "my-override-string")

  })
  .the(2) //stalker-pattern API: only follow the 2nd match
  .follow(function(obj){

    console.log("the(2) foo.bar()");
    return using(obj, 'Baz'); //chaining with .follow()

  })
  .first() //stalker-pattern API: only follow the first instance of obj.Baz
  .follow(function(bazInstance){

    console.log("first() instance of obj.Baz");
    return using(bazInstance, 'test'); //chaining with .follow()
  })
  .from(2).to(5) //stalker-pattern API: only follow 2nd to 5th call to bazInstance.test()
  .follow(function(res){
    console.log("+1");
  })

})

//running the test
foo.bar("-"); //does nothing (does not match on context)

var a = foo.bar.call(scope, "a"); //does nothing (1st match)
var b = foo.bar.call(scope, "b"); //prints "the(2) foo.bar()"

var instance = new b.Baz(); //prints "first() instance of obj.Baz"

instance.test(); //does nothing

instance.test(); //prints "+1"
instance.test(); //prints "+1"
instance.test(); //prints "+1"
instance.test(); //prints "+1"

instance.test(); //does nothing

```

**Note:**
The interfaces .first(), .the(), .from(), .to(), and .follow() are inherited from the stalker-pattern API
Take a look at [stalker-pattern reference](https://github.com/carlosouro/stalker-pattern) in order to further understand the pattern and its chaining API
