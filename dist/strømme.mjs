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
	 *
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

	/**
	 *
	 * @public Method to create and give options on how to further process the template string
	 *
	 * @param { String } stringLiteral - the template String you want to create as a template
	 * @returns { Object } - returns an object with two methods
	 *  - compileToMixin invokes a compile Method that returns a pure HTML String useable as mixin.
	 *  - create invokes a parsing Method that parses the templateString with query and data as parameters.
	 */

	template(stringLiteral) {
		// if not existent, add the template tags to the string
		let templateString =
			stringLiteral.search(/(<template>)?|(<\/template>)?/gim) != -1
				? `<template> ${stringLiteral} </template>`
				: stringLiteral;

		// return the templateString
		return {
			compileToMixin: this._compile.bind(this, templateString),
			create: this._create.bind(this, templateString),
		};
	}

	/**
	 *
	 * @private Method to create the template out of the template String and all data to be filled in.
	 *
	 * @param templateString - the template String created by the "template" Method
	 * @param query - query data passed
	 * @param data - optional data passed into this create to override data set in the constructor
	 *
	 * @returns { String } - returns the parsed String for further processing
	 */

	_create(templateString, query, data = {}, options) {
		// compile data - merge the passed data and data passed to the constructor into an object

		let compData = Object.assign(data, this._data);

		// merge the query parameters into this compData object

		compData.query = Object.fromEntries(query.entries()) || null;

		// reassign the string

		let parse = templateString;

		// strip comments from the template string

		parse = parse.replace(/\/\*[\S\s]+?\*\//gim, '');

		// parse in mixins
		const REGMIX = /{\s?#mixin (?<mixinName>[^}]+?)\s?}/gim;

		parse = parse.replace(REGMIX, (r, mixin) =>
			r.replace(r, compData.mixins[mixin].compileToMixin)
		);

		// replace variables with data

		const REGVAR = /{\s?(?<variable>[^-#}/\s ]+)\s?}/gim;

		parse = parse.replace(REGVAR, (r, varName) =>
			varName.replace(varName, this._findRef(varName, compData))
		);

		// parse the conditionals

		const REGIFELSE = /{\s?#if (?<condition>[^}]*?)\s?}(?<action>[\s\S]+?){\/\s?if\s?}|(?<negCon>{\s?#else\s?})(?<negAction>[^{]*)?({\s?\/if\s?})?/gim;

		parse = parse.replace(
			REGIFELSE,
			(r, condition, action, negCon, negAct) =>
				this._handleIfElse(condition, action, negCon, negAct, compData)
		);

		// parse the forEach expressions

		const REGFOREACH = /{\s?#forEach (?<prop>\S*) in (?<array>\S*)\s?}(?<action>[\S\s]*?){\s?\/forEach\s?}/gim;

		parse = parse.replace(REGFOREACH, (r, prop, array, action) =>
			action.replace(
				action,
				this._handleExpression(prop, array, action, compData)
			)
		);

		// parse the forOf expressions

		const REGFOROF = /{\s?#forOf (?<prop>\S*) in (?<object>\S*)\s?}(?<action>[\S\s]*?){\s?\/forOf\s?}/gim;

		parse = parse.replace(REGFOROF, (r, prop, object, action) =>
			action.replace(
				action,
				this._handleExpression(prop, object, action, compData)
			)
		);

		// if enabled, strip white space

		parse = options.stripWhitespace ? parse.replace(/\s/gim, '') : parse;

		// return the parsed string

		return parse;
	}

	/**
	 *
	 * @private Method to convert the template string into a DOM Fragment
	 *
	 * @param { String } parsedTemplate - The parsed template string
	 *
	 * @returns { DocumentFragment } - returns a fragment which contents can be appended to the DOM
	 */

	render(parsedTemplate) {
		return this._parser
			.parseFromString(parsedTemplate, 'text/html')
			.querySelector('template');
	}

	/**
	 *
	 * @private Method to convert a created string to pure HTML for appending a mixin
	 *
	 * @param { String } templateString - the templateString of the template Method
	 */

	_compile(templateString) {
		// return the template string without the template tags

		return templateString.replace(/<template>|<\/template>/gim, '');
	}

	/**
	 * @private Method to handle the forEach and forOf loops
	 *
	 * @param { String } prop - the name of the property used to match values
	 * @param { String } source - the name of the dataSource
	 * @param { String } action - the String that should be filled with the data and replicated
	 * @param { Object } data - data passed into the function
	 */

	_handleExpression(prop, source, action, data) {
		// get the array used as datasource

		source = this._findRef(source, data);

		// create the datasource

		let dataSource =
			typeof source == 'array' ? source : Object.values(source);

		// create the dynamic regexp
		const REGProp = new RegExp(
			`{-\\s?(?<var>${prop}[.]?[\\S]*)\\s?-}`,
			'gmi'
		);

		// return the dataSource processed
		return dataSource
			.map((elem, i) =>
				// extract the variable capture group
				action.replace(REGProp, (r, group) =>
					//replace the group with the data out of the reference
					group.replace(group, (r) =>
						r.includes('.')
							? this._findRef(r.split(/\./i)[1], elem)
							: elem
					)
				)
			)
			.join('');
	}

	/**
	 *	@private Method that handles if else constructs
	 *
	 * @param { String } condition - the condition capture group
	 * @param { String } action - the action capture group
	 * @param { String } negCon - the negative Condition capute group
	 * @param { String } negAct - the negative action capture group
	 * @param { Object } data - data passed into the function
	 */

	_handleIfElse(condition, action, negation, alternative, data) {
		// check the condition against the data
		return this._parseAndCheck(condition, data) ? action : alternative;
	}

	/**
	 * Helper function for parsing conditionals and testing for truth
	 *
	 * @param conditionString - the string that is being tested
	 * @param context - the context the values should be tested against
	 */

	_parseAndCheck(conditionString, context) {
		// split all conditions into an array of sub conditions

		const CHECKREG = /(?<negation>!)?(?<condition>[^!= ]+)\s?((?<operator>[!=]{2})\s?(?<eval>\S*))?/gim;

		// match the string and extract the named capture groups
		let group = [...conditionString.matchAll(CHECKREG)][0].groups;

		let test = { object: context[group.condition], value: group.eval };

		if (
			test.value == undefined &&
			group.operator == undefined &&
			group.negation != '!'
		) {
			test.for = true;
		} else if (
			test.value == undefined &&
			group.operator == undefined &&
			group.negation == '!'
		) {
			test.for = false;
		} else if (test.value != undefined && group.operator != undefined) {
			if (
				(group.negation == '!' && group.operator == '==') ||
				(group.negation != '!' && group.operator == '!=')
			) {
				test.for = false;
			} else if (
				(group.negation != '!' && group.operator == '==') ||
				(group.negation == '!' && group.operator == '!=')
			) {
				test.for = true;
			}
		}

		// helper function to check for Case

		const checkFor = (testCase) => {
			if (testCase.object && testCase.value == undefined) {
				return testCase.for ? true : false;
			} else if (testCase.object == testCase.value) {
				return testCase.for ? true : false;
			} else if (testCase.object != testCase.value) {
				return !testCase.for ? true : false;
			}
		};

		return checkFor(test);
	}

	/**
	 * Helper function for converting a String in dotnotation into an object reference
	 *
	 * @param { String } string - String in dotnotation
	 * @param { Object } obj - object to search using the dotnoation string
	 */

	_findRef(string, obj) {
		return string.includes('.')
			? string.split('.').reduce((o, i) => o[i], obj)
			: obj[string];
	}
}
