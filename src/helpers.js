var globals = global.using;

module.exports.originalValueFor = function(obj, prop){
	if(!obj.hasOwnProperty(prop)) return globals.PROP_NOT_EXISTENT;
	return obj[prop];
}

module.exports.restoreOrigValue = function(obj, prop, origValue){
	if(origValue === globals.PROP_NOT_EXISTENT) {
		delete obj[prop];
	} else {
		 obj[prop] = origValue;
	}
}

module.exports.argsMatcher = function(args, matchers){
	//args can only be different length in the special case of EVERYTHING_MATCHER
	if(matchers[matchers.length-1]!== globals.EVERYTHING_MATCHER ? args.length!==matchers.length : args.length<matchers.length-1){
		return false;
	}

	//size matches - now let's test each of the matchers
	var i;
	for(i=0; i<args.length; i++){

		//in case an everything is reached - accept match
		if(globals.EVERYTHING_MATCHER===matchers[i]) break;

		//compare/test
		if( typeof matchers[i] !== 'function' ? args[i]!==matchers[i] : !matchers[i](args[i]) ){
			return false;
		}
	}

	//all passed - we have a match
	return true;
}

module.exports.expectParams = function(indentifier, c, m,s, allowIdentifierOnly){

	var ret = {};

	//expect(pattern, [stub])
	if(c===indentifier){
		ret.countsMatcher = globals.MATCH_ALL_COUNTS;

		//expect(pattern, stub)
		if(typeof m === 'function'){
			ret.stub = m;
		} else if(typeof m !== 'undefined'){
			if(!allowIdentifierOnly) throw new Error("using-stubs: .expect() called with unexpected set of arguments")
		}

	//expect(countMatcher, pattern, stub)
	} else if(m===indentifier){
		ret.countsMatcher = c;
		if(typeof s === 'function'){
			ret.stub = s;
		} else if(typeof s !== 'undefined'){
			throw new Error("using-stubs: .expect() called with unexpected set of arguments")
		}

	//expect(countMatcher, [stub])
	} else if(typeof s === 'undefined') {

		ret.countsMatcher = c;
		ret.noPattern = true;

		//expect(countMatcher, stub)
		if(typeof m === 'function'){
			ret.stub = m;
		} else if(typeof m !== 'undefined'){
			throw new Error("using-stubs: .expect() called with unexpected set of arguments")
		}

	//error
	} else {
		throw new Error("using-stubs: .expect() called with unexpected set of arguments")
	}

	return ret;
}


module.exports.describeItem = function(item, acceptUndefined){
	var desc = '';
	if(typeof item !== 'undefined' && item !== globals.MATCH_ALL_COUNTS){
		if(typeof item === 'function'){
  		if(item['using:explanation']){
  			desc = item['using:explanation'];
  		} else {
  			desc = '[function]';
  		}
  	} else if(typeof item === 'object'){
  		if(item['using:explanation']){
  			desc = item['using:explanation'];
  		} else {
  			desc = '[object]';
  		}
  	} else {
  		desc = ''+item;
  	}

  	desc = desc;

	} else if(acceptUndefined){
		desc = 'undefined';
	}

	return desc;
}