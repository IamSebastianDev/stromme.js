/** @format */

/**
 *
 * 	Strømme v.0.5.0
 * 	Templating engine for Røut.js
 *
 *  features planned & not yet implemented:
 *  elseIf conditionals
 *  nested loops
 *  indices in array loops
 *  combinators for conditionals
 *
 *  @license MIT
 */

export default class Strømme {
	/**
	 * @constructor - initializes the template object with data passed into. Data is an optional parameter and will default to an empty object
	 *
	 * @param { Object } data
	 */

	constructor(data = {}) {
		// set data

		this._data = data;

		// initialize a new DOMParser API instance for later use
		this._DOMParser = new DOMParser();
	}

	template(templateString) {}

	create(query, data) {}

	_render(parsedTemplate) {}

	_compile(parsedTemplate) {}

	_handleExpressions(prop, source, action, data) {}

	_handleConditionals(condition, action, negation, alternative, data) {}

	_parseAndCheck(condition, context) {}

	_findRef(string, obj) {}
}
