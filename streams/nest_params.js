'use strict';

var through = require('through'),
  extend = require('extend');

/**
 * Create a transform stream that nests [parameters with properties](http://usejsdoc.org/tags-param.html#parameters-with-properties).
 *
 * A parameter `employee.name` will be attached to the parent parameter `employee` in
 * a `properties` array.
 *
 * This stream assumes that incoming comments have been flattened.
 *
 * @name nestParams
 * @return {stream.Transform}
 */
module.exports = function () {
  return through(function (comment) {
    if (!comment.params) {
      this.push(comment);
      return;
    }

    var result = extend({}, comment),
      index = {};

    result.params = [];
    comment.params.forEach(function (param) {
      index[param.name] = param;
      var parts = param.name.split(/(\[\])?\./);
      if (parts.length > 1) {
        var parent = index[parts[0]];
        parent.properties = parent.properties || [];
        parent.properties.push(param);
      } else {
        result.params.push(param);
      }
    });

    this.push(result);
  });
};
