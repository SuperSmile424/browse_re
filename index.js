'use strict';

var fs = require('fs'),
  doctrine = require('doctrine'),
  esprima = require('esprima'),
  through = require('through'),
  types = require('ast-types'),
  mdeps = require('module-deps'),
  path = require('path');

// Skip external modules. Based on http://git.io/pzPO.
var externalModuleRegexp = process.platform === 'win32' ?
  /^(\.|\w:)/ :
  /^[\/.]/;

/**
 * Detect whether a comment is a JSDoc comment: it must be a block
 * comment which starts with two asterisks, not any other number of asterisks.
 *
 * The code parser automatically strips out the first asterisk that's
 * required for the comment to be a comment at all, so we count the remaining
 * comments.
 * @param {Object} comment
 * @return {boolean} whether it is valid
 */
function isJSDocComment(comment) {
  var asterisks = comment.value.match(/^(\*+)/);
  return comment.type === 'Block' && asterisks && asterisks[ 1 ].length === 1;
}

/**
 * Comment-out a shebang line that may sit at the top of a file,
 * making it executable on linux-like systems.
 * @param {String} code
 * @return {String} code
 */
function commentShebang(code) {
  return (code[ 0 ] === '#' && code[ 1 ] === '!') ? '//' + code : code;
}

/**
 * Add a new tag as a default value if the tag isn't explicitly set by
 * a JSDoc comment.
 * @param {Object} parseComment
 * @param {Object} newTag
 * @return {Object} parsedComment
 */
function addTagDefault(parsedComment, newTag) {
  var hasTagAlready = parsedComment.tags.some(function (tag) {
    return tag.title === newTag.title;
  });
  if (!hasTagAlready) {
    parsedComment.tags.push(newTag);
  }
  return parsedComment;
}

/**
 * Generate JavaScript documentation as a list of parsed JSDoc
 * comments, given a root file as a path.
 *
 * @param {String} index the file to start from
 * @return {Object} stream of output
 */
module.exports = function (index) {
  var md = mdeps({
    filter: function (id) {
      return externalModuleRegexp.test(id);
    }
  });

  md.end({ file: path.resolve(index) });

  /**
   * Documentation stream parser: this receives a module-dep item,
   * reads the file, parses the JavaScript, parses the JSDoc, and
   * emits parsed comments.
   * @param {Object} data
   */
  function docParserStream(data) {

    var code = commentShebang(fs.readFileSync(data.file, 'utf8')),
      ast = esprima.parse(code, { attachComment: true }),
      docs = [];

    function makeVisitor(callback) {
      return function (path) {
        var node = path.value;

        function parseComment(comment) {
          comment = doctrine.parse(comment.value, { unwrap: true });
          callback(comment, node);
          docs.push(comment);
        }

        (node.leadingComments || [])
          .filter(isJSDocComment)
          .forEach(parseComment);

        this.traverse(path);
      };
    }

    /**
     * Infer the function's name from the context, if possible.
     * If `inferredName` is present and `comment` does not already
     * have a `name` tag, `inferredName` is tagged as the name.
     * @param {Object} comment
     * @param {string} inferredName
     */
    function inferName(comment, inferredName) {
      if (inferredName) {
        addTagDefault(comment, {
          title: 'name',
          name: inferredName
        });
      }
    }

    types.visit(ast, {
      visitMemberExpression: makeVisitor(function (comment, node) {
        inferName(comment, node.property.name);
      }),

      visitIdentifier: makeVisitor(function (comment, node) {
        inferName(comment, node.name);
      })
    });

    docs.forEach(this.push);
  }

  return md.pipe(through(docParserStream));
};
